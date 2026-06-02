/**
 * Agent-callable research DTOs. The web/composer toggles `enabled`, the
 * daemon injects a command contract, and the agent may call
 * `od research search` to retrieve JSON findings.
 */

export type ResearchDepth = 'shallow' | 'medium' | 'deep';
export type ResearchTopic = 'general' | 'news' | 'finance';
export type ResearchTimeRange = 'day' | 'week' | 'month' | 'year';

export const RESEARCH_SUPPORTED_COUNTRIES = [
  'afghanistan',
  'albania',
  'algeria',
  'andorra',
  'angola',
  'argentina',
  'armenia',
  'australia',
  'austria',
  'azerbaijan',
  'bahamas',
  'bahrain',
  'bangladesh',
  'barbados',
  'belarus',
  'belgium',
  'belize',
  'benin',
  'bhutan',
  'bolivia',
  'bosnia and herzegovina',
  'botswana',
  'brazil',
  'brunei',
  'bulgaria',
  'burkina faso',
  'burundi',
  'cambodia',
  'cameroon',
  'canada',
  'cape verde',
  'central african republic',
  'chad',
  'chile',
  'china',
  'colombia',
  'comoros',
  'congo',
  'costa rica',
  'croatia',
  'cuba',
  'cyprus',
  'czech republic',
  'denmark',
  'djibouti',
  'dominican republic',
  'ecuador',
  'egypt',
  'el salvador',
  'equatorial guinea',
  'eritrea',
  'estonia',
  'ethiopia',
  'fiji',
  'finland',
  'france',
  'gabon',
  'gambia',
  'georgia',
  'germany',
  'ghana',
  'greece',
  'guatemala',
  'guinea',
  'haiti',
  'honduras',
  'hungary',
  'iceland',
  'india',
  'indonesia',
  'iran',
  'iraq',
  'ireland',
  'israel',
  'italy',
  'jamaica',
  'japan',
  'jordan',
  'kazakhstan',
  'kenya',
  'kuwait',
  'kyrgyzstan',
  'latvia',
  'lebanon',
  'lesotho',
  'liberia',
  'libya',
  'liechtenstein',
  'lithuania',
  'luxembourg',
  'madagascar',
  'malawi',
  'malaysia',
  'maldives',
  'mali',
  'malta',
  'mauritania',
  'mauritius',
  'mexico',
  'moldova',
  'monaco',
  'mongolia',
  'montenegro',
  'morocco',
  'mozambique',
  'myanmar',
  'namibia',
  'nepal',
  'netherlands',
  'new zealand',
  'nicaragua',
  'niger',
  'nigeria',
  'north korea',
  'north macedonia',
  'norway',
  'oman',
  'pakistan',
  'panama',
  'papua new guinea',
  'paraguay',
  'peru',
  'philippines',
  'poland',
  'portugal',
  'qatar',
  'romania',
  'russia',
  'rwanda',
  'saudi arabia',
  'senegal',
  'serbia',
  'singapore',
  'slovakia',
  'slovenia',
  'somalia',
  'south africa',
  'south korea',
  'south sudan',
  'spain',
  'sri lanka',
  'sudan',
  'sweden',
  'switzerland',
  'syria',
  'taiwan',
  'tajikistan',
  'tanzania',
  'thailand',
  'togo',
  'trinidad and tobago',
  'tunisia',
  'turkey',
  'turkmenistan',
  'uganda',
  'ukraine',
  'united arab emirates',
  'united kingdom',
  'united states',
  'uruguay',
  'uzbekistan',
  'venezuela',
  'vietnam',
  'yemen',
  'zambia',
  'zimbabwe',
] as const;

export const RESEARCH_SUPPORTED_COUNTRY_SET: ReadonlySet<string> = new Set(
  RESEARCH_SUPPORTED_COUNTRIES,
);

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
  includeRawContent?: ResearchRawContentMode;
  /** Let the provider tune supported search parameters from the query intent. */
  autoParameters?: boolean;
  /** Cap on returned sources. Defaults follow the depth. */
  maxSources?: number;
  /** Provider preference order. Phase 1 supports ['tavily']. */
  providers?: string[];
}

export type ResearchRawContentMode = boolean | 'markdown' | 'text';

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
  maxSources?: number;
  filteredSourceCount?: number;
  discardedSourceCount?: number;
  includeImages?: boolean;
  includeRawContent?: ResearchRawContentMode;
  autoParameters?: boolean;
  selectedParameters?: ResearchSelectedParameters;
  warnings?: string[];
  usage?: ResearchUsage;
  requestId?: string;
  responseTime?: number;
  /** Unix ms when the search returned. */
  fetchedAt: number;
  /** Project-relative Markdown report path when the CLI saved one. */
  reportPath?: string;
}

export const RESEARCH_DEFAULT_MAX_SOURCES: Record<ResearchDepth, number> = {
  shallow: 5,
  medium: 12,
  deep: 20,
};
