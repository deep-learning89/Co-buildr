export const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN || '';
export const TRUDAX_REDDIT_SCRAPER_ACTOR_ID = 'reddit-public-json' as const;

export type TrudaxType = 'community' | 'post' | 'user';
export type TrudaxSort = 'relevance' | 'hot' | 'top' | 'new' | 'comments';
export type TrudaxTime = 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';

export interface TrudaxStartUrl {
  url: string;
}

export interface TrudaxProxyConfig {
  useApifyProxy: true;
}

export interface TrudaxRedditScraperInput {
  searches?: string[];
  startUrls?: TrudaxStartUrl[];
  searchCommunityName?: string;
  type?: TrudaxType;
  sort?: TrudaxSort;
  time?: TrudaxTime;
  maxItems?: number;
  maxPostCount?: number;
  maxComments?: number;
  maxCommunitiesCount?: number;
  maxUserCount?: number;
  scrollTimeout?: number;
  includeNSFW?: boolean;
  searchPosts?: boolean;
  searchComments?: boolean;
  searchCommunities?: boolean;
  searchUsers?: boolean;
  skipComments?: boolean;
  postDateLimit?: string;
  proxy: TrudaxProxyConfig;
}

export function buildTrudaxRedditScraperConfig(
  input: Omit<TrudaxRedditScraperInput, 'proxy'> & { proxy?: TrudaxProxyConfig }
): TrudaxRedditScraperInput {
  const searches = input.searches?.map((value) => value.trim()).filter(Boolean);
  const hasSearches = Boolean(searches && searches.length > 0);
  const hasStartUrls = Boolean(input.startUrls && input.startUrls.length > 0);

  if (!hasSearches && !hasStartUrls) {
    throw new Error('Provide either searches or startUrls for trudax/reddit-scraper.');
  }

  return {
    ...input,
    searches: hasSearches ? searches : undefined,
    scrollTimeout: input.scrollTimeout ?? 40,
    proxy: { useApifyProxy: true },
  };
}

export function assertApifyConfig(): void {
  // Kept for backward compatibility with existing route flow.
  // Reddit public JSON does not require APIFY_API_TOKEN.
}
