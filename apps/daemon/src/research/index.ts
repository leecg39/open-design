import type {
  ResearchDepth,
  ResearchFindings,
  ResearchSource,
  ResearchTimeRange,
  ResearchTopic,
} from '@open-design/contracts/api/research';
import {
  RESEARCH_DEFAULT_MAX_SOURCES,
  RESEARCH_SUPPORTED_COUNTRY_SET,
} from '@open-design/contracts/api/research';
import { resolveProviderConfig } from '../media-config.js';
import { tavilySearch, TavilyError } from './tavily.js';

const TAVILY_MAX_RESULTS_LIMIT = 20;
const RESEARCH_QUERY_LIMIT = 1000;
const RESEARCH_INCLUDE_DOMAIN_FILTER_LIMIT = 300;
const RESEARCH_EXCLUDE_DOMAIN_FILTER_LIMIT = 150;
const RESEARCH_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const RESEARCH_DOMAIN_RE =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;
const RESEARCH_COUNTRY_RE = /^[a-z]+(?: [a-z]+)*$/;
const RESEARCH_COUNTRY_ALIASES: Record<string, string> = {
  korea: 'south korea',
  kr: 'south korea',
  'south-korea': 'south korea',
  'south_korea': 'south korea',
  us: 'united states',
  usa: 'united states',
  'u.s.': 'united states',
  'u.s.a.': 'united states',
  uk: 'united kingdom',
  'u.k.': 'united kingdom',
};
const RESEARCH_TIME_RANGE_ALIASES: Record<string, ResearchTimeRange> = {
  d: 'day',
  day: 'day',
  m: 'month',
  month: 'month',
  w: 'week',
  week: 'week',
  y: 'year',
  year: 'year',
};
const SUPPORTED_RESEARCH_PROVIDERS = new Set(['tavily']);

export class ResearchError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
    public readonly code = 'RESEARCH_FAILED',
  ) {
    super(message);
    this.name = 'ResearchError';
  }
}

export interface SearchResearchInput {
  query: unknown;
  projectRoot: string;
  depth?: unknown;
  topic?: unknown;
  country?: unknown;
  timeRange?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  includeDomains?: unknown;
  excludeDomains?: unknown;
  exactMatch?: unknown;
  minScore?: unknown;
  includeImages?: unknown;
  includeRawContent?: unknown;
  autoParameters?: unknown;
  maxSources?: unknown;
  providers?: unknown;
  signal?: AbortSignal;
}

