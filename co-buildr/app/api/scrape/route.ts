import { NextRequest, NextResponse } from 'next/server';
import { assertSupabaseServerConfig, getSupabaseServer } from '@/lib/supabase-server';
import { classifyBatchIntents } from '@/lib/intent-classifier';
import { 
  runApifyScraper,
  mapApifyItemToInternalResult,
  normalizeQuery,
  getCachedResults,
  saveResultsToSupabase,
  updateScrapeStatus,
} from '@/lib/apify-helpers';
import type { SpryWholemealPostOutput } from '@/lib/reddit';

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
  let cacheKey = '';
  
  console.log('🔍 API SCRAPE: Request received');
  
  try {
    console.log('🔍 Checking Supabase config...');
    assertSupabaseServerConfig();
    console.log('✅ Supabase config OK');

    // CRITICAL SECURITY: Check authentication before proceeding
    const authSupabase = getSupabaseServer();
    const authHeader = request.headers.get('authorization');
    let token = authHeader?.replace('Bearer ', '');
    
    // Also check for session cookie as fallback
    if (!token) {
      const cookies = request.headers.get('cookie') || '';
      const sessionMatch = cookies.match(/sb-access-token=([^;]+)/);
      token = sessionMatch ? decodeURIComponent(sessionMatch[1]) : undefined;
    }

    if (!token) {
      return NextResponse.json(
        { success: false, status: 'failed', error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Validate the token with Supabase
    console.log('🔍 Validating auth token...');
    const { data: { user }, error: authError } = await authSupabase.auth.getUser(token);
    if (authError || !user) {
      console.log('❌ Auth failed:', authError?.message);
      return NextResponse.json(
        { success: false, status: 'failed', error: 'Invalid authentication' },
        { status: 401 }
      );
    }
    console.log('✅ Auth OK, user:', user.id);

    body = await request.json();
    
    if (!body?.query) {
      return NextResponse.json(
        { success: false, status: 'failed', error: 'Query is required' },
        { status: 400 }
      );
    }

    // CRITICAL SECURITY: Input validation to prevent prompt injection
    const query = body.query.trim();
    
    // Length limits
    if (query.length < 2 || query.length > 200) {
      return NextResponse.json(
        { success: false, status: 'failed', error: 'Query must be between 2 and 200 characters' },
        { status: 400 }
      );
    }

    // Block suspicious patterns that could be used for prompt injection
    const blockedPatterns = [
      /ignore\s+previous\s+instructions/i,
      /system\s*:/i,
      /assistant\s*:/i,
      /user\s*:/i,
      /\{.*\}/,
      /\[.*\]/,
      /```/,
      /javascript:/i,
      /data:/i,
      /vbscript:/i,
      /on\w+\s*=/i,
      /<script/i,
      /<\/script>/i,
    ];

    for (const pattern of blockedPatterns) {
      if (pattern.test(query)) {
        return NextResponse.json(
          { success: false, status: 'failed', error: 'Invalid query format' },
          { status: 400 }
        );
      }
    }

    supabase = getSupabaseServer();

    const normalizedQuery = normalizeQuery(body.query);
    const mode = body.mode === 'people' ? 'people' : 'posts';
    // SECURITY: Include user ID in cache key to prevent data leakage between users
    cacheKey = `${user.id}:${mode}:${normalizedQuery}`;
    
    // Check for cached results first
    const cachedResults = await getCachedResults(cacheKey, supabase, user.id);
    if (cachedResults) {
      // For cached results, add AI fields if they don't exist
      const enrichedCachedResults = cachedResults.map(result => ({
        ...result,
        aiSummary: result.aiSummary ?? 'No summary available',
        intent: result.intent ?? 'discussion',
        relevanceScore: result.relevanceScore ?? 3,
      }));
      
      // If mode is 'people', we need to build people results from cached posts
      if (mode === 'people') {
        // Build people map from cached posts
        const peopleMap = new Map<string, {
          username: string;
          estimatedKarma: number;
          subreddits: Set<string>;
          activityCount: number;
          profileUrl: string;
          aiSummary?: string;
        }>();

        for (const post of enrichedCachedResults) {
          const username = post.author?.trim();
          if (!username) continue;

          if (!peopleMap.has(username)) {
            peopleMap.set(username, {
              username,
              estimatedKarma: 0,
              subreddits: new Set(),
              activityCount: 0,
              profileUrl: `https://www.reddit.com/user/${encodeURIComponent(username)}`,
              aiSummary: post.aiSummary
            });
          }

          const person = peopleMap.get(username)!;
          person.estimatedKarma += Number(post.upvotes) || 0;
          if (post.subreddit) person.subreddits.add(post.subreddit);
          person.activityCount += 1;
        }

        const peopleResults = Array.from(peopleMap.values()).map(person => ({
          ...person,
          subreddits: Array.from(person.subreddits).slice(0, 4),
          aiSummary: person.aiSummary ?? 'No summary available'
        }));

        return NextResponse.json({
          success: true,
          status: 'completed',
          results: peopleResults,
          count: peopleResults.length,
          source: 'cache',
          mode: 'people',
          error: null
        });
      }
      
      return NextResponse.json({
        success: true,
        status: 'completed',
        results: enrichedCachedResults,
        count: enrichedCachedResults.length,
        source: 'cache',
        mode,
        error: null
      });
    }

    // Update status to running with upsert to ensure row exists
    await supabase.from('reddit_scrapes').upsert({
      search_query: cacheKey,
      original_query: body.query,
      actor_id: 'spry_wholemeal/reddit-scraper',
      run_id: 'pending',
      status: 'running',
      user_id: null,
      results: []
    }, { onConflict: 'search_query' });

    // Run scraper using new spry_wholemeal/reddit-scraper
    console.log('🔍 Starting Apify scraper for query:', body.query);
    const { runId, items } = await runApifyScraper(body.query);
    if (!items || items.length === 0) {
  return NextResponse.json({
    success: true,
    status: 'completed',
    results: [],
    count: 0,
    source: 'fresh',
    mode,
    error: null,
    message: 'No Reddit posts found. Try different keywords.'
  });
}
    scrapeId = runId;
    console.log('✅ Apify scraper completed, runId:', runId, 'items:', items.length);

    // Map items to internal result format
    const scrapedData = (items as unknown as SpryWholemealPostOutput[]).map(mapApifyItemToInternalResult);
    
    // Prepare posts for batch classification
    const posts = scrapedData.map((p) => ({
      id: p.id,
      text: `${p.title} ${p.body}`.trim()
    }));

    const analysis = await classifyBatchIntents(normalizedQuery, posts);

    const enrichedData = scrapedData.map((p) => {
      const analysisResult = analysis.find(a => a.id === p.id);
      return {
        ...p,
        aiSummary: analysisResult?.summary ?? 'No summary available',
        intent: analysisResult?.intent ?? 'discussion',
        relevanceScore: analysisResult?.relevanceScore ?? 3,
      };
    });
    
    // If mode is 'people', build people results with AI summaries
    if (mode === 'people') {
      // Build people map from enriched posts
      const peopleMap = new Map<string, {
        username: string;
        estimatedKarma: number;
        subreddits: Set<string>;
        activityCount: number;
        profileUrl: string;
        posts: typeof enrichedData;
      }>();

      for (const post of enrichedData) {
        const username = post.author?.trim();
        if (!username) continue;

        if (!peopleMap.has(username)) {
          peopleMap.set(username, {
            username,
            estimatedKarma: 0,
            subreddits: new Set(),
            activityCount: 0,
            profileUrl: `https://www.reddit.com/user/${encodeURIComponent(username)}`,
            posts: []
          });
        }

        const person = peopleMap.get(username)!;
        person.estimatedKarma += Number(post.upvotes) || 0;
        if (post.subreddit) person.subreddits.add(post.subreddit);
        person.activityCount += 1;
        person.posts.push(post);
      }

      // Generate AI summaries for people by sending their aggregated posts to Groq
      const peopleData = Array.from(peopleMap.values());
      const peopleAnalysisPromises = peopleData.map(async (person) => {
        // Create aggregated text from person's posts
        const aggregatedText = person.posts
          .slice(0, 3) // Limit to top 3 posts to avoid token limits
          .map(p => `${p.title} ${p.body}`.trim())
          .join('\n\n');

        // Send to classifyBatchIntents for AI summary generation
        const mockPosts = [{
          id: `person_${person.username}`,
          text: aggregatedText
        }];

        const analysis = await classifyBatchIntents(normalizedQuery, mockPosts);
        const analysisResult = analysis[0];

        return {
          username: person.username,
          estimatedKarma: person.estimatedKarma,
          subreddits: Array.from(person.subreddits).slice(0, 4),
          activityCount: person.activityCount,
          profileUrl: person.profileUrl,
          aiSummary: analysisResult?.summary ?? 'No summary available'
        };
      });

      const peopleResults = await Promise.all(peopleAnalysisPromises);
      
      // Console log the first enriched person to confirm aiSummary field exists
      console.log('FIRST PERSON CHECK:', JSON.stringify(peopleResults[0], null, 2));
      
      // Save results to Supabase with user ownership
      await saveResultsToSupabase(supabase, cacheKey, body.query, runId, items as unknown as SpryWholemealPostOutput[], user.id);
      
      // Update status to completed
      await updateScrapeStatus(supabase, cacheKey, 'completed');

      return NextResponse.json({
        success: true,
        status: 'completed',
        results: peopleResults,
        count: peopleResults.length,
        source: 'fresh',
        mode: 'people',
        error: null
      });
    }
    
    // Console log the first enriched post to confirm aiSummary field exists
    console.log('FIRST POST CHECK:', JSON.stringify(enrichedData[0], null, 2));
    
    // Save results to Supabase with user ownership
    await saveResultsToSupabase(supabase, cacheKey, body.query, runId, items as unknown as SpryWholemealPostOutput[], user.id);
    
    // Update status to completed with upsert
    await supabase.from('reddit_scrapes').upsert({
      search_query: cacheKey,
      original_query: body.query,
      actor_id: 'spry_wholemeal/reddit-scraper',
      run_id: runId,
      status: 'completed',
      user_id: null,
      results: enrichedData
    }, { onConflict: 'search_query' });

    return NextResponse.json({
      success: true,
      status: 'completed',
      results: enrichedData,
      count: enrichedData.length,
      source: 'fresh',
      mode,
      error: null
    });

  } catch (err) {
    console.error('❌ SCRAPE ERROR DETAILS:');
    console.error('Error type:', typeof err);
    console.error('Error message:', err instanceof Error ? err.message : String(err));
    console.error('Error stack:', err instanceof Error ? err.stack : 'No stack trace');
    console.error('Full error object:', err);
    
    // Update status to failed if we have a scrape ID
    if (scrapeId) {
      try {
        if (supabase) {
          await supabase.from('reddit_scrapes').upsert({
            search_query: cacheKey,
            original_query: body?.query || '',
            actor_id: 'spry_wholemeal/reddit-scraper',
            run_id: scrapeId,
            status: 'failed',
            user_id: null,
            error_message: err instanceof Error ? err.message : 'Unknown error',
            updated_at: new Date().toISOString()
          }, { onConflict: 'search_query' });
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
      error: 'An error occurred while processing your request',
    }, { status: 500 });
  }
}
