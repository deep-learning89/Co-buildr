import type { SupabaseClient } from '@supabase/supabase-js';
import type { IntentType } from '@/types';
import {
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
  body?: string;
  text: string;
  subreddit: string;
  author: string;
  upvotes: number;
  link: string;
  created_at: string;
  data_type: TrudaxDataType;
  intent?: IntentType | null;
}

// Use a browser-like UA and include Reddit username for better API acceptance.
const REDDIT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 CoBuildr/1.0 (by /u/Aware_Ad_9345)';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type RedditPostChild = {
  data?: {
    id?: string;
    title?: string;
    selftext?: string;
    ups?: number;
    author?: string;
    num_comments?: number;
    url?: string;
    created_utc?: number;
    subreddit?: string;
    permalink?: string;
  };
};

function getSubredditFromInput(input: TrudaxRedditScraperInput): string {
  const source = input.searchCommunityName || input.searches?.[0] || '';
  const cleaned = source.replace(/^r\//i, '').trim().split(/\s+/)[0] ?? '';
  if (!cleaned) {
    throw new Error('Not found');
  }
  return cleaned;
}

async function fetchRedditJson(url: string): Promise<unknown> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': REDDIT_USER_AGENT,
        Accept: 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      cache: 'no-store',
    });

    if (response.status === 403 || response.status === 429) {
      throw new Error('Reddit rate limited, try again');
    }
    if (response.status === 404) {
      throw new Error('Not found');
    }
    if (!response.ok) {
      throw new Error(`Reddit request failed with status ${response.status}`);
    }

    return response.json();
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Reddit rate limited, try again' || error.message === 'Not found') {
        throw error;
      }
      throw new Error(`Reddit fetch failed: ${error.message}`);
    }
    throw new Error('Reddit fetch failed');
  }
}

async function fetchUserInfo(username: string): Promise<unknown> {
  return fetchRedditJson(
    `https://www.reddit.com/user/${encodeURIComponent(username)}/about.json`
  );
}

export async function runTrudaxRedditScraper(
  input: TrudaxRedditScraperInput
): Promise<TrudaxRedditOutputItem[]> {
  assertApifyConfig();

  const subreddit = getSubredditFromInput(input);
  const postsPayload = (await fetchRedditJson(
    `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/hot.json?limit=25`
  )) as { data?: { children?: RedditPostChild[] } };

  const children = postsPayload?.data?.children ?? [];
  if (!Array.isArray(children)) {
    return [];
  }

  const postItems: TrudaxPostItem[] = children
    .map((child) => child?.data)
    .filter((item): item is NonNullable<RedditPostChild['data']> => Boolean(item))
    .filter((item) => Boolean(item.title && item.author && typeof item.created_utc === 'number'))
    .map((item) => {
      const absoluteUrl = item.url?.startsWith('http')
        ? item.url
        : `https://www.reddit.com${item.permalink ?? ''}`;

      return {
        id: item.id || `${item.author}-${item.created_utc ?? Date.now()}`,
        parsedId: item.id || '',
        url: absoluteUrl || '',
        username: item.author || '',
        title: item.title || '',
        communityName: item.subreddit || subreddit,
        body: item.selftext || '',
        numberOfComments: Number(item.num_comments || 0),
        upVotes: Number(item.ups || 0),
        createdAt: new Date((item.created_utc || 0) * 1000).toISOString(),
        dataType: 'post' as const,
      };
    })
    .filter((item) => Boolean(item.title && item.username && item.url && item.createdAt));

  // Keeps parity with the requested public Reddit people endpoint without changing frontend contracts.
  if (input.searchUsers) {
    const usernames = [...new Set(postItems.map((post) => post.username).filter(Boolean))].slice(0, 25);
    for (const username of usernames) {
      try {
        // People mapping from Reddit user API (name, total_karma, icon_img, created_utc, is_gold).
        const about = (await fetchUserInfo(username)) as {
          data?: {
            name?: string;
            total_karma?: number;
            icon_img?: string;
            created_utc?: number;
            is_gold?: boolean;
          };
        };
        void about?.data;
      } catch {
        // User endpoint failures should not break post scraping flow.
      }

      // Small gap between calls to reduce burst-rate limits from Reddit.
      await delay(350);
    }
  }

  return postItems;
}

export async function pollTrudaxRun(_runId: string): Promise<TrudaxRedditOutputItem[]> {
  throw new Error('Not found');
}

export function mapTrudaxItemToInternalResult(item: TrudaxRedditOutputItem): InternalRedditResult {
  if (item.dataType === 'post') {
    return {
      id: item.id,
      title: item.title,
      body: item.body,
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
      body: item.body,
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
      body: '',
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
    body: item.description,
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