export async function searchResearch(
  input: SearchResearchInput,
): Promise<ResearchFindings> {
  const rawQuery = typeof input.query === 'string' ? input.query.trim() : '';
  const query = rawQuery.slice(0, RESEARCH_QUERY_LIMIT);
  if (!query) {
    throw new ResearchError('query required', 400, 'QUERY_REQUIRED');
  }
  const warnings: string[] = [];
  if (rawQuery.length > RESEARCH_QUERY_LIMIT) {
    warnings.push(`Truncated query to ${RESEARCH_QUERY_LIMIT} characters.`);
  }
  const depth = normalizeResearchDepth(input.depth);
  if (
    hasInvalidStringControl(input.depth) ||
    (hasNonEmptyString(input.depth) &&
      input.depth !== 'shallow' &&
      input.depth !== 'medium' &&
      input.depth !== 'deep')
  ) {
    warnings.push('Ignored invalid depth; expected shallow, medium, or deep.');
  }
  const topic = normalizeResearchTopic(input.topic);
  if (
    hasInvalidStringControl(input.topic) ||
    (hasNonEmptyString(input.topic) && !topic)
  ) {
    warnings.push('Ignored invalid topic; expected general, news, or finance.');
  }
  const normalizedCountry = normalizeResearchCountry(input.country);
  const country =
    topic === 'news' || topic === 'finance' ? undefined : normalizedCountry;
  if (
    hasInvalidStringControl(input.country) ||
    (hasNonEmptyString(input.country) && !normalizedCountry)
  ) {
    warnings.push('Ignored invalid country boost.');
  } else if (
    hasNonEmptyString(input.country) &&
    normalizedCountry &&
    (topic === 'news' || topic === 'finance')
  ) {
    warnings.push(
      'Ignored country boost because topic news/finance does not support it.',
    );
  }
  let timeRange = normalizeResearchTimeRange(input.timeRange);
  if (
    hasInvalidStringControl(input.timeRange) ||
    (hasNonEmptyString(input.timeRange) && !timeRange)
  ) {
    warnings.push(
      'Ignored invalid timeRange; expected day, week, month, or year.',
    );
  }
  const startDate = normalizeResearchDate(input.startDate);
  const endDate = normalizeResearchDate(input.endDate);
  if (timeRange && (startDate || endDate)) {
    warnings.push(
      'Ignored timeRange because exact date filters were provided.',
    );
    timeRange = undefined;
  }
  if (
    hasInvalidStringControl(input.startDate) ||
    (hasNonEmptyString(input.startDate) && !startDate)
  ) {
    warnings.push('Ignored invalid startDate; expected YYYY-MM-DD.');
  }
  if (
    hasInvalidStringControl(input.endDate) ||
    (hasNonEmptyString(input.endDate) && !endDate)
  ) {
    warnings.push('Ignored invalid endDate; expected YYYY-MM-DD.');
  }
  if (startDate && endDate && startDate > endDate) {
    throw new ResearchError(
      'startDate must be earlier than or equal to endDate',
      400,
      'INVALID_DATE_RANGE',
    );
  }
  const includeDomains = normalizeResearchDomains(
    input.includeDomains,
    RESEARCH_INCLUDE_DOMAIN_FILTER_LIMIT,
  );
  let excludeDomains = normalizeResearchDomains(
    input.excludeDomains,
    RESEARCH_EXCLUDE_DOMAIN_FILTER_LIMIT,
  );
  if (!isResearchDomainInputShape(input.includeDomains)) {
    warnings.push(
      'Ignored invalid includeDomains; expected an array or comma-separated string.',
    );
  } else if (
    countResearchDomainInputs(input.includeDomains) > includeDomains.length
  ) {
    warnings.push(
      'Ignored invalid, duplicate, or excess includeDomains entries.',
    );
  }
  if (!isResearchDomainInputShape(input.excludeDomains)) {
    warnings.push(
      'Ignored invalid excludeDomains; expected an array or comma-separated string.',
    );
  } else if (
    countResearchDomainInputs(input.excludeDomains) > excludeDomains.length
  ) {
    warnings.push(
      'Ignored invalid, duplicate, or excess excludeDomains entries.',
    );
  }
  if (includeDomains.length && excludeDomains.length) {
    const included = new Set(includeDomains);
    const resolvedExcludes = excludeDomains.filter(
      (domain) => !included.has(domain),
    );
    if (resolvedExcludes.length < excludeDomains.length) {
      warnings.push(
        'Removed excludeDomains entries that also appear in includeDomains.',
      );
      excludeDomains = resolvedExcludes;
    }
  }
  const exactMatch = normalizeBooleanControl(input.exactMatch);
  if (isInvalidBooleanControl(input.exactMatch)) {
    warnings.push('Ignored invalid exactMatch; expected a boolean.');
  }
  const minScore = normalizeMinScore(input.minScore);
  if (input.minScore != null && minScore == null) {
    warnings.push('Ignored invalid minScore; expected a number from 0 to 1.');
  } else if (
    typeof input.minScore === 'number' &&
    Number.isFinite(input.minScore) &&
    (input.minScore < 0 || input.minScore > 1)
  ) {
    warnings.push('Clamped minScore to the supported range 0..1.');
  }
  const includeImages = normalizeBooleanControl(input.includeImages);
  if (isInvalidBooleanControl(input.includeImages)) {
    warnings.push('Ignored invalid includeImages; expected a boolean.');
  }
  const includeRawContent = normalizeBooleanControl(input.includeRawContent);
  if (isInvalidBooleanControl(input.includeRawContent)) {
    warnings.push('Ignored invalid includeRawContent; expected a boolean.');
  }
  const autoParameters = normalizeBooleanControl(input.autoParameters);
  if (isInvalidBooleanControl(input.autoParameters)) {
    warnings.push('Ignored invalid autoParameters; expected a boolean.');
  }
  const providers = normalizeResearchProviders(input.providers);
  if (input.providers != null && !Array.isArray(input.providers)) {
    warnings.push('Ignored invalid providers; expected an array of provider ids.');
  } else if (
    Array.isArray(input.providers) &&
    input.providers.length > providers.length
  ) {
    warnings.push('Ignored invalid, duplicate, or empty provider entries.');
  }
  const provider =
    providers.find((candidate) => SUPPORTED_RESEARCH_PROVIDERS.has(candidate)) ??
    providers[0] ??
    'tavily';
  const unsupportedProviders = providers.filter(
    (candidate) => !SUPPORTED_RESEARCH_PROVIDERS.has(candidate),
  );
  if (
    unsupportedProviders.length > 0 &&
    SUPPORTED_RESEARCH_PROVIDERS.has(provider)
  ) {
    warnings.push(
      `Ignored unsupported research providers: ${unsupportedProviders.join(', ')}.`,
    );
  }
  const maxSources = clampMaxSources(
    input.maxSources,
    RESEARCH_DEFAULT_MAX_SOURCES[depth],
  );
  if (
    input.maxSources != null &&
    (typeof input.maxSources !== 'number' ||
      !Number.isFinite(input.maxSources) ||
      input.maxSources <= 0)
  ) {
    warnings.push('Ignored invalid maxSources; expected a positive number.');
  } else if (
    typeof input.maxSources === 'number' &&
    Number.isFinite(input.maxSources) &&
    input.maxSources > TAVILY_MAX_RESULTS_LIMIT
  ) {
    warnings.push(
      `Clamped maxSources to provider limit ${TAVILY_MAX_RESULTS_LIMIT}.`,
    );
  }

  if (provider !== 'tavily') {
    throw new ResearchError(
      `provider "${provider}" not supported in Phase 1`,
      400,
      'UNSUPPORTED_RESEARCH_PROVIDER',
    );
  }

  const cfg = await resolveProviderConfig(input.projectRoot, 'tavily');
  if (!cfg.apiKey) {
    throw new ResearchError(
      'Tavily API key not configured (Settings -> Tavily Search)',
      400,
      'TAVILY_API_KEY_MISSING',
    );
  }

  let answer = '';
  let sources: ResearchSource[] = [];
  let images: ResearchFindings['images'] = [];
  let usage: ResearchFindings['usage'];
  let requestId: string | undefined;
  let responseTime: number | undefined;
  let selectedParameters: ResearchFindings['selectedParameters'];
  let providerSourceCount = 0;
  let filteredSourceCount = 0;
  let discardedSourceCount = 0;
  try {
    const out = await tavilySearch({
      apiKey: cfg.apiKey,
      query,
      ...(autoParameters && depth === 'shallow'
        ? {}
        : { searchDepth: depth === 'shallow' ? 'basic' : 'advanced' }),
      ...(topic ? { topic } : {}),
      ...(country ? { country } : {}),
      ...(timeRange ? { timeRange } : {}),
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {}),
      ...(includeDomains.length ? { includeDomains } : {}),
      ...(excludeDomains.length ? { excludeDomains } : {}),
      ...(exactMatch ? { exactMatch } : {}),
      ...(includeImages ? { includeImages } : {}),
      ...(includeRawContent ? { includeRawContent } : {}),
      ...(autoParameters ? { autoParameters } : {}),
      maxResults: maxSources,
      includeAnswer: depth === 'deep' ? 'advanced' : true,
      ...(depth === 'medium' ? { chunksPerSource: 2 } : {}),
      ...(depth === 'deep' ? { chunksPerSource: 3 } : {}),
      ...(cfg.baseUrl ? { baseUrl: cfg.baseUrl } : {}),
      ...(input.signal ? { signal: input.signal } : {}),
    });
    answer = out.answer;
    providerSourceCount = out.sources.length;
    sources =
      minScore == null
        ? out.sources
        : out.sources.filter((source) => (source.score ?? 0) >= minScore);
    filteredSourceCount =
      minScore == null ? 0 : Math.max(0, out.sources.length - sources.length);
    images = includeImages ? out.images : [];
    usage = out.usage;
    requestId = out.requestId;
    responseTime = out.responseTime;
    selectedParameters = out.selectedParameters;
    discardedSourceCount = out.discardedSourceCount ?? 0;
  } catch (err) {
    const message =
      err instanceof TavilyError
        ? err.message
        : `research failed: ${(err as Error).message || String(err)}`;
    throw new ResearchError(message, 502, 'RESEARCH_PROVIDER_FAILED');
  }

  if (sources.length === 0) {
    if (minScore != null && providerSourceCount > 0) {
      const label = providerSourceCount === 1 ? 'source' : 'sources';
      throw new ResearchError(
        `no sources met minScore ${minScore}; provider returned ${providerSourceCount} ${label}`,
        404,
        'NO_RESEARCH_SOURCES',
      );
    }
    if (discardedSourceCount > 0) {
      const label = discardedSourceCount === 1 ? 'result' : 'results';
      throw new ResearchError(
        `no usable source URLs found; provider returned ${discardedSourceCount} discarded ${label}`,
        404,
        'NO_RESEARCH_SOURCES',
      );
    }
    throw new ResearchError('no sources found', 404, 'NO_RESEARCH_SOURCES');
  }

  return {
    query,
    summary: answer || synthesizeFallbackSummary(sources),
    sources,
    ...(images?.length ? { images } : {}),
    provider,
    depth,
    ...(topic ? { topic } : {}),
    ...(country ? { country } : {}),
    ...(timeRange ? { timeRange } : {}),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
    ...(includeDomains.length ? { includeDomains } : {}),
    ...(excludeDomains.length ? { excludeDomains } : {}),
    ...(exactMatch ? { exactMatch } : {}),
    ...(minScore != null ? { minScore } : {}),
    maxSources,
    ...(filteredSourceCount > 0 ? { filteredSourceCount } : {}),
    ...(discardedSourceCount > 0 ? { discardedSourceCount } : {}),
    ...(includeImages ? { includeImages } : {}),
    ...(includeRawContent ? { includeRawContent } : {}),
    ...(autoParameters ? { autoParameters } : {}),
    ...(selectedParameters ? { selectedParameters } : {}),
    ...(warnings.length ? { warnings } : {}),
    ...(usage ? { usage } : {}),
    ...(requestId ? { requestId } : {}),
    ...(responseTime != null ? { responseTime } : {}),
    fetchedAt: Date.now(),
  };
}

