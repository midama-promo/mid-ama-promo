import 'dotenv/config';
import fs from 'fs';
import { createHash, createHmac } from 'node:crypto';
import { Worker, MessageChannel, receiveMessageOnPort } from 'node:worker_threads';

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_ENDPOINT = R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : '';
const R2_REGION = 'auto';

export const remoteStorageConfigured = Boolean(R2_ACCOUNT_ID && R2_BUCKET_NAME && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);
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

function sha256(value: string | Buffer): string { return createHash('sha256').update(value).digest('hex'); }
function hmac(key: Buffer | string, value: string, encoding?: 'hex' | 'base64' | 'base64url' | 'latin1'): any {
  const result = createHmac('sha256', key).update(value);
  return encoding ? result.digest(encoding) : result.digest();
}
function awsEncode(value: string): string { return encodeURIComponent(value).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`); }
function r2ObjectUrl(objectPath: string): URL {
  if (!remoteStorageConfigured) throw new Error('Cloudflare R2 is not configured. Set R2_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY.');
  const key = objectPath.split('/').map(awsEncode).join('/');
  return new URL(`${R2_ENDPOINT}/${awsEncode(R2_BUCKET_NAME)}/${key}`);
}
function signingKey(dateStamp: string): Buffer {
  const kDate = hmac(`AWS4${R2_SECRET_ACCESS_KEY}`, dateStamp);
  const kRegion = hmac(kDate, R2_REGION);
  const kService = hmac(kRegion, 's3');
  return hmac(kService, 'aws4_request');
}
function r2Authorization(method: string, url: URL, headers: Record<string, string>, payloadHash: string): Record<string, string> {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const normalized = Object.fromEntries(Object.entries(headers).map(([k,v]) => [k.toLowerCase(), String(v).trim().replace(/\s+/g, ' ')]));
  normalized.host = url.host;
  normalized['x-amz-content-sha256'] = payloadHash;
  normalized['x-amz-date'] = amzDate;
  const signedHeaders = Object.keys(normalized).sort().join(';');
  const canonicalHeaders = Object.keys(normalized).sort().map(k => `${k}:${normalized[k]}\n`).join('');
  const canonicalRequest = [method, url.pathname, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const scope = `${dateStamp}/${R2_REGION}/s3/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonicalRequest)].join('\n');
  const signature = hmac(signingKey(dateStamp), stringToSign, 'hex');
  return { ...headers, 'x-amz-content-sha256': payloadHash, 'x-amz-date': amzDate, Authorization: `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}` };
}

export function remoteUploadFile(localPath: string, objectPath: string, contentType: string): void {
  if (!remoteStorageConfigured) throw new Error('Cloudflare R2 is not configured.');
  const data = fs.readFileSync(localPath);
  const url = r2ObjectUrl(objectPath);
  const headers = r2Authorization('PUT', url, { 'Content-Type': contentType || 'application/octet-stream' }, sha256(data));
  requestSync(url.toString(), { method: 'PUT', headers, body: data });
}

export function remoteSignedUrl(objectPath: string, expiresInSeconds = 300): string {
  if (!remoteStorageConfigured) throw new Error('Cloudflare R2 is not configured.');
  const url = r2ObjectUrl(objectPath);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const scope = `${dateStamp}/${R2_REGION}/s3/aws4_request`;
  const params: Record<string, string> = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${R2_ACCESS_KEY_ID}/${scope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(Math.max(1, Math.min(604800, expiresInSeconds))),
    'X-Amz-SignedHeaders': 'host',
  };
  const canonicalQuery = Object.keys(params).sort().map(k => `${awsEncode(k)}=${awsEncode(params[k])}`).join('&');
  const canonicalRequest = ['GET', url.pathname, canonicalQuery, `host:${url.host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonicalRequest)].join('\n');
  params['X-Amz-Signature'] = hmac(signingKey(dateStamp), stringToSign, 'hex');
  const finalQuery = Object.keys(params).sort().map(k => `${awsEncode(k)}=${awsEncode(params[k])}`).join('&');
  return `${url.origin}${url.pathname}?${finalQuery}`;
}

export function remoteEnsureBucket(): void {
  if (!remoteStorageConfigured) {
    console.warn('[R2 STORAGE] R2 is not configured; uploads will not be persisted remotely.');
    return;
  }
  try {
    const url = new URL(`${R2_ENDPOINT}/${awsEncode(R2_BUCKET_NAME)}`);
    const headers = r2Authorization('HEAD', url, {}, sha256(''));
    requestSync(url.toString(), { method: 'HEAD', headers });
    console.log(`[R2 STORAGE] Connected to bucket ${R2_BUCKET_NAME}.`);
  } catch (error: any) {
    console.error('[R2 STORAGE] Bucket connectivity check failed:', error?.message || error);
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

export function remoteDeleteAuthUser(authUserId: string): void {
  if (!remotePersistenceConfigured) return;
  requestSync(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(authUserId)}`, {
    method: 'DELETE',
    headers: authHeaders({ Accept: 'application/json' }),
  });
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
  if (!remoteStorageConfigured) return false;
  try {
    const url = new URL(`${R2_ENDPOINT}/${awsEncode(R2_BUCKET_NAME)}`);
    const headers = r2Authorization('HEAD', url, {}, sha256(''));
    requestSync(url.toString(), { method: 'HEAD', headers });
    return true;
  } catch (_) { return false; }
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
  return storedName.replace(/^(?:remote:|r2:)/, '');
}

export function isR2StoredName(storedName: string): boolean { return storedName.startsWith('r2:'); }

export function remoteSignedUrlForStoredName(storedName: string, expiresInSeconds = 300): string {
  const objectPath = remoteObjectPathFromStoredName(storedName);
  if (isR2StoredName(storedName)) return remoteSignedUrl(objectPath, expiresInSeconds);
  if (!remotePersistenceConfigured) throw new Error('Legacy Supabase Storage is unavailable until the bucket restriction is lifted.');
  const result = requestSync(`${SUPABASE_URL}/storage/v1/object/sign/midama-assets/${objectPath.split('/').map(encodeURIComponent).join('/')}`, { method: 'POST', headers: authHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }), body: JSON.stringify({ expiresIn: expiresInSeconds }) });
  const data = JSON.parse(result.text || '{}'); const signed = data.signedURL || data.signedUrl || data.path;
  if (!signed) throw new Error('Supabase did not return a signed asset URL.');
  return signed.startsWith('http') ? signed : `${SUPABASE_URL}/storage/v1${signed}`;
}

export function encodeRemoteAssetPath(objectPath: string): string {
  return Buffer.from(objectPath, 'utf8').toString('base64url');
}

export function decodeRemoteAssetPath(encoded: string): string {
  return Buffer.from(encoded, 'base64url').toString('utf8');
}
