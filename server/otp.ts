import 'dotenv/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '';
// On the server, prefer anon key if configured, or use service role key server-side.
// The service role key is NEVER sent to or shared with the client.
const SERVER_AUTH_KEY = SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SERVER_AUTH_KEY);
}

let serverClient: SupabaseClient | null = null;

function getServerClient(): SupabaseClient {
  if (!SUPABASE_URL || !SERVER_AUTH_KEY) {
    throw new Error('Supabase email OTP is not configured.');
  }
  if (!serverClient) {
    serverClient = createClient(SUPABASE_URL, SERVER_AUTH_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return serverClient;
}

/**
 * Request an email OTP using Supabase Auth signInWithOtp with shouldCreateUser: false.
 * Only pre-existing registered users will be sent an OTP code.
 */
export async function requestEmailOtp(email: string, shouldCreateUser = false): Promise<void> {
  const client = getServerClient();
  const { error } = await client.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: {
      shouldCreateUser,
    },
  });

  if (error) {
    throw new Error(`Supabase Auth request failed: ${error.message}`);
  }
}

/**
 * Verify an email OTP token using Supabase Auth verifyOtp.
 */
export async function verifyEmailOtp(
  email: string,
  token: string
): Promise<{ access_token: string; user?: { id?: string; email?: string } }> {
  const client = getServerClient();
  const { data, error } = await client.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: token.trim(),
    type: 'email',
  });

  if (error || !data?.session?.access_token) {
    throw new Error(error?.message || 'OTP verification failed.');
  }

  return {
    access_token: data.session.access_token,
    user: {
      id: data.user?.id,
      email: data.user?.email,
    },
  };
}

/**
 * Validate a Supabase access token (JWT) server-side and return the verified Supabase user.
 */
export async function verifyAccessToken(
  accessToken: string
): Promise<{ id: string; email?: string } | null> {
  if (!isSupabaseConfigured() || !accessToken) return null;
  try {
    const client = getServerClient();
    const { data, error } = await client.auth.getUser(accessToken.trim());
    if (error || !data?.user) return null;
    return {
      id: data.user.id,
      email: data.user.email,
    };
  } catch (_) {
    return null;
  }
}