function normalizeResearchDepth(value: unknown): ResearchDepth {
  return value === 'medium' || value === 'deep' ? value : 'shallow';
}

function normalizeResearchTopic(value: unknown): ResearchTopic | undefined {
  return value === 'general' || value === 'news' || value === 'finance'
    ? value
    : undefined;
}

function normalizeResearchCountry(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const key = stripResearchWrappingQuotes(value).toLowerCase();
  const alias = RESEARCH_COUNTRY_ALIASES[key];
  const normalized = (alias ?? key).replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  return RESEARCH_COUNTRY_RE.test(normalized) &&
    RESEARCH_SUPPORTED_COUNTRY_SET.has(normalized)
    ? normalized
    : undefined;
}

function stripResearchWrappingQuotes(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length < 2) return trimmed;
  const first = trimmed[0];
  const last = trimmed[trimmed.length - 1];
  if ((first === '"' || first === "'") && last === first) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function normalizeResearchTimeRange(
  value: unknown,
): ResearchTimeRange | undefined {
  if (typeof value !== 'string') return undefined;
  return RESEARCH_TIME_RANGE_ALIASES[
    stripResearchWrappingQuotes(value).toLowerCase()
  ];
}

function normalizeResearchDate(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = stripResearchWrappingQuotes(value);
  const match = RESEARCH_DATE_RE.exec(trimmed);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return undefined;
  }
  return trimmed;
}

