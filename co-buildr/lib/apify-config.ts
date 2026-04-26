export const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;
export const REDDIT_SCRAPER_ACTOR_ID = 'spry_wholemeal/reddit-scraper';

export function buildRedditScraperConfig(params: {
  mode: 'scrape' | 'search' | 'discover' | 'domain';
  scrape?: { subreddits: string[]; sort?: string; timeframe?: string; maxPostsPerSubreddit?: number; comments?: object };
  search?: { queries: string[]; sort?: string; maxPostsPerQuery?: number; restrictToSubreddit?: string };
  discover?: { terms: string[]; maxSubredditsPerTerm?: number; minSubscribers?: number; includeNsfw?: boolean };
  domain?: { domains: string[]; maxPostsPerDomain?: number };
  proxyConfig?: { useApifyProxy?: boolean; apifyProxyGroups?: string[] };
}): Record<string, unknown> {
  return {
    mode: params.mode,
    [params.mode]: params[params.mode],
    proxyConfiguration: params.proxyConfig ?? {
      useApifyProxy: true,
      apifyProxyGroups: ['RESIDENTIAL']
    }
  };
}

export function assertApifyConfig(config: unknown): asserts config is Record<string, unknown> {
  if (!config || typeof config !== 'object') throw new Error('Invalid Apify config');
}
