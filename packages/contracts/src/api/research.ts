/**
 * Agent-callable research DTOs. The web/composer toggles `enabled`, the
 * daemon injects a command contract, and the agent may call
 * `od research search` to retrieve JSON findings.
 */

export type ResearchDepth = 'shallow' | 'medium' | 'deep';
export type ResearchTopic = 'general' | 'news' | 'finance';
export type ResearchTimeRange = 'day' | 'week' | 'month' | 'year';

export interface ResearchOptions {
  enabled: boolean;
  /** Optional override; defaults to the user's chat message. */
  query?: string;
  /** Controls the provider relevance/cost tradeoff. */
  depth?: ResearchDepth;
  /** Optional Tavily source category. */
  topic?: ResearchTopic;
  /** Optional country boost for general-topic searches. */
  country?: string;
  /** Optional recency filter for current/updated sources. */
  timeRange?: ResearchTimeRange;
  /** Optional exact lower date bound in YYYY-MM-DD format. */
  startDate?: string;
  /** Optional exact upper date bound in YYYY-MM-DD format. */
  endDate?: string;
  /** Optional source domains to include. */
  includeDomains?: string[];
  /** Optional source domains to exclude. */
  excludeDomains?: string[];
  /** Require exact quoted phrases to appear in returned results. */
  exactMatch?: boolean;
  /** Optional minimum provider relevance score from 0 to 1. */
  minScore?: number;
  /** Include query-related image evidence for visual research. */
  includeImages?: boolean;
  /** Include bounded cleaned page content for evidence-heavy reports. */
  includeRawContent?: boolean;
  /** Let the provider tune supported search parameters from the query intent. */
  autoParameters?: boolean;
  /** Cap on returned sources. Defaults follow the depth. */
  maxSources?: number;
  /** Provider preference order. Phase 1 supports ['tavily']. */
  providers?: string[];
}

export interface ResearchSelectedParameters {
  topic?: ResearchTopic;
  searchDepth?: string;
}

export interface ResearchSource {
  title: string;
  url: string;
  snippet: string;
  rawContent?: string;
  rawContentTruncated?: boolean;
  publishedAt?: string;
  score?: number;
  favicon?: string;
  images?: ResearchImage[];
  provider: string;
}

export interface ResearchImage {
  url: string;
  description?: string;
  provider: string;
}

export interface ResearchUsage {
  credits?: number;
}

export interface ResearchFindings {
  query: string;
  summary: string;
  sources: ResearchSource[];
  images?: ResearchImage[];
  provider: string;
  depth: ResearchDepth;
  topic?: ResearchTopic;
  country?: string;
  timeRange?: ResearchTimeRange;
  startDate?: string;
  endDate?: string;
  includeDomains?: string[];
  excludeDomains?: string[];
  exactMatch?: boolean;
  minScore?: number;
  filteredSourceCount?: number;
  discardedSourceCount?: number;
  includeImages?: boolean;
  includeRawContent?: boolean;
  autoParameters?: boolean;
  selectedParameters?: ResearchSelectedParameters;
  warnings?: string[];
  usage?: ResearchUsage;
  requestId?: string;
  responseTime?: number;
  /** Unix ms when the search returned. */
  fetchedAt: number;
}

export const RESEARCH_DEFAULT_MAX_SOURCES: Record<ResearchDepth, number> = {
  shallow: 5,
  medium: 12,
  deep: 20,
};
