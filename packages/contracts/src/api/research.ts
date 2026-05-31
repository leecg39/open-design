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
  /** Cap on returned sources. Defaults follow the depth. */
  maxSources?: number;
  /** Provider preference order. Phase 1 supports ['tavily']. */
  providers?: string[];
}

export interface ResearchSource {
  title: string;
  url: string;
  snippet: string;
  publishedAt?: string;
  provider: string;
}

export interface ResearchFindings {
  query: string;
  summary: string;
  sources: ResearchSource[];
  provider: string;
  depth: ResearchDepth;
  topic?: ResearchTopic;
  timeRange?: ResearchTimeRange;
  startDate?: string;
  endDate?: string;
  includeDomains?: string[];
  excludeDomains?: string[];
  exactMatch?: boolean;
  /** Unix ms when the search returned. */
  fetchedAt: number;
}

export const RESEARCH_DEFAULT_MAX_SOURCES: Record<ResearchDepth, number> = {
  shallow: 5,
  medium: 12,
  deep: 30,
};
