// import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

// let supabaseClientInstance: SupabaseClient | null = null;
let supabaseClientInstance: ReturnType<typeof createBrowserClient> | null = null;

function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
}

function getSupabaseAnonKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || '';
}

// export function getSupabaseClient(): SupabaseClient {
//   if (!supabaseClientInstance) {
//     const supabaseUrl = getSupabaseUrl();
//     const supabaseAnonKey = getSupabaseAnonKey();

//     if (!supabaseUrl || !supabaseAnonKey) {
//       throw new Error(
//         'Supabase client keys are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
//       );
//     }
export function getSupabaseClient() {
  if (!supabaseClientInstance) {
    const supabaseUrl = getSupabaseUrl();
    const supabaseAnonKey = getSupabaseAnonKey();

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        'Supabase client keys are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
      );
    }
    // supabaseClientInstance = createClient(supabaseUrl, supabaseAnonKey);
    supabaseClientInstance = createBrowserClient(supabaseUrl, supabaseAnonKey);

  }

  return supabaseClientInstance;
}
