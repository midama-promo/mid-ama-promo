import 'dotenv/config';
import fs from 'fs';
import crypto from 'node:crypto';
import { Worker, MessageChannel, receiveMessageOnPort } from 'node:worker_threads';

const DATABASE_URL = process.env.DATABASE_URL || '';
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_ENDPOINT = R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : '';
const R2_REGION = 'auto';

export const remoteStorageConfigured = Boolean(R2_ACCOUNT_ID && R2_BUCKET_NAME && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);
export const remotePersistenceConfigured = Boolean(DATABASE_URL);

// PostgreSQL runs in a worker so this legacy synchronous data layer can remain stable
// while all database operations execute against Neon using the native PostgreSQL protocol.
const pgWorkerSource = `
const { parentPort } = require('node:worker_threads');
const { Client } = require('pg');
let client;
let connecting;
let connected = false;
async function getClient() {
  if (client && connected) return client;
  if (!connecting) {
    connecting = (async () => {
      const nextClient = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: true }, connectionTimeoutMillis: 15000, statement_timeout: 30000 });
      await nextClient.connect();
      client = nextClient; connected = true;
      nextClient.on('error', (e) => { console.error('[NEON WORKER]', e.message); client = null; connected = false; connecting = null; });
      return nextClient;
    })();
  }
  try { return await connecting; } finally { connecting = null; }
}
parentPort.on('message', async (msg) => {
  const out = msg.port || parentPort;
  try {
    const db = await getClient();
    const result = await db.query(msg.sql, msg.params || []);
    out.postMessage({ ok: true, rows: result.rows, rowCount: result.rowCount });
  } catch (e) { out.postMessage({ ok: false, error: e.message || String(e), code: e.code }); }
});
`;
let pgWorker = null;
function getPgWorker() {
  if (!pgWorker) {
    pgWorker = new Worker(pgWorkerSource, { eval: true });
    pgWorker.on('error', e => { console.error('[NEON WORKER ERROR]', e); pgWorker = null; });
    pgWorker.on('exit', () => { pgWorker = null; });
    pgWorker.unref();
  }
  return pgWorker;
}
function pgQuery(sql, params = []) {
  if (!remotePersistenceConfigured) throw new Error('DATABASE_URL is not configured.');
  const { port1, port2 } = new MessageChannel();
  getPgWorker().postMessage({ sql, params, port: port2 }, [port2]);
  const deadline = Date.now() + 35000;
  let result = null;
  while (Date.now() < deadline) {
    const message = receiveMessageOnPort(port1);
    if (message) { result = message.message; break; }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5);
  }
  port1.close();
  if (!result) throw new Error('Neon database request timed out.');
  if (!result.ok) throw new Error(`Neon database error (${result.code || 'unknown'}): ${result.error}`);
  return result;
}

