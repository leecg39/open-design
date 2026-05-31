import type {
  ResearchImage,
  ResearchSource,
  ResearchTimeRange,
  ResearchTopic,
} from '@open-design/contracts/api/research';

const DEFAULT_BASE_URL = 'https://api.tavily.com';
const DEFAULT_TIMEOUT_MS = 30_000;
const TAVILY_MAX_RESULTS_LIMIT = 20;

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
  maxResults?: number;
  includeAnswer?: boolean | 'basic' | 'advanced';
  chunksPerSource?: number;
  signal?: AbortSignal;
}

interface TavilyRawResult {
  title?: unknown;
  url?: unknown;
  content?: unknown;
  score?: unknown;
  published_date?: unknown;
  favicon?: unknown;
}

interface TavilyRawResponse {
  answer?: unknown;
  images?: unknown;
  results?: unknown;
}

export interface TavilySearchOutput {
  answer: string;
  sources: ResearchSource[];
  images: ResearchImage[];
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
    max_results: maxResults,
    include_answer: input.includeAnswer ?? true,
    include_raw_content: false,
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
      provider: 'tavily',
      ...(publishedAt ? { publishedAt } : {}),
      ...(score != null ? { score } : {}),
      ...(favicon ? { favicon } : {}),
    });
  }
  return { answer, sources, images };
}

function normalizeTavilyImages(value: unknown): ResearchImage[] {
  if (!Array.isArray(value)) return [];
  const images: ResearchImage[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const image = normalizeTavilyImage(item);
    if (!image || seen.has(image.url)) continue;
    seen.add(image.url);
    images.push(image);
    if (images.length >= 10) break;
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
