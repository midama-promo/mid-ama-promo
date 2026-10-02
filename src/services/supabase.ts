import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Configuration from build-time Vite define or runtime import.meta.env
const DEFAULT_URL = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const DEFAULT_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

let clientInstance: SupabaseClient | null = null;
let initPromise: Promise<SupabaseClient> | null = null;

export async function getSupabaseClient(): Promise<SupabaseClient> {
  if (clientInstance) return clientInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    let url = DEFAULT_URL;
    let key = DEFAULT_KEY;

    if (!url || !key) {
      try {
        const res = await fetch('/api/auth/config', { cache: 'no-store' });
        if (res.ok) {
          const config = await res.json();
          url = (config.supabaseUrl || '').trim();
          key = (config.supabaseAnonKey || '').trim();
        }
      } catch (_) {
        // Fallback below
      }
    }

    clientInstance = createClient(
      url || 'https://placeholder.supabase.co',
      key || 'placeholder-anon-key',
      {
        auth: {
          persistSession: false,     // Requirement 7: Do NOT store tokens in localStorage
          autoRefreshToken: false,
          detectSessionInUrl: false, // Requirement 8: Do NOT put/read tokens into URLs
        },
      }
    );

    return clientInstance;
  })();

  return initPromise;
}

/**
 * Proxy object exposing standard `supabase.auth` methods so callers can invoke
 * `supabase.auth.signInWithOtp` and `supabase.auth.verifyOtp` transparently.
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (prop === 'auth') {
      return {
        signInWithOtp: async (params: Parameters<SupabaseClient['auth']['signInWithOtp']>[0]) => {
          const client = await getSupabaseClient();
          return client.auth.signInWithOtp(params);
        },
        verifyOtp: async (params: Parameters<SupabaseClient['auth']['verifyOtp']>[0]) => {
          const client = await getSupabaseClient();
          return client.auth.verifyOtp(params);
        },
        signOut: async () => {
          const client = await getSupabaseClient();
          return client.auth.signOut();
        },
        getSession: async () => {
          const client = await getSupabaseClient();
          return client.auth.getSession();
        },
        getUser: async (jwt?: string) => {
          const client = await getSupabaseClient();
          return client.auth.getUser(jwt);
        },
      };
    }
    if (clientInstance && prop in clientInstance) {
      const val = (clientInstance as any)[prop];
      return typeof val === 'function' ? val.bind(clientInstance) : val;
    }
    return undefined;
  },
});
