import type {
  ResearchImage,
  ResearchSelectedParameters,
  ResearchSource,
  ResearchTimeRange,
  ResearchTopic,
  ResearchUsage,
} from '@open-design/contracts/api/research';

const DEFAULT_BASE_URL = 'https://api.tavily.com';
const DEFAULT_TIMEOUT_MS = 30_000;
const TAVILY_MAX_RESULTS_LIMIT = 20;
const TAVILY_RAW_CONTENT_LIMIT = 4_000;

export interface TavilySearchInput {
  apiKey: string;
  baseUrl?: string;
  query: string;
  searchDepth?: 'basic' | 'advanced';
  topic?: ResearchTopic;
  country?: string;
  timeRange?: ResearchTimeRange;
  startDate?: string;
  endDate?: string;
  includeDomains?: string[];
  excludeDomains?: string[];
  exactMatch?: boolean;
  includeImages?: boolean;
  includeRawContent?: boolean;
  autoParameters?: boolean;
  maxResults?: number;
  includeAnswer?: boolean | 'basic' | 'advanced';
  chunksPerSource?: number;
  signal?: AbortSignal;
}

interface TavilyRawResult {
  title?: unknown;
  url?: unknown;
  content?: unknown;
  raw_content?: unknown;
  score?: unknown;
  published_date?: unknown;
  favicon?: unknown;
  images?: unknown;
}

interface TavilyRawResponse {
  answer?: unknown;
  images?: unknown;
  request_id?: unknown;
  response_time?: unknown;
  auto_parameters?: unknown;
  results?: unknown;
  usage?: unknown;
}

export interface TavilySearchOutput {
  answer: string;
  sources: ResearchSource[];
  images: ResearchImage[];
  usage?: ResearchUsage;
  requestId?: string;
  responseTime?: number;
  selectedParameters?: ResearchSelectedParameters;
}

export class TavilyError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'TavilyError';
  }
}

