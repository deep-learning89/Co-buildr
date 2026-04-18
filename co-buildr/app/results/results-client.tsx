'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  ArrowUp,
  ExternalLink,
  FileText,
  Loader2,
  Search,
  UserRound,
  Users,
} from 'lucide-react';

type SearchMode = 'posts' | 'people';

interface RedditPost {
  title: string;
  text: string;
  subreddit: string;
  author: string;
  upvotes: number;
  link: string;
  tags?: string[];
}

interface PersonResult {
  username: string;
  estimatedKarma: number;
  subreddits: string[];
  activityCount: number;
  profileUrl: string;
}

interface ScrapeResponse {
  success: boolean;
  status: 'pending' | 'running' | 'completed' | 'failed';
  results?: RedditPost[];
  count?: number;
  source?: 'cache' | 'fresh';
  mode?: SearchMode;
  error?: string | null;
}

function buildPeopleResults(posts: RedditPost[]): PersonResult[] {
  const people = new Map<
    string,
    { estimatedKarma: number; subreddits: Set<string>; activityCount: number }
  >();

  for (const post of posts) {
    const username = post.author?.trim();
    if (!username) continue;

    if (!people.has(username)) {
      people.set(username, {
        estimatedKarma: 0,
        subreddits: new Set(),
        activityCount: 0,
      });
    }

    const person = people.get(username);
    if (!person) continue;
    person.estimatedKarma += Number(post.upvotes) || 0;
    if (post.subreddit) person.subreddits.add(post.subreddit);
    person.activityCount += 1;
  }

  return [...people.entries()]
    .map(([username, value]) => ({
      username,
      estimatedKarma: value.estimatedKarma,
      subreddits: [...value.subreddits].slice(0, 4),
      activityCount: value.activityCount,
      profileUrl: `https://www.reddit.com/user/${encodeURIComponent(username)}`,
    }))
    .sort((a, b) => b.estimatedKarma - a.estimatedKarma || b.activityCount - a.activityCount);
}

