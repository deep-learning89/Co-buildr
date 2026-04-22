import { ApifyClient } from 'apify-client';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  APIFY_API_TOKEN,
  TRUDAX_REDDIT_SCRAPER_ACTOR_ID,
  assertApifyConfig,
  type TrudaxRedditScraperInput,
} from '@/apify/configs';

type TrudaxDataType = 'post' | 'comment' | 'user' | 'community';

export interface TrudaxPostItem {
  id: string;
  parsedId: string;
  url: string;
  username: string;
  title: string;
  communityName: string;
  body: string;
  numberOfComments: number;
  upVotes: number;
  createdAt: string;
  dataType: 'post';
}

export interface TrudaxCommentItem {
  id: string;
  url: string;
  parentId: string;
  username: string;
  communityName: string;
  body: string;
  upVotes: number;
  createdAt: string;
  dataType: 'comment';
}

export interface TrudaxUserItem {
  id: string;
  url: string;
  username: string;
  postKarma: number;
  commentKarma: number;
  userIcon: string;
  createdAt: string;
  dataType: 'user';
}

export interface TrudaxCommunityItem {
  id: string;
  url: string;
  name: string;
  title: string;
  numberOfMembers: number;
  description: string;
  createdAt: string;
  dataType: 'community';
}

export type TrudaxRedditOutputItem =
  | TrudaxPostItem
  | TrudaxCommentItem
  | TrudaxUserItem
  | TrudaxCommunityItem;

export interface InternalRedditResult {
  id: string;
  title: string;
  text: string;
  subreddit: string;
  author: string;
  upvotes: number;
  link: string;
  created_at: string;
  data_type: TrudaxDataType;
}

function createApifyClient(): ApifyClient {
  assertApifyConfig();
  return new ApifyClient({ token: APIFY_API_TOKEN });
}

export async function runTrudaxRedditScraper(
  input: TrudaxRedditScraperInput
): Promise<TrudaxRedditOutputItem[]> {
  const client = createApifyClient();
  const run = await client.actor(TRUDAX_REDDIT_SCRAPER_ACTOR_ID).call(input);

  if (!run.defaultDatasetId) {
    throw new Error('Actor run finished without defaultDatasetId.');
  }

  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  return items as unknown as TrudaxRedditOutputItem[];
}

export async function pollTrudaxRun(runId: string): Promise<TrudaxRedditOutputItem[]> {
  const client = createApifyClient();

  for (let i = 0; i < 60; i += 1) {
    const run = await client.run(runId).get();

    if (!run) {
      throw new Error(`Run not found for id: ${runId}`);
    }

    if (run.status === 'SUCCEEDED') {
      if (!run.defaultDatasetId) {
        throw new Error('Run succeeded without defaultDatasetId.');
      }
      const { items } = await client.dataset(run.defaultDatasetId).listItems();
      return items as unknown as TrudaxRedditOutputItem[];
    }

    if (run.status === 'FAILED' || run.status === 'ABORTED' || run.status === 'TIMED-OUT') {
      throw new Error(`Run ${runId} ended with status ${run.status}.`);
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  throw new Error(`Run ${runId} polling timeout.`);
}

export function mapTrudaxItemToInternalResult(item: TrudaxRedditOutputItem): InternalRedditResult {
  if (item.dataType === 'post') {
    return {
      id: item.id,
      title: item.title,
      text: item.body,
      subreddit: item.communityName,
      author: item.username,
      upvotes: item.upVotes,
      link: item.url,
      created_at: item.createdAt,
      data_type: item.dataType,
    };
  }

  if (item.dataType === 'comment') {
    return {
      id: item.id,
      title: '',
      text: item.body,
      subreddit: item.communityName,
      author: item.username,
      upvotes: item.upVotes,
      link: item.url,
      created_at: item.createdAt,
      data_type: item.dataType,
    };
  }

  if (item.dataType === 'user') {
    return {
      id: item.id,
      title: item.username,
      text: '',
      subreddit: '',
      author: item.username,
      upvotes: item.postKarma + item.commentKarma,
      link: item.url,
      created_at: item.createdAt,
      data_type: item.dataType,
    };
  }

  return {
    id: item.id,
    title: item.title,
    text: item.description,
    subreddit: item.name,
    author: '',
    upvotes: item.numberOfMembers,
    link: item.url,
    created_at: item.createdAt,
    data_type: item.dataType,
  };
}

export function normalizeQuery(q: string): string {
  return q.trim().toLowerCase();
}

export async function getCachedResults(
  query: string,
  supabase: SupabaseClient
): Promise<InternalRedditResult[] | null> {
  const { data, error } = await supabase
    .from('reddit_scrapes')
    .select('results')
    .eq('search_query', query)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data || !Array.isArray(data.results)) {
    return null;
  }

  return data.results as InternalRedditResult[];
}

export async function saveResultsToSupabase(
  results: InternalRedditResult[],
  supabase: SupabaseClient
): Promise<void> {
  // TODO: If `reddit_scrapes` requires linking results to a job row id, add a foreign key input here.
  const { error } = await supabase.from('reddit_scrapes').insert({
    status: 'completed',
    results,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Failed to save results: ${error.message}`);
  }
}

export async function updateScrapeStatus(
  id: string,
  status: 'pending' | 'running' | 'completed' | 'failed',
  supabase: SupabaseClient
): Promise<void> {
  const { error } = await supabase
    .from('reddit_scrapes')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to update scrape status: ${error.message}`);
  }
}
