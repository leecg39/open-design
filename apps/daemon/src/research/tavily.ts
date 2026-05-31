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
const TAVILY_SOURCE_TITLE_LIMIT = 300;
const TAVILY_SOURCE_SNIPPET_LIMIT = 800;
const TAVILY_PUBLISHED_AT_LIMIT = 100;
const TAVILY_REQUEST_ID_LIMIT = 120;
const TAVILY_ANSWER_LIMIT = 4_000;
const TAVILY_RAW_CONTENT_LIMIT = 4_000;
const TAVILY_ERROR_TEXT_LIMIT = 200;
const TRACKING_QUERY_PARAMETERS = new Set([
  'fbclid',
  'gclid',
  'igshid',
  'mc_cid',
  'mc_eid',
  'msclkid',
]);

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
  discardedSourceCount?: number;
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
  const apiKey = input.apiKey.trim();
  if (!apiKey) {
    throw new TavilyError('Tavily API key is not configured');
  }
  const base = (input.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const requestedMax =
    typeof input.maxResults === 'number' && Number.isFinite(input.maxResults)
      ? Math.floor(input.maxResults)
      : 5;
  const maxResults = Math.max(
    1,
    Math.min(requestedMax, TAVILY_MAX_RESULTS_LIMIT),
  );
  const chunksPerSource =
    typeof input.chunksPerSource === 'number' &&
    Number.isFinite(input.chunksPerSource)
      ? Math.max(1, Math.min(Math.floor(input.chunksPerSource), 3))
      : undefined;
  const body = {
    query: input.query,
    ...(input.searchDepth
      ? { search_depth: input.searchDepth }
      : input.autoParameters
        ? {}
        : { search_depth: 'basic' }),
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
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    ctrl.abort();
  }, DEFAULT_TIMEOUT_MS);
  let removeAbortListener: (() => void) | undefined;
  if (input.signal) {
    if (input.signal.aborted) {
      ctrl.abort();
    } else {
      const abort = () => ctrl.abort();
      input.signal.addEventListener('abort', abort, { once: true });
      removeAbortListener = () => input.signal?.removeEventListener('abort', abort);
    }
  }
  let resp: Response;
  try {
    resp = await fetch(`${base}/search`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } catch (err) {
    if (timedOut) {
      throw new TavilyError(
        `Tavily request timed out after ${DEFAULT_TIMEOUT_MS}ms`,
      );
    }
    if (ctrl.signal.aborted) {
      throw new TavilyError('Tavily request aborted');
    }
    const message = compactTavilyErrorText(
      (err as Error).message || String(err),
    );
    throw new TavilyError(
      `Tavily request failed: ${message || 'unknown error'}`,
    );
  } finally {
    clearTimeout(timer);
    removeAbortListener?.();
  }
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new TavilyError(
      `Tavily ${resp.status}: ${compactTavilyErrorText(text) || 'no body'}`,
      resp.status,
    );
  }
  let json: TavilyRawResponse;
  try {
    json = (await resp.json()) as TavilyRawResponse;
  } catch {
    throw new TavilyError('Tavily returned invalid JSON');
  }
  const answer =
    typeof json.answer === 'string'
      ? json.answer.trim().slice(0, TAVILY_ANSWER_LIMIT)
      : '';
  if (json.results != null && !Array.isArray(json.results)) {
    throw new TavilyError('Tavily returned invalid results list');
  }
  const rawResults = json.results ?? [];
  const images = normalizeTavilyImages(json.images);
  const usage = normalizeTavilyUsage(json.usage);
  const selectedParameters = input.autoParameters
    ? normalizeTavilyAutoParameters(json.auto_parameters)
    : undefined;
  const requestId =
    typeof json.request_id === 'string' && json.request_id.trim()
      ? json.request_id
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, TAVILY_REQUEST_ID_LIMIT)
      : undefined;
  const responseTime = normalizeNonNegativeNumber(json.response_time);
  const sources: ResearchSource[] = [];
  const seenSourceUrls = new Set<string>();
  let discardedSourceCount = 0;
  for (const item of rawResults) {
    if (!item || typeof item !== 'object') {
      discardedSourceCount += 1;
      continue;
    }
    const r = item as TavilyRawResult;
    const url = normalizeSourceUrl(r.url);
    if (!url || seenSourceUrls.has(url)) {
      discardedSourceCount += 1;
      continue;
    }
    seenSourceUrls.add(url);
    const publishedAt =
      typeof r.published_date === 'string' && r.published_date.trim()
        ? r.published_date
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, TAVILY_PUBLISHED_AT_LIMIT)
        : '';
    const score =
      typeof r.score === 'number' && Number.isFinite(r.score)
        ? Math.max(0, Math.min(r.score, 1))
        : null;
    const favicon = normalizeImageUrl(r.favicon);
    const rawContentText =
      input.includeRawContent && typeof r.raw_content === 'string'
        ? r.raw_content.trim()
        : '';
    const rawContent = rawContentText.slice(0, TAVILY_RAW_CONTENT_LIMIT);
    const rawContentTruncated =
      rawContentText.length > TAVILY_RAW_CONTENT_LIMIT;
    const sourceImages = input.includeImages
      ? normalizeTavilyImages(r.images, 3)
      : [];
    const title =
      typeof r.title === 'string'
        ? r.title
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, TAVILY_SOURCE_TITLE_LIMIT)
        : '';
    const snippet =
      typeof r.content === 'string'
        ? r.content
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, TAVILY_SOURCE_SNIPPET_LIMIT)
        : '';
    sources.push({
      title: title || url.slice(0, TAVILY_SOURCE_TITLE_LIMIT),
      url,
      snippet,
      ...(rawContent ? { rawContent } : {}),
      ...(rawContent && rawContentTruncated
        ? { rawContentTruncated: true }
        : {}),
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
    ...(discardedSourceCount > 0 ? { discardedSourceCount } : {}),
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
      ? record.search_depth.replace(/\s+/g, ' ').trim().slice(0, 40)
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

function compactTavilyErrorText(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, TAVILY_ERROR_TEXT_LIMIT);
}

function normalizeSourceUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  if (!text) return undefined;
  try {
    const url = new URL(text);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return undefined;
    }
    stripUrlCredentials(url);
    url.hash = '';
    if (url.pathname.length > 1) {
      url.pathname = url.pathname.replace(/\/+$/, '');
    }
    stripTrackingQueryParameters(url);
    sortQueryParameters(url);
    return url.toString();
  } catch {
    return undefined;
  }
}

