import { NextRequest, NextResponse } from 'next/server';
import {
  assertApifyConfig,
  buildTrudaxRedditScraperConfig,
  TRUDAX_REDDIT_SCRAPER_ACTOR_ID,
} from '@/apify/configs';
import { assertSupabaseServerConfig, getSupabaseServer } from '@/lib/supabase-server';
import { 
  runTrudaxRedditScraper,
  mapTrudaxItemToInternalResult,
  normalizeQuery,
  getCachedResults,
  saveResultsToSupabase,
  updateScrapeStatus
} from '@/apify/helpers';

export const maxDuration = 60;

type ScrapeInput = {
  query: string;
  mode?: 'posts' | 'people';
  subreddit?: string;
};

// Main API route
export async function POST(request: NextRequest) {
  let body: ScrapeInput | null = null;
  let scrapeId: string | null = null;
  let supabase: ReturnType<typeof getSupabaseServer> | null = null;
  
  try {
    assertApifyConfig();
    assertSupabaseServerConfig();

    body = await request.json();
    
    if (!body?.query) {
      return NextResponse.json(
        { success: false, status: 'failed', error: 'Query is required' },
        { status: 400 }
      );
    }

    supabase = getSupabaseServer();

    const normalizedQuery = normalizeQuery(body.query);
    const mode = body.mode === 'people' ? 'people' : 'posts';
    const cacheKey = `${mode}:${normalizedQuery}`;
    
    // Check for cached results first
    const cachedResults = await getCachedResults(cacheKey, supabase);
    if (cachedResults) {
      return NextResponse.json({
        success: true,
        status: 'completed',
        results: cachedResults,
        count: cachedResults.length,
        source: 'cache',
        mode,
        error: null
      });
    }

    // Create scrape record with proper lifecycle
    const { data: scrapeRecord, error: insertError } = await supabase
      .from('reddit_scrapes')
      .insert({
        search_query: cacheKey,
        original_query: body.query,
        actor_id: TRUDAX_REDDIT_SCRAPER_ACTOR_ID,
        status: 'running',
        results: null,
      })
      .select('id')
      .single();

    if (insertError || !scrapeRecord?.id) {
      const insertMessage = insertError
        ? `Failed to start scraping: ${insertError.message}`
        : 'Failed to start scraping: insert returned no record id';
      console.error('Failed to create reddit_scrapes row:', insertError);
      return NextResponse.json(
        { success: false, status: 'failed', error: insertMessage },
        { status: 500 }
      );
    }

    scrapeId = scrapeRecord.id;

    // Run scraper
    const actorInput = buildTrudaxRedditScraperConfig({
      searches: [body.query],
      searchCommunityName: mode !== 'people' ? body.subreddit : undefined,
      searchPosts: true,
      searchComments: false,
      searchCommunities: mode === 'people',
      searchUsers: mode === 'people',
      maxItems: mode === 'people' ? 60 : 50,
      maxPostCount: mode === 'people' ? 60 : 50,
      maxComments: 50,
      sort: 'new',
      time: 'all',
    });

    const rawResults = await runTrudaxRedditScraper(actorInput);
    
    // Save results and update status
    if (scrapeId) {
      await updateScrapeStatus(scrapeId, 'completed', supabase);
    }

    const mappedResults = rawResults.map((item) => mapTrudaxItemToInternalResult(item));
    await saveResultsToSupabase(mappedResults, supabase);

    return NextResponse.json({
      success: true,
      status: 'completed',
      results: mappedResults,
      count: mappedResults.length,
      source: 'fresh',
      mode,
      error: null
    });

  } catch (error) {
    console.error('Scraping error:', error);
    
    // Update status to failed if we have a scrape ID
    if (scrapeId) {
      try {
        if (supabase) {
          await updateScrapeStatus(scrapeId, 'failed', supabase);
        }
      } catch (statusError) {
        console.error('Failed to persist failed status:', statusError);
      }
    }

    return NextResponse.json({
      success: false,
      status: 'failed',
      results: [],
      count: 0,
      source: 'fresh',
      mode: body?.mode === 'people' ? 'people' : 'posts',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
