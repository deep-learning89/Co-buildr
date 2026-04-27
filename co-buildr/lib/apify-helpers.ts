import { APIFY_API_TOKEN, REDDIT_SCRAPER_ACTOR_ID } from './apify-config';
import type { InternalRedditResult, SpryWholemealPostOutput } from '@/lib/reddit';
import type { SupabaseClient } from '@supabase/supabase-js';
import { groqClient } from '@/lib/groq-client';

if (!APIFY_API_TOKEN) {
  throw new Error('APIFY_API_TOKEN is not configured');
}

// === SMART QUERY GENERATOR ===
export async function generateSmartQueries(userQuery: string): Promise<string[]> {
  try {
    if (!groqClient) throw new Error('Groq not available');

    const response = await groqClient.chat.completions.create({
      model: 'llama3-8b-8192',
      max_tokens: 150,
      messages: [
        {
          role: 'system',
          content: 'You are a Reddit search expert. Return ONLY a JSON array of 5 short keyword search queries (2-4 words each). Make them specific and popular Reddit-style. For business/startup topics always include variations with: "how to", "best", "tips", community-style phrases. No explanation. No markdown. No extra text.'
        },
        {
          role: 'user',
          content: `Convert this into 5 Reddit search queries a real user would type:
"${userQuery}"

Examples for "saas": ["build saas startup", "saas founder tips", "saas product launch", "indie saas maker", "saas side project"]
Examples for "cofounder": ["find cofounder startup", "looking for cofounder", "cofounder equity split", "solo founder vs cofounder", "how to find cofounder"]
Examples for "nextjs": ["nextjs project ideas", "nextjs best practices", "learning nextjs tips", "nextjs vs remix", "nextjs side project"]

Return format: ["query1", "query2", "query3", "query4", "query5"]`
        }
      ]
    });

    const text = response.choices[0]?.message?.content?.trim() || '';
    // Strip any markdown fences just in case
    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    throw new Error('Invalid response');
  } catch {
    // Fallback: build meaningful queries from the raw input
    const q = userQuery.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    const words = q.split(' ').filter(w => w.length > 2);
    return [
      q,
      `${q} tips`,
      `${q} startup`,
      `how to ${q}`,
      words.length > 1 ? words.slice(0, 2).join(' ') : `${q} reddit`
    ].filter(Boolean).slice(0, 5);
  }
}

// === MULTI-QUERY SCRAPER (plain fetch, no apify-client) ===
export async function runApifyScraper(searchQuery: string) {
  console.log('🔍 Apify token available:', !!APIFY_API_TOKEN);

  const smartQueries = await generateSmartQueries(searchQuery);
  console.log('🔍 Smart queries:', smartQueries);

  const response = await fetch(
    `https://api.apify.com/v2/acts/${REDDIT_SCRAPER_ACTOR_ID}/runs?token=${APIFY_API_TOKEN}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'search',
        search: {
          queries: smartQueries,
          maxPostsPerQuery: 15,
          sort: 'relevance'
        },
        proxyConfiguration: { useApifyProxy: false }
      })
    }
  );

  const run = await response.json();

  if (!run?.data?.id) {
    console.error('❌ Apify run failed to start. Full response:', JSON.stringify(run));
    throw new Error(`Invalid run response: ${JSON.stringify(run)}`);
  }

  const runId = run.data.id;
  const datasetId = run.data.defaultDatasetId;
  console.log('🔍 Apify run started:', runId);

  // Poll until finished (max 45s to stay under Vercel 60s limit)
  let status = 'RUNNING';
  let attempts = 0;
  while ((status === 'RUNNING' || status === 'READY') && attempts < 9) {
    await new Promise(r => setTimeout(r, 5000));
    attempts++;

    const statusRes = await fetch(
      `https://api.apify.com/v2/runs/${runId}?token=${APIFY_API_TOKEN}`
    );
    const statusData = await statusRes.json();
    status = statusData.data?.status || 'FAILED';
    console.log(`🔍 Apify status [${attempts}]:`, status);
  }

  const datasetRes = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_API_TOKEN}`
  );
  const items = await datasetRes.json();

  // Deduplicate by permalink
  const seen = new Set<string>();
  const uniqueItems = (Array.isArray(items) ? items : []).filter((item: SpryWholemealPostOutput) => {
    if (!item.permalink || seen.has(item.permalink)) return false;
    seen.add(item.permalink);
    return true;
  });

  console.log(`✅ Total: ${Array.isArray(items) ? items.length : 0}, Unique: ${uniqueItems.length}`);
  return { runId, items: uniqueItems };
}

export function mapApifyItemToInternalResult(item: SpryWholemealPostOutput): InternalRedditResult {
  const subreddit = item.permalink?.split('/r/')?.[1]?.split('/')?.[0] || '';
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

  if (userId) query = query.eq('user_id', userId);

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data || !Array.isArray(data.results)) return null;
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
    user_id: userId,
    completed_at: new Date().toISOString()
  });

  if (error) throw new Error(`Failed to save results: ${error.message}`);
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

  if (error) throw new Error(`Failed to update scrape status: ${error.message}`);
}