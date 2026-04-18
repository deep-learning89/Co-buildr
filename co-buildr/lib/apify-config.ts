// Recommended Apify Actor: practicaltools/apify-reddit-api
// Apify API paths use "owner~actor-name" format for actor references.

export const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN || '';

function normalizeActorRef(actorRef: string): string {
  return actorRef.trim().replace('/', '~');
}

export const REDDIT_SCRAPER_ACTOR_ID = normalizeActorRef(
  process.env.REDDIT_SCRAPER_ACTOR_ID || 'practicaltools/apify-reddit-api'
);

export function assertApifyConfig(): void {
  if (!APIFY_API_TOKEN) {
    throw new Error('APIFY_API_TOKEN is missing. Add it to your environment variables.');
  }

  if (!REDDIT_SCRAPER_ACTOR_ID.includes('~')) {
    throw new Error(
      'REDDIT_SCRAPER_ACTOR_ID must be in "owner~actor-name" format or "owner/actor-name".'
    );
  }
}
