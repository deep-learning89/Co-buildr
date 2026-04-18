import { APIFY_API_TOKEN, REDDIT_SCRAPER_ACTOR_ID, assertApifyConfig } from './apify-config';
import { getSupabaseServer } from './supabase-server';

export interface RedditPost {
  title: string;
  subreddit: string;
  upvotes: number;
  text: string;
  link: string;
  author: string;
  created_at: string;
}

export interface ScrapeInput {
  query: string;
  maxPosts?: number;
  sort?: 'hot' | 'new' | 'top';
  mode?: 'posts' | 'people';
}

export interface ApifyRun {
  data: {
    id: string;
    status: 'READY' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'ABORTED' | 'TIMING-OUT';
    statusMessage?: string;
    defaultDatasetId?: string;
  };
}

const PRACTICALTOOLS_ACTOR = 'practicaltools~apify-reddit-api';

async function parseApifyError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: { message?: string } };
    return payload.error?.message || response.statusText || 'Unknown Apify error';
  } catch {
    return response.statusText || 'Unknown Apify error';
  }
}

// Run Apify actor and return run ID
export async function runApifyScraper(input: ScrapeInput): Promise<string> {
  assertApifyConfig();
  const parsedMaxPosts = Number(input.maxPosts);
  const isPracticaltoolsActor = REDDIT_SCRAPER_ACTOR_ID === PRACTICALTOOLS_ACTOR;
  const mode = input.mode || 'posts';

  const actorInput = isPracticaltoolsActor
    ? {
        searches: [input.query],
        maxItems: Number.isFinite(parsedMaxPosts) ? Math.max(1, Math.floor(parsedMaxPosts)) : 20,
        sort: input.sort || 'hot',
        skipComments: mode === 'posts',
        skipUserPosts: mode === 'posts',
        skipCommunity: true,
      }
    : {
        startUrls: [
          `https://www.reddit.com/search?q=${encodeURIComponent(input.query)}&sort=${input.sort || 'hot'}`,
        ],
        maxPosts: Number.isFinite(parsedMaxPosts) ? Math.max(100, Math.floor(parsedMaxPosts)) : 100,
        sort: input.sort || 'hot',
      };

  const actorPath = encodeURIComponent(REDDIT_SCRAPER_ACTOR_ID);
  const response = await fetch(`https://api.apify.com/v2/acts/${actorPath}/runs`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${APIFY_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(actorInput),
  });

  if (!response.ok) {
    const message = await parseApifyError(response);
    throw new Error(`Apify API error (${REDDIT_SCRAPER_ACTOR_ID}): ${message}`);
  }

  const run: ApifyRun = await response.json();
  return run.data.id;
}

// Poll Apify run until completion
export async function pollApifyRun(runId: string): Promise<RedditPost[]> {
  assertApifyConfig();

  const maxAttempts = 30;
  const delay = 5000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(`https://api.apify.com/v2/actor-runs/${runId}`, {
      headers: {
        'Authorization': `Bearer ${APIFY_API_TOKEN}`,
      },
    });

    if (!response.ok) {
      const message = await parseApifyError(response);
      throw new Error(`Failed to poll run: ${message}`);
    }

    const run: ApifyRun = await response.json();
    
    if (run.data.status === 'SUCCEEDED') {
      // Use defaultDatasetId for reliable dataset retrieval
      const datasetId = run.data.defaultDatasetId;
      if (!datasetId) {
        throw new Error('No dataset ID available for completed run');
      }
      
      const itemsResponse = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items`, {
        headers: {
          'Authorization': `Bearer ${APIFY_API_TOKEN}`,
        },
      });

      if (!itemsResponse.ok) {
        const message = await parseApifyError(itemsResponse);
        throw new Error(`Failed to fetch items: ${message}`);
      }

      const items = (await itemsResponse.json()) as Array<Record<string, unknown>>;
      return items.map((item: Record<string, unknown>): RedditPost => {
        const community = (item.subreddit as string) || (item.parsedCommunityName as string) || '';
        const communityName = (item.communityName as string) || '';

        return {
          title: (item.title as string) || '',
          subreddit: community || communityName.replace(/^r\//i, ''),
          upvotes: Number(item.upvotes ?? item.upVotes ?? item.score ?? 0) || 0,
          text: (item.text as string) || (item.selftext as string) || (item.body as string) || '',
          link: (item.url as string) || (item.permalink as string) || (item.link as string) || '',
          author: (item.author as string) || (item.username as string) || '',
          created_at: (item.created_at as string) || (item.createdAt as string) || new Date().toISOString(),
        };
      });
    }

    if (run.data.status === 'FAILED') {
      throw new Error(`Scraping failed: ${run.data.statusMessage || 'Unknown error'}`);
    }

    if (run.data.status === 'ABORTED') {
      throw new Error('Scraping was aborted');
    }

    if (run.data.status === 'TIMING-OUT') {
      throw new Error('Scraping timed out');
    }

    await new Promise(resolve => setTimeout(resolve, delay));
  }

  throw new Error('Scraping timed out after maximum attempts');
}

// Normalize query for consistent caching
export function normalizeQuery(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9\s]/g, '');
}

// Get cached results if fresh (within 1 hour)
export async function getCachedResults(normalizedQuery: string): Promise<RedditPost[] | null> {
  const hasSupabaseUrl = Boolean(
    process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  );
  const hasServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());

  if (!hasSupabaseUrl || !hasServiceRoleKey) {
    return null;
  }
  
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('reddit_scrapes')
    .select('results')
    .eq('search_query', normalizedQuery)
    .eq('status', 'completed')
    .gte('created_at', oneHourAgo)
    .order('created_at', { ascending: false })
    .limit(1);
    
  if (error || !data || data.length === 0 || !Array.isArray(data[0].results)) {
    return null;
  }
  
  return data[0].results as RedditPost[];
}

// Update scrape status with optional metadata
export async function updateScrapeStatus(
  scrapeId: string, 
  status: 'pending' | 'running' | 'completed' | 'failed',
  metadata?: { run_id?: string; error_message?: string }
): Promise<void> {
  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString()
  };
  
  if (metadata?.run_id) {
    updateData.run_id = metadata.run_id;
  }
  
  if (metadata?.error_message) {
    updateData.error_message = metadata.error_message;
  }
  
  if (status === 'completed') {
    updateData.completed_at = new Date().toISOString();
  }
  
  const supabase = getSupabaseServer();
  const { error } = await supabase
    .from('reddit_scrapes')
    .update(updateData)
    .eq('id', scrapeId);
    
  if (error) {
    throw new Error(`Failed to update scrape status: ${error.message}`);
  }
}

// Save results to Supabase (update existing record)
export async function saveResultsToSupabase(
  scrapeId: string,
  results: RedditPost[]
): Promise<void> {
  const supabase = getSupabaseServer();
  const { error } = await supabase
    .from('reddit_scrapes')
    .update({
      results,
      status: 'completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', scrapeId);

  if (error) {
    throw new Error(`Failed to save to Supabase: ${error.message}`);
  }
}
