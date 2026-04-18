import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseServerInstance: SupabaseClient | null = null;

function getSupabaseUrl(): string {
  return process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
}

function getSupabaseServiceRoleKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';
}

export function assertSupabaseServerConfig(): void {
  if (!getSupabaseUrl()) {
    throw new Error(
      'SUPABASE_URL is missing. If needed for client usage, you can also set NEXT_PUBLIC_SUPABASE_URL.'
    );
  }

  if (!getSupabaseServiceRoleKey()) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing.');
  }
}

export function getSupabaseServer(): SupabaseClient {
  assertSupabaseServerConfig();
  const supabaseUrl = getSupabaseUrl();
  const supabaseServiceRoleKey = getSupabaseServiceRoleKey();

  if (!supabaseServerInstance) {
    supabaseServerInstance = createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }

  return supabaseServerInstance;
}
