'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Clock3,
  Database,
  FileText,
  Link2,
  Search,
  ShieldCheck,
  Users,
  WalletCards,
} from 'lucide-react';

type SearchMode = 'posts' | 'people';

const featureCards = [
  {
    title: 'Fast Scraping',
    description:
      "Powered by Apify's reliable infrastructure for quick and efficient Reddit data extraction.",
    icon: Search,
  },
  {
    title: 'Smart Caching',
    description: 'Automatic caching system prevents duplicate requests and improves response times.',
    icon: Database,
  },
  {
    title: 'Real-time Results',
    description: 'Get up-to-date Reddit posts with comprehensive filtering and sorting options.',
    icon: Clock3,
  },
];

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<SearchMode>('posts');
  const [loading, setLoading] = useState(false);

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    setLoading(true);
    router.push(`/results?q=${encodeURIComponent(trimmedQuery)}&mode=${mode}`);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gray-50/50">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(0,0,0,0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0,0,0,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      <header className="relative z-10 px-4 pt-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between rounded-full border border-gray-100 bg-white px-6 py-3 shadow-lg shadow-gray-200/50">
          <div className="flex items-center gap-1">
            <span className="text-xl font-bold text-amber-500">co-</span>
            <span className="text-xl font-bold text-gray-900">buildr</span>
          </div>
          <button
            type="submit"
            form="search-form"
            disabled={loading || !query.trim()}
            className="rounded-full bg-amber-500 px-5 py-2.5 font-medium text-white transition-all hover:bg-amber-600 hover:shadow-lg hover:shadow-amber-500/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Start Scraping'}
          </button>
        </div>
      </header>

      <main className="relative z-10 flex flex-col items-center justify-center px-4 pb-12 pt-16">
        <div className="mb-8 flex items-center gap-4">
          <div className="flex -space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-amber-400 to-amber-600 text-xs font-medium text-white">
              JD
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-gray-600 to-gray-800 text-xs font-medium text-white">
              AK
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-amber-500 to-orange-600 text-xs font-medium text-white">
              MR
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-gray-700 to-gray-900 text-xs font-medium text-white">
              SK
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, index) => (
                <svg
                  key={index}
                  className="h-4 w-4 fill-current text-amber-400"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-sm text-gray-600">
              <span className="font-semibold text-amber-600">12,500+</span> Searches Made
            </span>
          </div>
        </div>

        <h1 className="mb-2 text-center text-4xl font-bold tracking-tight text-gray-900 md:text-5xl lg:text-6xl">
          What are you looking for?
        </h1>
        <p className="mb-10 max-w-xl text-center text-lg text-gray-500 md:text-xl">
          Search Reddit for posts or discover people in any community,
          <span className="italic text-amber-600"> instantly.</span>
        </p>

        <form id="search-form" onSubmit={handleSearch} className="mb-6 w-full max-w-2xl">
          <div className="flex items-center rounded-2xl border border-gray-100 bg-white px-5 py-3 shadow-xl shadow-gray-200/80 transition-shadow hover:shadow-2xl hover:shadow-gray-200">
            <div className="mr-3 flex items-center gap-3 text-gray-400">
              <Link2 className="h-5 w-5" />
              <Search className="h-5 w-5" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={
                mode === 'people'
                  ? 'Find people to connect with on Reddit...'
                  : 'Search Reddit posts...'
              }
              className="flex-1 bg-transparent text-lg text-gray-700 placeholder-gray-400 outline-none"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="ml-3 flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-semibold text-white transition-all hover:bg-amber-600 hover:shadow-lg hover:shadow-amber-500/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Search'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>

        <div className="mb-8 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMode('people')}
            className={`flex items-center gap-2 rounded-full px-6 py-2.5 shadow-sm transition-all ${
              mode === 'people'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25 hover:bg-amber-600 hover:shadow-lg hover:shadow-amber-500/30'
                : 'border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Users className="h-5 w-5" />
            <span className="font-medium">People</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('posts')}
            className={`flex items-center gap-2 rounded-full px-6 py-2.5 shadow-sm transition-all ${
              mode === 'posts'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25 hover:bg-amber-600 hover:shadow-lg hover:shadow-amber-500/30'
                : 'border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <FileText className="h-5 w-5" />
            <span className="font-medium">Posts</span>
          </button>
        </div>

        <section className="mb-10 w-full max-w-6xl">
          <div className="grid gap-5 md:grid-cols-3">
            {featureCards.map((card) => {
              const Icon = card.icon;
              return (
                <article
                  key={card.title}
                  className="group rounded-2xl border border-gray-100 bg-white p-6 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-gray-200/50"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-amber-50 shadow-sm transition-shadow duration-300 group-hover:shadow-md">
                    <Icon className="h-5 w-5 text-amber-500" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-gray-900 transition-colors group-hover:text-amber-600">
                    {card.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-600">{card.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        <div className="flex items-center gap-6 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <WalletCards className="h-4 w-4" />
            <span>No card required</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            <span>Your data is safe</span>
          </div>
        </div>
      </main>
    </div>
  );
}