export async function tavilySearch(
  input: TavilySearchInput,
): Promise<TavilySearchOutput> {
  if (!input.apiKey) {
    throw new TavilyError('Tavily API key is not configured');
  }
  const base = (input.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const requestedMax = input.maxResults ?? 5;
  const maxResults = Math.max(
    0,
    Math.min(requestedMax, TAVILY_MAX_RESULTS_LIMIT),
  );
  const chunksPerSource =
    typeof input.chunksPerSource === 'number' &&
    Number.isFinite(input.chunksPerSource)
      ? Math.max(1, Math.min(Math.floor(input.chunksPerSource), 3))
      : undefined;
  const body = {
    query: input.query,
    search_depth: input.searchDepth ?? 'basic',
    ...(input.topic ? { topic: input.topic } : {}),
    ...(input.country ? { country: input.country } : {}),
    ...(input.timeRange ? { time_range: input.timeRange } : {}),
    ...(input.startDate ? { start_date: input.startDate } : {}),
    ...(input.endDate ? { end_date: input.endDate } : {}),
    ...(input.includeDomains?.length
      ? { include_domains: input.includeDomains }
      : {}),
    ...(input.excludeDomains?.length
      ? { exclude_domains: input.excludeDomains }
      : {}),
    ...(input.exactMatch ? { exact_match: true } : {}),
    ...(input.includeImages
      ? { include_images: true, include_image_descriptions: true }
      : {}),
    include_favicon: true,
    include_usage: true,
    max_results: maxResults,
    include_answer: input.includeAnswer ?? true,
    include_raw_content: input.includeRawContent ? 'markdown' : false,
    ...(input.autoParameters ? { auto_parameters: true } : {}),
    ...(input.searchDepth === 'advanced' && chunksPerSource
      ? { chunks_per_source: chunksPerSource }
      : {}),
  };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), DEFAULT_TIMEOUT_MS);
  if (input.signal) {
    input.signal.addEventListener('abort', () => ctrl.abort(), { once: true });
  }
  let resp: Response;
  try {
    resp = await fetch(`${base}/search`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${input.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } catch (err) {
    throw new TavilyError(
      `Tavily request failed: ${(err as Error).message || String(err)}`,
    );
  } finally {
    clearTimeout(timer);
  }
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new TavilyError(
      `Tavily ${resp.status}: ${text.slice(0, 200) || 'no body'}`,
      resp.status,
    );
  }
  const json = (await resp.json()) as TavilyRawResponse;
  const answer = typeof json.answer === 'string' ? json.answer : '';
  const rawResults = Array.isArray(json.results) ? json.results : [];
  const images = normalizeTavilyImages(json.images);
  const usage = normalizeTavilyUsage(json.usage);
  const selectedParameters = input.autoParameters
    ? normalizeTavilyAutoParameters(json.auto_parameters)
    : undefined;
  const requestId =
    typeof json.request_id === 'string' && json.request_id.trim()
      ? json.request_id.trim()
      : undefined;
  const responseTime = normalizeNonNegativeNumber(json.response_time);
  const sources: ResearchSource[] = [];
  for (const r of rawResults as TavilyRawResult[]) {
    const url = typeof r.url === 'string' ? r.url : '';
    if (!url) continue;
    const publishedAt =
      typeof r.published_date === 'string' && r.published_date.trim()
        ? r.published_date.trim()
        : null;
    const score =
      typeof r.score === 'number' && Number.isFinite(r.score)
        ? Math.max(0, Math.min(r.score, 1))
        : null;
    const favicon = normalizeImageUrl(r.favicon);
    const rawContent =
      input.includeRawContent && typeof r.raw_content === 'string'
        ? r.raw_content.trim().slice(0, TAVILY_RAW_CONTENT_LIMIT)
        : '';
    const sourceImages = input.includeImages
      ? normalizeTavilyImages(r.images, 3)
      : [];
    sources.push({
      title:
        typeof r.title === 'string' && r.title.trim()
          ? r.title.trim()
          : url,
      url,
      snippet:
        typeof r.content === 'string'
          ? r.content.trim().slice(0, 800)
          : '',
      ...(rawContent ? { rawContent } : {}),
      ...(sourceImages.length ? { images: sourceImages } : {}),
      provider: 'tavily',
      ...(publishedAt ? { publishedAt } : {}),
      ...(score != null ? { score } : {}),
      ...(favicon ? { favicon } : {}),
    });
  }
  return {
    answer,
    sources,
    images,
    ...(usage ? { usage } : {}),
    ...(requestId ? { requestId } : {}),
    ...(responseTime != null ? { responseTime } : {}),
    ...(selectedParameters ? { selectedParameters } : {}),
  };
}

function normalizeTavilyAutoParameters(
  value: unknown,
): ResearchSelectedParameters | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  const topic =
    record.topic === 'general' ||
    record.topic === 'news' ||
    record.topic === 'finance'
      ? record.topic
      : undefined;
  const searchDepth =
    typeof record.search_depth === 'string' && record.search_depth.trim()
      ? record.search_depth.trim().slice(0, 40)
      : undefined;
  return topic || searchDepth
    ? {
        ...(topic ? { topic } : {}),
        ...(searchDepth ? { searchDepth } : {}),
      }
    : undefined;
}

function normalizeTavilyUsage(value: unknown): ResearchUsage | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  const credits = normalizeNonNegativeNumber(record.credits);
  return credits == null ? undefined : { credits };
}

function normalizeNonNegativeNumber(value: unknown): number | undefined {
  const n =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : NaN;
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

function normalizeTavilyImages(value: unknown, limit = 10): ResearchImage[] {
  if (!Array.isArray(value)) return [];
  const images: ResearchImage[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const image = normalizeTavilyImage(item);
    if (!image || seen.has(image.url)) continue;
    seen.add(image.url);
    images.push(image);
    if (images.length >= limit) break;
  }
  return images;
}

function normalizeTavilyImage(value: unknown): ResearchImage | undefined {
  if (typeof value === 'string') {
    const url = normalizeImageUrl(value);
    return url ? { url, provider: 'tavily' } : undefined;
  }
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  const url = normalizeImageUrl(record.url);
  if (!url) return undefined;
  const description =
    typeof record.description === 'string' && record.description.trim()
      ? record.description.trim().slice(0, 500)
      : undefined;
  return {
    url,
    ...(description ? { description } : {}),
    provider: 'tavily',
  };
}

function normalizeImageUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  if (!text) return undefined;
  try {
    const url = new URL(text);
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}