export default function ResultsClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';
  const modeParam = searchParams.get('mode');
  const mode: SearchMode = modeParam === 'people' ? 'people' : 'posts';

  const [results, setResults] = useState<RedditPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'cache' | 'fresh' | null>(null);

  const peopleResults = useMemo(() => buildPeopleResults(results), [results]);

  useEffect(() => {
    if (!query) {
      router.push('/');
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      setError(null);
      setSource(null);

      try {
        const response = await fetch('/api/scrape', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: query.trim(),
            mode,
            maxPosts: mode === 'people' ? 60 : 30,
            sort: 'hot',
          }),
        });

        const data: ScrapeResponse = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Search failed');
        }

        setResults(data.results || []);
        setSource(data.source || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred while searching');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query, mode, router]);

  if (!query) return null;

  const switchMode = (target: SearchMode) => {
    router.push(`/results?q=${encodeURIComponent(query)}&mode=${target}`);
  };

  const resultsCount = mode === 'people' ? peopleResults.length : results.length;

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="h-1 bg-gradient-to-r from-amber-400 to-amber-500" />

      <div className="px-4 py-4 sm:px-6">
        <header className="mx-auto flex max-w-6xl items-center justify-between rounded-full border border-gray-100 bg-white px-6 py-3 shadow-sm">
          <div className="flex items-center gap-1">
            <span className="text-xl font-bold text-amber-500">co-</span>
            <span className="text-xl font-bold text-gray-900">buildr</span>
          </div>
          <button
            type="button"
            onClick={() => router.push('/search')}
            className="rounded-full bg-amber-500 px-5 py-2 font-medium text-white transition-all duration-200 hover:bg-amber-600 hover:shadow-md"
          >
            Start Scraping
          </button>
        </header>
      </div>

      <main
        className={`mx-auto px-4 py-6 ${mode === 'people' ? 'max-w-6xl' : 'max-w-4xl'}`}
      >
        <button
          type="button"
          onClick={() => router.push('/search')}
          className="mb-6 inline-flex items-center gap-2 text-gray-600 transition-colors hover:text-gray-800"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Search</span>
        </button>

        <div className={`mb-6 w-full ${mode === 'people' ? 'max-w-3xl' : ''}`}>
          <div className="flex items-center rounded-full border border-gray-200 bg-white px-5 py-3 shadow-lg shadow-gray-200/50 transition-all duration-300 hover:shadow-xl hover:shadow-gray-200/60">
            <Search className="mr-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={query}
              readOnly
              className="flex-1 text-base text-gray-700 outline-none placeholder-gray-400"
            />
            <button
              type="button"
              onClick={() => router.push('/search')}
              className="ml-2 rounded-full bg-amber-500 px-6 py-2.5 font-medium text-white transition-all duration-200 hover:bg-amber-600 hover:shadow-md"
            >
              Search
            </button>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => switchMode('people')}
              className={`flex items-center gap-2 rounded-full px-5 py-2.5 transition-all duration-200 ${
                mode === 'people'
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-200 hover:bg-amber-600'
                  : 'border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Users className="h-5 w-5" />
              <span>People</span>
            </button>
            <button
              type="button"
              onClick={() => switchMode('posts')}
              className={`flex items-center gap-2 rounded-full px-5 py-2.5 transition-all duration-200 ${
                mode === 'posts'
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-200 hover:bg-amber-600'
                  : 'border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <FileText className="h-5 w-5" />
              <span>Posts</span>
            </button>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>
              {resultsCount} results for &quot;{query}&quot;
            </span>
            {source && (
              <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                {source === 'cache' ? 'From cache' : 'Fresh scrape'}
              </span>
            )}
          </div>
        </div>

        <div className="mb-8 border-t border-gray-200" />

        {loading && (
          <div className="py-20 text-center">
            <div className="inline-flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
              <span className="text-lg text-gray-600">Searching Reddit for matches...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="py-20 text-center">
            <div className="inline-flex flex-col items-center gap-3 text-red-600">
              <AlertCircle className="h-8 w-8" />
              <span className="text-lg">{error}</span>
            </div>
          </div>
        )}

        {!loading && !error && results.length > 0 && (
          <>
            {mode === 'posts' ? (
              <div className="flex flex-col gap-5">
                {results.map((post, index) => (
                  <article
                    key={`${post.link}-${index}`}
                    className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-gray-200/50"
                  >
                    <div className="flex gap-5">
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-amber-50 shadow-sm transition-shadow duration-300 group-hover:shadow-md">
                        <FileText className="h-6 w-6 text-amber-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="mb-2 text-lg font-semibold leading-tight text-gray-900 transition-colors group-hover:text-amber-600">
                          {post.title}
                        </h3>
                        <p className="mb-3 text-sm">
                          <span className="font-medium text-amber-500">r/{post.subreddit}</span>
                          <span className="mx-2 text-gray-300">|</span>
                          <span className="text-amber-500">u/{post.author}</span>
                        </p>
                        {post.text ? (
                          <p className="mb-5 line-clamp-2 text-sm leading-relaxed text-gray-500">
                            {post.text}
                          </p>
                        ) : (
                          <p className="mb-5 text-sm leading-relaxed text-gray-400">
                            No preview text available.
                          </p>
                        )}

                        <div className="flex items-center justify-between border-t border-gray-100 pt-4 text-sm">
                          <div className="flex items-center gap-6">
                            <span className="flex items-center gap-1.5 font-semibold text-amber-500">
                              <ArrowUp className="h-5 w-5" />
                              {post.upvotes}
                            </span>
                            {post.tags && post.tags.length > 0 && (
                              <span className="line-clamp-1 text-xs text-gray-400">
                                {post.tags.slice(0, 3).join(', ')}
                              </span>
                            )}
                          </div>
                          <a
                            href={post.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-amber-50 hover:text-amber-500"
                          >
                            <ExternalLink className="h-5 w-5" />
                            <span className="sr-only">Open post</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {peopleResults.map((person) => (
                  <article
                    key={person.username}
                    className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-gray-200/50"
                  >
                    <div className="mb-4 flex items-start gap-4">
                      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-amber-50 shadow-sm transition-shadow duration-300 group-hover:shadow-md">
                        <UserRound className="h-7 w-7 text-amber-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-semibold text-gray-900 transition-colors group-hover:text-amber-600">
                          u/{person.username}
                        </h3>
                        <p className="text-sm font-medium text-amber-500">
                          {person.estimatedKarma.toLocaleString()} karma
                        </p>
                      </div>
                    </div>

                    <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-gray-500">
                      Active Reddit user with {person.activityCount} matched posts in communities
                      related to your search.
                    </p>

                    <div className="mb-5 flex flex-wrap gap-2">
                      {person.subreddits.length > 0 ? (
                        person.subreddits.map((subreddit) => (
                          <span
                            key={subreddit}
                            className="cursor-default rounded-full border border-gray-100 bg-gray-50 px-3 py-1.5 text-xs text-gray-600 transition-colors hover:border-amber-100 hover:bg-amber-50 hover:text-amber-600"
                          >
                            r/{subreddit}
                          </span>
                        ))
                      ) : (
                        <span className="rounded-full border border-gray-100 bg-gray-50 px-3 py-1.5 text-xs text-gray-600">
                          No subreddit data
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between border-t border-gray-100 pt-4 text-xs">
                      <span className="text-gray-400">Activity count: {person.activityCount}</span>
                      <a
                        href={person.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-amber-50 hover:text-amber-500"
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span className="sr-only">Open profile</span>
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}

        {!loading && !error && results.length === 0 && (
          <div className="py-20 text-center">
            <div className="text-gray-600">
              <Search className="mx-auto mb-6 h-16 w-16 text-gray-300" />
              <h2 className="mb-3 text-2xl font-semibold text-gray-900">
                No results found for &quot;{query}&quot;
              </h2>
              <p className="mx-auto max-w-md text-lg text-gray-600">
                Try different keywords, switch mode, or check spelling.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