export interface RemoteStateRecord { id: string; version: number; state: any; updated_at?: string; }
export function remoteEnsureDatabase(): void {
  pgQuery(`CREATE TABLE IF NOT EXISTS midama_app_state (id text PRIMARY KEY, version bigint NOT NULL DEFAULT 1, state jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())`);
  pgQuery(`CREATE TABLE IF NOT EXISTS midama_email_otps (email text PRIMARY KEY, code_hash text NOT NULL, expires_at timestamptz NOT NULL, attempts integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now())`);
  console.log('[NEON] Application state and OTP tables are ready.');
}
export function remoteGetState(): RemoteStateRecord | null {
  const rows = pgQuery('SELECT id, version, state, updated_at FROM midama_app_state WHERE id=$1', ['main']).rows;
  return rows[0] || null;
}
export function remoteInitializeState(state: any): RemoteStateRecord {
  const rows = pgQuery(`INSERT INTO midama_app_state (id, version, state) VALUES ('main', 1, $1::jsonb) ON CONFLICT (id) DO NOTHING RETURNING id, version, state, updated_at`, [JSON.stringify(state)]).rows;
  return rows[0] || remoteGetState()!;
}
export function remoteUpdateState(expectedVersion: number, state: any): RemoteStateRecord | null {
  const rows = pgQuery('UPDATE midama_app_state SET version=version+1, state=$1::jsonb, updated_at=now() WHERE id=$2 AND version=$3 RETURNING id, version, state, updated_at', [JSON.stringify(state), 'main', expectedVersion]).rows;
  return rows[0] || null;
}
export function remoteStoreOtp(email: string, codeHash: string, expiresAt: Date): void {
  pgQuery(`INSERT INTO midama_email_otps(email,code_hash,expires_at,attempts,created_at) VALUES($1,$2,$3,0,now()) ON CONFLICT(email) DO UPDATE SET code_hash=EXCLUDED.code_hash, expires_at=EXCLUDED.expires_at, attempts=0, created_at=now()`, [email, codeHash, expiresAt.toISOString()]);
}
export function remoteConsumeOtp(email: string, codeHash: string): boolean {
  const consumed = pgQuery('DELETE FROM midama_email_otps WHERE email=$1 AND code_hash=$2 AND expires_at > now() AND attempts < 8 RETURNING email', [email, codeHash]).rows;
  if (consumed.length) return true;
  pgQuery('UPDATE midama_email_otps SET attempts=attempts+1 WHERE email=$1 AND expires_at > now() AND attempts < 8', [email]);
  pgQuery('DELETE FROM midama_email_otps WHERE email=$1 AND expires_at <= now()', [email]);
  return false;
}
export function remoteDeleteOtp(email: string): void { pgQuery('DELETE FROM midama_email_otps WHERE email=$1', [email]); }
export function remoteCheckDatabase(): boolean { try { pgQuery('SELECT 1'); return true; } catch (_) { return false; } }
export function remoteCheckStorage(): boolean {
  if (!remoteStorageConfigured) return false;
  try { const url = new URL(`${R2_ENDPOINT}/${awsEncode(R2_BUCKET_NAME)}`); const headers = r2Authorization('HEAD', url, {}, sha256('')); requestSync(url.toString(), { method: 'HEAD', headers }); return true; } catch (_) { return false; }
}
export function remoteCheckAuth(): boolean { return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM); }
const httpWorkerSource = `
const { parentPort } = require('node:worker_threads');
parentPort.on('message', async (msg) => {
  const out = msg.port || parentPort;
  try {
    const headers = { ...(msg.headers || {}) };
    const body = msg.bodyBase64 ? Buffer.from(msg.bodyBase64, 'base64') : msg.body;
    const response = await fetch(msg.url, { method: msg.method || 'GET', headers, body: body == null ? undefined : body });
    const buffer = Buffer.from(await response.arrayBuffer());
    out.postMessage({ ok: response.ok, status: response.status, statusText: response.statusText, bodyBase64: buffer.toString('base64') });
  } catch (e) { out.postMessage({ ok: false, status: 0, statusText: e.message || String(e), bodyBase64: '' }); }
});
`;
let httpWorker = null;
function requestSync(url, options = {}) {
  if (!httpWorker) { httpWorker = new Worker(httpWorkerSource, { eval: true }); httpWorker.on('error', e => { console.error('[HTTP WORKER]', e); httpWorker = null; }); httpWorker.on('exit', () => { httpWorker = null; }); httpWorker.unref(); }
  const { port1, port2 } = new MessageChannel();
  httpWorker.postMessage({ url, method: options.method || 'GET', headers: options.headers || {}, body: typeof options.body === 'string' ? options.body : undefined, bodyBase64: Buffer.isBuffer(options.body) ? options.body.toString('base64') : undefined, port: port2 }, [port2]);
  const deadline = Date.now() + 30000; let result = null;
  while (Date.now() < deadline) { const msg = receiveMessageOnPort(port1); if (msg) { result = msg.message; break; } Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5); }
  port1.close();
  if (!result) throw new Error(`Remote request timed out: ${url}`);
  if (!result.ok) throw new Error(`Remote request failed (${result.status}): ${Buffer.from(result.bodyBase64 || '', 'base64').toString('utf8') || result.statusText}`);
  const raw = Buffer.from(result.bodyBase64 || '', 'base64'); return { ...result, raw, text: raw.toString('utf8') };
}

function sha256(value: string | Buffer): string { return crypto.createHash('sha256').update(value).digest('hex'); }
function hmac(key: Buffer | string, value: string, encoding?: 'hex' | 'base64' | 'base64url' | 'latin1'): any {
  const result = crypto.createHmac('sha256', key).update(value);
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


export function remoteObjectPathFromStoredName(storedName: string): string { return storedName.replace(/^(?:remote:|r2:)/, ''); }
export function isR2StoredName(storedName: string): boolean { return storedName.startsWith('r2:'); }
export function remoteSignedUrlForStoredName(storedName: string, expiresInSeconds = 300): string {
  if (!isR2StoredName(storedName)) throw new Error('This is a legacy non-R2 asset. It must be separately migrated to Cloudflare R2 before it can be downloaded from this portal.');
  return remoteSignedUrl(remoteObjectPathFromStoredName(storedName), expiresInSeconds);
}
export function encodeRemoteAssetPath(objectPath: string): string { return Buffer.from(objectPath, 'utf8').toString('base64url'); }
export function decodeRemoteAssetPath(encoded: string): string { return Buffer.from(encoded, 'base64url').toString('utf8'); }
