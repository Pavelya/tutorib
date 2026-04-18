import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getServerEnv } from '@/lib/env/server';

let _cached: SupabaseClient | undefined;

/**
 * Service-role Supabase client for privileged server-side operations
 * (e.g. Storage uploads from Server Actions). Never import from client code.
 */
export function createSupabaseAdmin(): SupabaseClient {
  if (_cached) return _cached;
  const env = getServerEnv();
  _cached = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _cached;
}
