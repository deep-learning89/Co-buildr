import type { IntentType } from '@/types';

// === New Actor Input Types ===
export type SpryWholemealMode = 'scrape' | 'search' | 'discover' | 'domain';

export interface SpryWholemealScrapeConfig {
  subreddits: string[];
  sort?: 'hot' | 'new' | 'top' | 'rising' | 'controversial';
  timeframe?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
  maxPostsPerSubreddit?: number;
  comments?: {
    mode: 'none' | 'all' | 'high_engagement';
    maxTopLevel?: number;
    maxDepth?: number;
  };
}

export interface SpryWholemealSearchConfig {
  queries: string[];
  sort?: 'relevance' | 'hot' | 'new' | 'top' | 'comments';
  maxPostsPerQuery?: number;
  restrictToSubreddit?: string;
  authorFilter?: string;
  flairFilter?: string;
  selfPostsOnly?: boolean;
}

export interface SpryWholemealDiscoverConfig {
  terms: string[];
  maxSubredditsPerTerm?: number;
  minSubscribers?: number;
  includeNsfw?: boolean;
}

export interface SpryWholemealDomainConfig {
  domains: string[];
  maxPostsPerDomain?: number;
}

export interface SpryWholemealProxyConfig {
  useApifyProxy: boolean;
  apifyProxyGroups?: string[];
}

export interface SpryWholemealInput {
  mode: SpryWholemealMode;
  scrape?: SpryWholemealScrapeConfig;
  search?: SpryWholemealSearchConfig;
  discover?: SpryWholemealDiscoverConfig;
  domain?: SpryWholemealDomainConfig;
  proxyConfiguration?: SpryWholemealProxyConfig;
  proxyCountry?: string;
  requestDelayMs?: number;
  includeRaw?: boolean;
  tag?: string;
}

// === New Actor Output Types ===
export interface SpryWholemealPostOutput {
  title: string;
  text: string;
  author: string;
  score: number;
  upvote_ratio: number;
  num_comments: number;
  created_utc_iso: string;
  permalink: string;
  listing_rank: number;
  score_per_hour: number;
  engagement_level: string;
}

export interface SpryWholemealCommentOutput {
  text: string;
  author: string;
  score: number;
  depth: number;
  parent_id: string;
  reply_count_direct: number;
  reply_count_total: number;
}

export interface SpryWholemealSubredditOutput {
  display_name: string;
  subscribers: number;
  active_users: number;
  estimated_posts_per_day: number;
  public_description: string;
}

export type SpryWholemealOutputItem = 
  | SpryWholemealPostOutput 
  | SpryWholemealCommentOutput 
  | SpryWholemealSubredditOutput;

// === Keep existing InternalRedditResult type unchanged ===
export interface InternalRedditResult {
  id: string;
  title: string;
  body: string;
  text: string;
  subreddit: string;
  upvotes: number;
  url: string;
  link: string;
  author: string;
  created_at: string;
  intent?: IntentType | null;
  aiSummary?: string;
  relevanceScore?: number;
}