function hasNonEmptyString(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasInvalidStringControl(value: unknown): boolean {
  return value != null && typeof value !== 'string';
}

function normalizeResearchDomains(value: unknown, limit: number): string[] {
  const raw = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const domain = normalizeResearchDomain(item);
    if (!domain || seen.has(domain)) continue;
    seen.add(domain);
    out.push(domain);
    if (out.length >= limit) break;
  }
  return out;
}

function countResearchDomainInputs(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean).length;
  }
  return 0;
}

function isResearchDomainInputShape(value: unknown): boolean {
  return value == null || Array.isArray(value) || typeof value === 'string';
}

function normalizeResearchProviders(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const provider = item.trim().toLowerCase();
    if (!provider || seen.has(provider)) continue;
    seen.add(provider);
    out.push(provider);
  }
  return out;
}

function normalizeBooleanControl(value: unknown): boolean {
  return value === true;
}

function isInvalidBooleanControl(value: unknown): boolean {
  return value != null && typeof value !== 'boolean';
}

function normalizeResearchDomain(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  let text = stripResearchWrappingQuotes(value).toLowerCase();
  if (!text) return undefined;
  if (/^https?:\/\//.test(text)) {
    try {
      text = new URL(text).hostname;
    } catch {
      return undefined;
    }
  }
  text = text.split(/[/?#]/)[0]?.replace(/:\d+$/, '') ?? '';
  if (!text || !RESEARCH_DOMAIN_RE.test(text)) return undefined;
  return text;
}

function normalizeMinScore(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Math.max(0, Math.min(value, 1));
}

function synthesizeFallbackSummary(sources: ResearchSource[]): string {
  const lead = sources
    .slice(0, 5)
    .map((s, i) => {
      const title = compactFallbackSummaryText(s.title) || s.url;
      const snippet = compactFallbackSummaryText(s.snippet);
      const rawExcerpt = snippet
        ? ''
        : compactFallbackSummaryText(s.rawContent ?? '');
      const urlExcerpt = snippet || rawExcerpt ? '' : s.url;
      const text = (snippet || rawExcerpt || urlExcerpt).slice(0, 200);
      const label = rawExcerpt ? ' [raw excerpt]' : urlExcerpt ? ' [url]' : '';
      return `- [${i + 1}] ${title}${label}: ${text}`;
    })
    .join('\n');
  return `(No provider summary; top snippets follow.)\n${lead}`;
}

function compactFallbackSummaryText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function clampMaxSources(
  value: unknown,
  fallback = RESEARCH_DEFAULT_MAX_SOURCES.shallow,
): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return Math.max(1, Math.min(Math.floor(value), TAVILY_MAX_RESULTS_LIMIT));
}
