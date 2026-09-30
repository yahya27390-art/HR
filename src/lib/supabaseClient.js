/**
 * supabaseClient.js
 * ============================================================================
 * Single, authoritative Supabase client for the entire application.
 * 
 * SECURITY:
 * - Uses the PUBLIC anon key (safe for browser)
 * - All data access is protected by Row Level Security (RLS) in PostgreSQL
 * - Service-role key is NEVER used in frontend code
 * - Auth session is managed by Supabase SDK (httpOnly cookies where supported)
 * 
 * USAGE:
 * import { supabase } from '@/lib/supabaseClient';
 * ============================================================================
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
  || 'https://omnvdvmmmarwsobadlsb.supabase.co';

const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
  || 'sb_publishable_nUzUqD6WBgXey6SRU76zUA_Q5mlC1B5';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('[supabaseClient] VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Persist session in localStorage (standard SPA behavior)
    // The session token is a JWT; the identity authority is Supabase, not localStorage
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Flow: PKCE for security (default in supabase-js v2)
    flowType: 'pkce',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

/**
 * Convenience: get current authenticated Supabase user.
 * Returns null if not authenticated.
 */
export async function getAuthUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) return null;
  return user;
}

/**
 * Convenience: get current Supabase session.
 * Returns null if no active session.
 */
export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) return null;
  return session;
}

export default supabase;
