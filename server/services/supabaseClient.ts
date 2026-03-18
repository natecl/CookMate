import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function getEnvVars() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !serviceRoleKey || !anonKey) {
    throw new Error('Missing required Supabase environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY');
  }
  return { url, serviceRoleKey, anonKey };
}

let _supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    const { url, serviceRoleKey } = getEnvVars();
    _supabaseAdmin = createClient(url, serviceRoleKey);
  }
  return _supabaseAdmin;
}

/** @deprecated Use getSupabaseAdmin() instead */
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabaseAdmin() as any)[prop];
  },
});

export const createSupabaseClient = (accessToken: string): SupabaseClient => {
  const { url, anonKey } = getEnvVars();
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
};
