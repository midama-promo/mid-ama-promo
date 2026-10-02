import 'dotenv/config';
import fs from 'fs';
import { Worker, MessageChannel, receiveMessageOnPort } from 'node:worker_threads';

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const remotePersistenceConfigured = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

const workerSource = `
import { parentPort } from 'node:worker_threads';
parentPort.on('message', async (msg) => {
  const out = msg.port || parentPort;
  try {
    const headers = { ...(msg.headers || {}) };
    let body = msg.body;
    if (msg.bodyBase64) {
      body = Buffer.from(msg.bodyBase64, 'base64');
    }
    const response = await fetch(msg.url, {
      method: msg.method || 'GET',
      headers,
      body: body === undefined || body === null ? undefined : body,
    });
    const buffer = Buffer.from(await response.arrayBuffer());
    out.postMessage({
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('content-type') || '',
      bodyBase64: buffer.toString('base64'),
    });
  } catch (error) {
    out.postMessage({ ok: false, status: 0, statusText: error?.message || String(error), contentType: '', bodyBase64: '' });
  }
});
`;

let sharedWorker: Worker | null = null;

function getSharedWorker(): Worker {
  if (!sharedWorker) {
    sharedWorker = new Worker(workerSource, { eval: true });
    sharedWorker.on('error', (err) => {
      console.error('[REMOTE WORKER ERROR]', err);
      try { sharedWorker?.terminate(); } catch (_) {}
      sharedWorker = null;
    });
    sharedWorker.on('exit', () => {
      sharedWorker = null;
    });
    sharedWorker.unref();
  }
  return sharedWorker;
}

function requestSync(url: string, options: { method?: string; headers?: Record<string, string>; body?: string | Buffer } = {}) {
  const { port1, port2 } = new MessageChannel();
  const worker = getSharedWorker();
  const body = options.body;
  worker.postMessage({
    url,
    method: options.method || 'GET',
    headers: options.headers || {},
    body: typeof body === 'string' ? body : undefined,
    bodyBase64: Buffer.isBuffer(body) ? body.toString('base64') : undefined,
    port: port2,
  }, [port2]);

  const deadline = Date.now() + 30000;
  let result: any = null;
  while (Date.now() < deadline) {
    const message = receiveMessageOnPort(port1);
    if (message) {
      result = message.message;
      break;
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5);
  }
  port1.close();
  if (!result) {
    try { sharedWorker?.terminate(); } catch (_) {}
    sharedWorker = null;
    throw new Error(`Remote persistence request timed out: ${url}`);
  }
  if (!result.ok) {
    const raw = Buffer.from(result.bodyBase64 || '', 'base64').toString('utf8');
    throw new Error(`Remote persistence request failed (${result.status}): ${raw || result.statusText}`);
  }
  const raw = Buffer.from(result.bodyBase64 || '', 'base64');
  return { ...result, raw, text: raw.toString('utf8') };
}

function authHeaders(extra: Record<string, string> = {}) {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    ...extra,
  };
}

export interface RemoteStateRecord {
  id: string;
  version: number;
  state: any;
  updated_at?: string;
}

export function remoteGetState(): RemoteStateRecord | null {
  if (!remotePersistenceConfigured) return null;
  const result = requestSync(`${SUPABASE_URL}/rest/v1/midama_state?id=eq.main&select=id,version,state,updated_at`, {
    headers: authHeaders({ Accept: 'application/json' }),
  });
  const rows = JSON.parse(result.text || '[]');
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

export function remoteInitializeState(state: any): RemoteStateRecord {
  if (!remotePersistenceConfigured) throw new Error('Supabase persistence is not configured.');
  const result = requestSync(`${SUPABASE_URL}/rest/v1/midama_state`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=representation' }),
    body: JSON.stringify({ id: 'main', version: 1, state }),
  });
  const rows = JSON.parse(result.text || '[]');
  if (!Array.isArray(rows) || !rows[0]) throw new Error('Supabase did not return the initialized state.');
  return rows[0];
}

export function remoteUpdateState(expectedVersion: number, state: any): RemoteStateRecord | null {
  if (!remotePersistenceConfigured) throw new Error('Supabase persistence is not configured.');

  // Strategy 1: Attempt the RPC function call
  try {
    const result = requestSync(`${SUPABASE_URL}/rest/v1/rpc/midama_update_state`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }),
      body: JSON.stringify({ expected_version: expectedVersion, next_state: state }),
    });
    const rows = JSON.parse(result.text || 'null');
    if (Array.isArray(rows) && rows[0]) {
      return rows[0];
    }
    if (Array.isArray(rows) && rows.length === 0) {
      // Empty array means version mismatch (concurrent update)
      return null;
    }
  } catch (rpcError: any) {
    // If the RPC failed (such as column ambiguity error 42702 or missing RPC definition),
    // use the native atomic conditional PATCH on the midama_state table.
    console.warn('[DB] RPC midama_update_state error, using atomic conditional PATCH fallback:', rpcError?.message || rpcError);
  }

  // Strategy 2: Native atomic PostgREST conditional PATCH
  // Equivalent to: UPDATE public.midama_state SET version = expectedVersion + 1, state = $1, updated_at = now() WHERE id = 'main' AND version = expectedVersion RETURNING *;
  try {
    const patchResult = requestSync(
      `${SUPABASE_URL}/rest/v1/midama_state?id=eq.main&version=eq.${expectedVersion}`,
      {
        method: 'PATCH',
        headers: authHeaders({
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
          Accept: 'application/json',
        }),
        body: JSON.stringify({
          version: expectedVersion + 1,
          state,
          updated_at: new Date().toISOString(),
        }),
      }
    );
    const patchRows = JSON.parse(patchResult.text || '[]');
    return Array.isArray(patchRows) && patchRows[0] ? patchRows[0] : null;
  } catch (patchError: any) {
    console.error('[DB] Atomic conditional PATCH failed:', patchError?.message || patchError);
    throw patchError;
  }
}

