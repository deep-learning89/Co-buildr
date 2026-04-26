import { ApifyClient } from 'apify-client';
import { APIFY_API_TOKEN, REDDIT_SCRAPER_ACTOR_ID, buildRedditScraperConfig } from './apify-config';
import type { InternalRedditResult, SpryWholemealPostOutput } from '@/lib/reddit';
import type { SupabaseClient } from '@supabase/supabase-js';

if (!APIFY_API_TOKEN) {
  throw new Error('APIFY_API_TOKEN is not configured');
}

const client = new ApifyClient({ token: APIFY_API_TOKEN });

export async function runApifyScraper(searchQuery: string) {
  console.log('🔍 Apify token available:', !!APIFY_API_TOKEN);
  console.log('🔍 Apify token length:', APIFY_API_TOKEN?.length || 0);
  
  const input = buildRedditScraperConfig({
    mode: 'search',
    search: {
      queries: [searchQuery],
      maxPostsPerQuery: 10,
      sort: 'relevance'
    }
  });
  
  console.log('🔍 Calling Apify actor:', REDDIT_SCRAPER_ACTOR_ID);
  const run = await client.actor(REDDIT_SCRAPER_ACTOR_ID).call(input);
  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  return { runId: run.id, items };
}

export async function pollApifyRun(runId: string) {
  const run = await client.run(runId).get();
  if (!run) {
    return {
      status: 'NOT_FOUND',
      isFinished: true,
      items: null
    };
  }
  
  return {
    status: run.status,
    isFinished: run.status === 'SUCCEEDED' || run.status === 'FAILED',
    items: run.status === 'SUCCEEDED' ? await client.run(runId).dataset().listItems() : null
  };
}

export function mapApifyItemToInternalResult(item: SpryWholemealPostOutput): InternalRedditResult {
  // Extract subreddit from permalink or use fallback
  const subreddit = item.permalink?.split('/r/')?.[1]?.split('/')?.[0] || '';
  
  // Extract ID from permalink or generate fallback ID
  const extractedId = item.permalink?.split('/comments/')?.[1]?.split('/')?.[0];
  const id = extractedId || `${item.author || 'unknown'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    id,
    title: item.title || '',
    body: item.text || '',
    text: item.text || '',
    subreddit,
    upvotes: item.score || 0,
    url: `https://reddit.com${item.permalink}`,
    link: `https://reddit.com${item.permalink}`,
    author: item.author || '',
    created_at: item.created_utc_iso || new Date().toISOString(),
    intent: null
  };
}

export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

export async function getCachedResults(
  searchQuery: string,
  supabase: SupabaseClient,
  userId?: string
): Promise<InternalRedditResult[] | null> {
  let query = supabase
    .from('reddit_scrapes')
    .select('results')
    .eq('search_query', normalizeQuery(searchQuery))
    .eq('status', 'completed');
    
  // SECURITY: Only return results for the specific user if userId provided
  if (userId) {
    query = query.eq('user_id', userId);
  }
    
  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data || !Array.isArray(data.results)) {
    return null;
  }

  return data.results as InternalRedditResult[];
}

export async function saveResultsToSupabase(
  supabase: SupabaseClient,
  searchQuery: string,
  originalQuery: string,
  runId: string,
  results: SpryWholemealPostOutput[],
  userId: string
) {
  const internalResults = results.map(mapApifyItemToInternalResult);
  
  const { error } = await supabase.from('reddit_scrapes').insert({
    search_query: normalizeQuery(searchQuery),
    original_query: originalQuery,
    actor_id: REDDIT_SCRAPER_ACTOR_ID,
    run_id: runId,
    status: 'completed',
    results: internalResults,
    user_id: userId, // SECURITY: Track which user owns this data
    completed_at: new Date().toISOString()
  });

  if (error) {
    throw new Error(`Failed to save results: ${error.message}`);
  }
}

export async function updateScrapeStatus(
  supabase: SupabaseClient,
  searchQuery: string,
  status: 'pending' | 'running' | 'completed' | 'failed',
  error_message?: string
) {
  const { error } = await supabase
    .from('reddit_scrapes')
    .update({ status, error_message, updated_at: new Date().toISOString() })
    .eq('search_query', normalizeQuery(searchQuery));

  if (error) {
    throw new Error(`Failed to update scrape status: ${error.message}`);
  }
}