function stripTrackingQueryParameters(url: URL): void {
  const keysToDelete = Array.from(url.searchParams.keys()).filter((key) => {
    const normalizedKey = key.toLowerCase();
    return (
      normalizedKey.startsWith('utm_') ||
      TRACKING_QUERY_PARAMETERS.has(normalizedKey)
    );
  });
  for (const key of keysToDelete) {
    url.searchParams.delete(key);
  }
}

function sortQueryParameters(url: URL): void {
  const entries = Array.from(url.searchParams.entries()).sort(
    ([keyA, valueA], [keyB, valueB]) =>
      keyA.localeCompare(keyB) || valueA.localeCompare(valueB),
  );
  url.search = '';
  for (const [key, value] of entries) {
    url.searchParams.append(key, value);
  }
}

function stripUrlCredentials(url: URL): void {
  url.username = '';
  url.password = '';
}

function normalizeNonNegativeNumber(value: unknown): number | undefined {
  if (typeof value === 'string' && !value.trim()) return undefined;
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
      ? record.description.replace(/\s+/g, ' ').trim().slice(0, 500)
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
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return undefined;
    }
    stripUrlCredentials(url);
    url.hash = '';
    stripTrackingQueryParameters(url);
    sortQueryParameters(url);
    return url.toString();
  } catch {
    return undefined;
  }
}