export function remoteUploadFile(localPath: string, objectPath: string, contentType: string): void {
  if (!remotePersistenceConfigured) throw new Error('Supabase persistence is not configured.');
  const data = fs.readFileSync(localPath);
  requestSync(`${SUPABASE_URL}/storage/v1/object/midama-assets/${objectPath.split('/').map(encodeURIComponent).join('/')}`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': contentType || 'application/octet-stream', 'x-upsert': 'true' }),
    body: data,
  });
}

export function remoteSignedUrl(objectPath: string, expiresInSeconds = 300): string {
  if (!remotePersistenceConfigured) throw new Error('Supabase persistence is not configured.');
  const result = requestSync(`${SUPABASE_URL}/storage/v1/object/sign/midama-assets/${objectPath.split('/').map(encodeURIComponent).join('/')}`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }),
    body: JSON.stringify({ expiresIn: expiresInSeconds }),
  });
  const data = JSON.parse(result.text || '{}');
  const signed = data.signedURL || data.signedUrl || data.path;
  if (!signed) throw new Error('Supabase did not return a signed asset URL.');
  return signed.startsWith('http') ? signed : `${SUPABASE_URL}/storage/v1${signed}`;
}

export function remoteEnsureBucket(): void {
  if (!remotePersistenceConfigured) return;
  try {
    requestSync(`${SUPABASE_URL}/storage/v1/bucket`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }),
      body: JSON.stringify({ id: 'midama-assets', name: 'midama-assets', public: false }),
    });
  } catch (error: any) {
    if (!String(error?.message || '').includes('already exists')) {
      console.warn('[REMOTE STORAGE] Bucket check/create:', error?.message || error);
    }
  }
}

export interface SupabaseAuthUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, any>;
}

export function remoteCreateAuthUser(email: string, password: string, userMetadata: Record<string, any> = {}): SupabaseAuthUser {
  if (!remotePersistenceConfigured) throw new Error('Supabase persistence is not configured.');
  const result = requestSync(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }),
    body: JSON.stringify({ email: email.trim().toLowerCase(), password, email_confirm: true, user_metadata: userMetadata }),
  });
  const user = JSON.parse(result.text || '{}');
  if (!user?.id) throw new Error('Supabase Auth did not return a user ID.');
  return user;
}

export function remoteUpdateAuthUser(authUserId: string, patch: Record<string, any>): SupabaseAuthUser {
  if (!remotePersistenceConfigured) throw new Error('Supabase persistence is not configured.');
  const result = requestSync(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(authUserId)}`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }),
    body: JSON.stringify(patch),
  });
  const user = JSON.parse(result.text || '{}');
  if (!user?.id) throw new Error('Supabase Auth did not return the updated user.');
  return user;
}

export function remoteFindAuthUserByEmail(email: string): SupabaseAuthUser | null {
  if (!remotePersistenceConfigured) return null;
  const target = email.trim().toLowerCase();
  for (let page = 1; page <= 20; page++) {
    const result = requestSync(`${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=100`, { headers: authHeaders({ Accept: 'application/json' }) });
    const payload = JSON.parse(result.text || '{}');
    const users = Array.isArray(payload?.users) ? payload.users : [];
    const found = users.find((u: any) => String(u.email || '').toLowerCase() === target);
    if (found) return found;
    if (users.length < 100) break;
  }
  return null;
}

export function remoteCheckDatabase(): boolean {
  if (!remotePersistenceConfigured) return false;
  try {
    const result = requestSync(`${SUPABASE_URL}/rest/v1/midama_state?id=eq.main&select=id,version`, {
      headers: authHeaders({ Accept: 'application/json' }),
    });
    return Boolean(result && result.ok);
  } catch (_) {
    return false;
  }
}

export function remoteCheckStorage(): boolean {
  if (!remotePersistenceConfigured) return false;
  try {
    const result = requestSync(`${SUPABASE_URL}/storage/v1/bucket/midama-assets`, {
      headers: authHeaders({ Accept: 'application/json' }),
    });
    return Boolean(result && result.ok);
  } catch (_) {
    return false;
  }
}

export function remoteCheckAuth(): boolean {
  if (!remotePersistenceConfigured) return false;
  try {
    const result = requestSync(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1`, {
      headers: authHeaders({ Accept: 'application/json' }),
    });
    return Boolean(result && result.ok);
  } catch (_) {
    return false;
  }
}

export function remoteObjectPathFromStoredName(storedName: string): string {
  return storedName.replace(/^remote:/, '');
}

export function encodeRemoteAssetPath(objectPath: string): string {
  return Buffer.from(objectPath, 'utf8').toString('base64url');
}

export function decodeRemoteAssetPath(encoded: string): string {
  return Buffer.from(encoded, 'base64url').toString('utf8');
}
