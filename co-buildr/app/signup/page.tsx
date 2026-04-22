'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase-client';

export default function SignupPage() {
  const router = useRouter();
  const [nextPath] = useState(() => {
    if (typeof window === 'undefined') return '/search';
    const params = new URLSearchParams(window.location.search);
    return params.get('next') || '/search';
  });
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      const supabase = getSupabaseClient();
      const { error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (authError) throw authError;
      setSuccess('Account created. Redirecting...');
      router.push(nextPath.startsWith('/') ? nextPath : '/search');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create account right now.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 py-10">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <section className="relative mx-auto w-full max-w-lg rounded-3xl bg-zinc-900/50 p-px ring-1 ring-white/20 backdrop-blur-xl shadow-2xl shadow-black/70">
        <div className="pointer-events-none absolute inset-0 rounded-3xl border border-amber-500/20" />
        <div className="relative rounded-3xl bg-zinc-950/70">
          <header className="px-6 pt-6 sm:px-8 sm:pt-8">
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 ring-2 ring-white/20 shadow-lg shadow-amber-500/30">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 50 39"
                  className="inline-block h-8 w-8 text-white"
                  aria-hidden="true"
                >
                  <path fill="currentColor" d="M16.5 2h21.08L22.083 24.973H1L16.5 2Z" />
                  <path
                    fill="currentColor"
                    d="M17.422 27.102 11.42 36h22.082L49 13.027H32.702l-9.496 14.075h-5.784Z"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-extrabold text-white">Create account</h1>
              <p className="mt-1 text-sm text-gray-300">Sign up and start finding the right people</p>
            </div>
          </header>

          <form className="space-y-6 p-6 sm:p-8" onSubmit={handleSubmit}>
            <div className="relative flex flex-col gap-6 rounded-2xl border border-white/15 bg-zinc-900/70 p-6 shadow-xl shadow-black/50">
              <div className="relative space-y-2">
                <label htmlFor="name" className="block text-sm font-medium text-gray-200">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Enter your full name"
                  className="block w-full rounded-lg border border-white/15 bg-black/40 px-4 py-3 text-sm font-medium text-white placeholder-gray-500 shadow-md shadow-black/30 outline-none transition focus:border-amber-500/70 focus:ring-2 focus:ring-amber-500/30"
                />
              </div>

              <div className="relative space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-200">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter your email"
                  className="block w-full rounded-lg border border-white/15 bg-black/40 px-4 py-3 text-sm font-medium text-white placeholder-gray-500 shadow-md shadow-black/30 outline-none transition focus:border-amber-500/70 focus:ring-2 focus:ring-amber-500/30"
                />
              </div>

              <div className="relative space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-gray-200">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Create a password"
                  className="block w-full rounded-lg border border-white/15 bg-black/40 px-4 py-3 text-sm font-medium text-white placeholder-gray-500 shadow-md shadow-black/30 outline-none transition focus:border-amber-500/70 focus:ring-2 focus:ring-amber-500/30"
                />
              </div>
            </div>
            {error && <p className="text-center text-sm text-red-400">{error}</p>}
            {success && <p className="text-center text-sm text-emerald-400">{success}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-amber-500 bg-amber-500 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-amber-500/25 transition hover:border-amber-600 hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            >
              {submitting ? 'Creating Account...' : 'Sign Up'}
            </button>

            <div className="text-center text-sm text-gray-300">
              Already have an account?{' '}
              <Link
                href="/login"
                className="font-medium text-amber-400 underline decoration-amber-500 underline-offset-2 transition hover:text-amber-300"
              >
                Sign in
              </Link>
            </div>

            <div className="text-center">
              <Link
                href="/search"
                className="inline-flex rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white transition hover:border-white/40 hover:bg-white/5"
              >
                Back to Search
              </Link>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
