import Link from 'next/link';
import PricingSection from '@/components/PricingSection';

export default function PricingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <header className="relative z-10 px-4 pt-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between rounded-full border border-white/10 bg-zinc-900/90 px-6 py-3 shadow-lg shadow-black/40">
          <div className="flex items-center gap-1">
            <span className="text-xl font-bold text-amber-500">co-</span>
            <span className="text-xl font-bold text-white">buildr</span>
          </div>
          <Link
            href="/search"
            className="rounded-full bg-amber-500 px-5 py-2.5 font-medium text-white transition-all hover:bg-amber-600 hover:shadow-lg hover:shadow-amber-500/25"
          >
            Back to Search
          </Link>
        </div>
      </header>

      <div className="relative z-10">
        <PricingSection />
      </div>
    </main>
  );
}
