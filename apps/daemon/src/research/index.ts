import type {
  ResearchDepth,
  ResearchFindings,
  ResearchSource,
  ResearchTimeRange,
  ResearchTopic,
} from '@open-design/contracts/api/research';
import { RESEARCH_DEFAULT_MAX_SOURCES } from '@open-design/contracts/api/research';
import { resolveProviderConfig } from '../media-config.js';
import { tavilySearch, TavilyError } from './tavily.js';

const TAVILY_MAX_RESULTS_LIMIT = 20;
const RESEARCH_DOMAIN_FILTER_LIMIT = 20;
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
  query: string;
  projectRoot: string;
  depth?: ResearchDepth;
  topic?: ResearchTopic;
  country?: string;
  timeRange?: ResearchTimeRange;
  startDate?: string;
  endDate?: string;
  includeDomains?: string[];
  excludeDomains?: string[];
  exactMatch?: boolean;
  minScore?: number;
  includeImages?: boolean;
  includeRawContent?: boolean;
  autoParameters?: boolean;
  maxSources?: number;
  providers?: string[];
  signal?: AbortSignal;
}

export async function searchResearch(
  input: SearchResearchInput,
): Promise<ResearchFindings> {
  const query = (input.query?.trim() || '').slice(0, 1000);
  if (!query) {
    throw new ResearchError('query required', 400, 'QUERY_REQUIRED');
  }
  const warnings: string[] = [];
  const depth = normalizeResearchDepth(input.depth);
  if (
    hasNonEmptyString(input.depth) &&
    input.depth !== 'shallow' &&
    input.depth !== 'medium' &&
    input.depth !== 'deep'
  ) {
    warnings.push('Ignored invalid depth; expected shallow, medium, or deep.');
  }
  const topic = normalizeResearchTopic(input.topic);
  if (hasNonEmptyString(input.topic) && !topic) {
    warnings.push('Ignored invalid topic; expected general, news, or finance.');
  }
  const normalizedCountry = normalizeResearchCountry(input.country);
  const country =
    topic === 'news' || topic === 'finance' ? undefined : normalizedCountry;
  if (hasNonEmptyString(input.country) && !normalizedCountry) {
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
  if (hasNonEmptyString(input.timeRange) && !timeRange) {
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
  if (hasNonEmptyString(input.startDate) && !startDate) {
    warnings.push('Ignored invalid startDate; expected YYYY-MM-DD.');
  }
  if (hasNonEmptyString(input.endDate) && !endDate) {
    warnings.push('Ignored invalid endDate; expected YYYY-MM-DD.');
  }
  if (startDate && endDate && startDate > endDate) {
    throw new ResearchError(
      'startDate must be earlier than or equal to endDate',
      400,
      'INVALID_DATE_RANGE',
    );
  }
  const includeDomains = normalizeResearchDomains(input.includeDomains);
  let excludeDomains = normalizeResearchDomains(input.excludeDomains);
  if (countResearchDomainInputs(input.includeDomains) > includeDomains.length) {
    warnings.push(
      'Ignored invalid, duplicate, or excess includeDomains entries.',
    );
  }
  if (countResearchDomainInputs(input.excludeDomains) > excludeDomains.length) {
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
  const exactMatch = input.exactMatch === true;
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
  const includeImages = input.includeImages === true;
  const includeRawContent = input.includeRawContent === true;
  const autoParameters = input.autoParameters === true;
  const requested = Array.isArray(input.providers) ? input.providers : [];
  const providers = requested.filter(
    (p: unknown): p is string => typeof p === 'string' && p.length > 0,
  );
  const provider = providers[0] ?? 'tavily';
  const maxSources = clampMaxSources(
    input.maxSources ?? RESEARCH_DEFAULT_MAX_SOURCES[depth],
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
  const key = value.trim().toLowerCase();
  const alias = RESEARCH_COUNTRY_ALIASES[key];
  const normalized = (alias ?? key).replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  return RESEARCH_COUNTRY_RE.test(normalized) ? normalized : undefined;
}

function normalizeResearchTimeRange(
  value: unknown,
): ResearchTimeRange | undefined {
  return value === 'day' ||
    value === 'week' ||
    value === 'month' ||
    value === 'year'
    ? value
    : undefined;
}

function normalizeResearchDate(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
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

function normalizeResearchDomains(value: unknown): string[] {
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
    if (out.length >= RESEARCH_DOMAIN_FILTER_LIMIT) break;
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

function normalizeResearchDomain(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  let text = value.trim().toLowerCase();
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
      const snippet = s.snippet.trim();
      const rawExcerpt = snippet ? '' : s.rawContent?.trim() ?? '';
      const urlExcerpt = snippet || rawExcerpt ? '' : s.url;
      const text = (snippet || rawExcerpt || urlExcerpt).slice(0, 200);
      const label = rawExcerpt ? ' [raw excerpt]' : urlExcerpt ? ' [url]' : '';
      return `- [${i + 1}] ${s.title}${label}: ${text}`;
    })
    .join('\n');
  return `(No provider summary; top snippets follow.)\n${lead}`;
}

function clampMaxSources(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return RESEARCH_DEFAULT_MAX_SOURCES.shallow;
  }
  return Math.max(1, Math.min(Math.floor(value), TAVILY_MAX_RESULTS_LIMIT));
}
