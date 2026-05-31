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
  timeRange?: ResearchTimeRange;
  startDate?: string;
  endDate?: string;
  includeDomains?: string[];
  excludeDomains?: string[];
  exactMatch?: boolean;
  minScore?: number;
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
  const depth = normalizeResearchDepth(input.depth);
  const topic = normalizeResearchTopic(input.topic);
  const timeRange = normalizeResearchTimeRange(input.timeRange);
  const startDate = normalizeResearchDate(input.startDate);
  const endDate = normalizeResearchDate(input.endDate);
  const includeDomains = normalizeResearchDomains(input.includeDomains);
  const excludeDomains = normalizeResearchDomains(input.excludeDomains);
  const exactMatch = input.exactMatch === true;
  const minScore = normalizeMinScore(input.minScore);
  const requested = Array.isArray(input.providers) ? input.providers : [];
  const providers = requested.filter(
    (p: unknown): p is string => typeof p === 'string' && p.length > 0,
  );
  const provider = providers[0] ?? 'tavily';
  const maxSources = clampMaxSources(
    input.maxSources ?? RESEARCH_DEFAULT_MAX_SOURCES[depth],
  );

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
  try {
    const out = await tavilySearch({
      apiKey: cfg.apiKey,
      query,
      searchDepth: depth === 'shallow' ? 'basic' : 'advanced',
      ...(topic ? { topic } : {}),
      ...(timeRange ? { timeRange } : {}),
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {}),
      ...(includeDomains.length ? { includeDomains } : {}),
      ...(excludeDomains.length ? { excludeDomains } : {}),
      ...(exactMatch ? { exactMatch } : {}),
      maxResults: maxSources,
      includeAnswer: depth === 'deep' ? 'advanced' : true,
      ...(depth === 'medium' ? { chunksPerSource: 2 } : {}),
      ...(depth === 'deep' ? { chunksPerSource: 3 } : {}),
      ...(cfg.baseUrl ? { baseUrl: cfg.baseUrl } : {}),
      ...(input.signal ? { signal: input.signal } : {}),
    });
    answer = out.answer;
    sources =
      minScore == null
        ? out.sources
        : out.sources.filter((source) => (source.score ?? 0) >= minScore);
  } catch (err) {
    const message =
      err instanceof TavilyError
        ? err.message
        : `research failed: ${(err as Error).message || String(err)}`;
    throw new ResearchError(message, 502, 'RESEARCH_PROVIDER_FAILED');
  }

  if (sources.length === 0) {
    throw new ResearchError('no sources found', 404, 'NO_RESEARCH_SOURCES');
  }

  return {
    query,
    summary: answer || synthesizeFallbackSummary(sources),
    sources,
    provider,
    depth,
    ...(topic ? { topic } : {}),
    ...(timeRange ? { timeRange } : {}),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
    ...(includeDomains.length ? { includeDomains } : {}),
    ...(excludeDomains.length ? { excludeDomains } : {}),
    ...(exactMatch ? { exactMatch } : {}),
    ...(minScore != null ? { minScore } : {}),
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
    .map((s, i) => `- [${i + 1}] ${s.title}: ${s.snippet.slice(0, 200)}`)
    .join('\n');
  return `(No provider summary; top snippets follow.)\n${lead}`;
}

function clampMaxSources(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return RESEARCH_DEFAULT_MAX_SOURCES.shallow;
  }
  return Math.max(1, Math.min(Math.floor(value), TAVILY_MAX_RESULTS_LIMIT));
}
