import { NextRequest, NextResponse } from 'next/server';
import { assertApifyConfig, REDDIT_SCRAPER_ACTOR_ID } from '@/lib/apify-config';
import { assertSupabaseServerConfig, getSupabaseServer } from '@/lib/supabase-server';
import { 
  runApifyScraper, 
  pollApifyRun, 
  normalizeQuery,
  getCachedResults,
  saveResultsToSupabase,
  updateScrapeStatus,
  ScrapeInput
} from '@/lib/apify-helpers';

// Main API route
export async function POST(request: NextRequest) {
  let body: ScrapeInput | null = null;
  let scrapeId: string | null = null;
  
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

    const normalizedQuery = normalizeQuery(body.query);
    const mode = body.mode === 'people' ? 'people' : 'posts';
    const cacheKey = `${mode}:${normalizedQuery}`;
    
    // Check for cached results first
    const cachedResults = await getCachedResults(cacheKey);
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
    const supabase = getSupabaseServer();
    const { data: scrapeRecord, error: insertError } = await supabase
      .from('reddit_scrapes')
      .insert({
        search_query: cacheKey,
        original_query: body.query,
        actor_id: REDDIT_SCRAPER_ACTOR_ID,
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
    const runId = await runApifyScraper({
      query: normalizedQuery,
      maxPosts: body.maxPosts || 30,
      sort: body.sort || 'hot',
      mode,
    });
    
    // Update status with run ID
    if (scrapeId) {
      await updateScrapeStatus(scrapeId, 'running', { run_id: runId });
    }
    
    // Poll for results
    const results = await pollApifyRun(runId);
    
    // Save results and update status
    if (scrapeId) {
      await saveResultsToSupabase(scrapeId, results);
    }

    return NextResponse.json({
      success: true,
      status: 'completed',
      results,
      count: results.length,
      source: 'fresh',
      mode,
      error: null
    });

  } catch (error) {
    console.error('Scraping error:', error);
    
    // Update status to failed if we have a scrape ID
    if (scrapeId) {
      try {
        await updateScrapeStatus(scrapeId, 'failed', {
          error_message: error instanceof Error ? error.message : 'Unknown error'
        });
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
