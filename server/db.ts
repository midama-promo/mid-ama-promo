import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import {
  remotePersistenceConfigured,
  remoteGetState,
  remoteInitializeState,
  remoteUpdateState,
  remoteEnsureDatabase,
  remoteStorageConfigured,
  remoteCheckAuth,
} from './remote.ts';

export const isProduction = process.env.NODE_ENV === 'production' || (Boolean(process.env.K_SERVICE) && !process.env.K_SERVICE?.startsWith('ais-dev-'));

export interface User {
  id: string;
  email: string;
  name: string; // Artist or Label Name / Artist Name
  realFirstName?: string;
  realSurname?: string;
  artistName?: string;
  role: 'admin' | 'client';
  passwordHash: string;
  status: 'active' | 'pending_activation' | 'disabled';
  disabledReason?: string;
  inviteToken?: string;
  resetToken?: string;
  resetTokenExpiry?: string;
  createdAt: string;
  phone?: string;
  country?: string;
  lastLoginAt?: string;
  planId?: 'free' | 'starter' | 'pro'; // 'pro' retained only for legacy records; treated as Premium
  artistLibrary?: ArtistCredit[];
  planExpiresAt?: string | null;
  lastPaymentReference?: string;
  planActivatedAt?: string | null;
}

export interface ArtistCredit {
  id?: string;
  name: string;
  role?: 'primary' | 'featured';
  spotifyProfileUrl?: string;
  appleMusicProfileUrl?: string;
  spotifyProfileCreateRequested?: boolean;
  appleMusicProfileCreateRequested?: boolean;
}

export interface TrackItem {
  id: string;
  trackNumber: number;
  title: string;
  version?: string;
  filename: string;
  storedFilename?: string;
  fileUrl: string;
  fileSize: number;
  duration?: number;
  isrc?: string;
  explicit?: boolean;
  // Per-song artist metadata
  primaryArtist?: string;
  primaryArtistSpotifyUrl?: string;
  primaryArtistAppleMusicUrl?: string;
  featuredArtists?: string[];
  artistProfiles?: ArtistCredit[];
}

export type ReleaseStatus =
  | 'Pending Review'
  | 'Approved'
  | 'Completed'
  | 'Denied'
  | 'Corrections Required'
  | 'Takedown Requested'
  | 'Takedown Processing'
  | 'Takedown Completed';

export interface ReleaseDocumentItem {
  id: string;
  title: string;
  filename: string;
  storedFilename?: string;
  fileUrl: string;
  fileSize: number;
  uploadedAt: string;
}

export interface PreSaveLink {
  id: string;
  label: string;
  url: string;
}

export interface Release {
  royaltyAmount?: number;
  id: string;
  userId: string;
  userEmail: string;
  artistLabelName: string;
  refNumber: string; // e.g. MAP-2026-XXXX
  title: string;
  releaseType: 'Single' | 'EP' | 'Album';
  primaryArtists: string[];
  featuredArtists: string[];
  primaryArtistProfiles?: ArtistCredit[];
  featuredArtistProfiles?: ArtistCredit[];
  artistProfiles?: ArtistCredit[];
  genre: string;
  subGenre?: string;
  language?: string;
  composers?: string[];
  producers?: string[];
  targetReleaseDate: string;
  previouslyReleased: boolean;
  previousReleaseDetails?: string;
  cLine?: string; // Copyright notice
  pLine?: string; // Sound recording copyright notice
  artworkUrl: string;
  artworkFilename: string;
  storedArtworkFilename?: string;
  artworkDimensions?: { width: number; height: number };
  tracks: TrackItem[];
  documents?: ReleaseDocumentItem[];
  clientNotes?: string;
  adminNotes?: string;
  denialReason?: string;
  approvalDate?: string;
  preSaveLinks?: PreSaveLink[];
  status: ReleaseStatus;
  allowPublicShare: boolean;
  submittedAt: string;
  updatedAt: string;
  statusHistory?: Array<{
    status: ReleaseStatus;
    note?: string;
    timestamp: string;
    updatedBy: string;
  }>;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userEmail: string;
  clientName: string;
  amount: number;
  currency: 'ZAR';
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  branchCode: string;
  accountType: 'Cheque' | 'Savings' | 'Transmission' | 'Other';
  notes?: string;
  liabilityAcknowledged: boolean;
  status: 'pending' | 'paid' | 'rejected';
  createdAt: string;
  processedAt?: string;
  processedBy?: string;
  adminNote?: string;
}

export interface Enquiry {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  createdAt: string;
  status: 'new' | 'read' | 'replied';
}

export interface CatalogueTrack extends TrackItem {
  isrc?: string;
}

export interface CatalogueEntry {
  id: string;
  releaseId?: string;
  userId: string;
  title: string;
  artistLabelName: string;
  releaseType: 'Single' | 'EP' | 'Album';
  primaryArtists: string[];
  featuredArtists: string[];
  genre: string;
  subGenre?: string;
  language?: string;
  composers: string[];
  producers: string[];
  isrc?: string;
  upc?: string;
  catalogueReleaseDate?: string;
  /** Total royalty amount assigned to this legacy catalogue record, in ZAR. */
  royaltyAmount?: number;
  previouslyReleased: boolean;
  previousReleaseDetails?: string;
  cLine?: string;
  pLine?: string;
  artworkUrl?: string;
  artworkFilename?: string;
  storedArtworkFilename?: string;
  artworkDimensions?: { width: number; height: number };
  tracks: CatalogueTrack[];
  documents?: ReleaseDocumentItem[];
  notes?: string;
  addedAt: string;
  addedBy: string;
  distributionStatus: 'Not Queued' | 'Ready for SoundBlast' | 'Submitted to SoundBlast' | 'Distributed' | 'Rejected';
  distributionNote?: string;
  updatedAt: string;
}

export interface NotificationLog {
  id: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  template: 'invitation' | 'submission_received' | 'status_change' | 'corrections_required' | 'approved_distribution' | 'denied' | 'password_reset' | string;
  metadata: Record<string, any>;
  sentAt: string;
  status: 'delivered' | 'queued';
}

export interface SmartPreSavePage {
  id: string; slug: string; title: string; artist: string; artworkUrl?: string; soundblastUrl: string; dspLinks: Array<{ label: string; url: string }>; active: boolean; createdAt: string; updatedAt: string;
}

export interface DatabaseSchema {
  _version?: number;
  users: User[];
  releases: Release[];
  enquiries: Enquiry[];
  notifications: NotificationLog[];
  catalogue: CatalogueEntry[];
  withdrawals: WithdrawalRequest[];
  presavePages: SmartPreSavePage[];
}

// ----------------------------------------------------
// Deterministic Absolute Paths & Persistent Storage
// ----------------------------------------------------
const CURRENT_FILE_PATH = fileURLToPath(import.meta.url);
export const PROJECT_ROOT = path.resolve(path.dirname(CURRENT_FILE_PATH), '..');

export const DATA_DIR = path.resolve(process.env.MID_AMA_DATA_DIR || path.join(PROJECT_ROOT, 'data'));
export const DB_FILE = path.resolve(process.env.MID_AMA_DB_FILE || path.join(DATA_DIR, 'db.json'));
export const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
export const LAST_GOOD_FILE = path.join(DATA_DIR, 'db.json.last_good');
export const LOCK_FILE = path.join(DATA_DIR, 'db.json.lock');

export const UPLOADS_DIR = path.resolve(process.env.MID_AMA_UPLOADS_DIR || path.join(PROJECT_ROOT, 'uploads'));
export const ARTWORK_DIR = path.join(UPLOADS_DIR, 'artwork');
export const AUDIO_DIR = path.join(UPLOADS_DIR, 'audio');
export const DOCUMENTS_DIR = path.join(UPLOADS_DIR, 'documents');

// Ensure all persistent storage directories exist
[DATA_DIR, BACKUPS_DIR, UPLOADS_DIR, ARTWORK_DIR, AUDIO_DIR, DOCUMENTS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Deterministic password hasher using HMAC-SHA256
export function hashPassword(password: string): string {
  const salt = 'mid_ama_promo_salt_2026';
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

export function generateToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

export function generateRefNumber(): string {
  const year = new Date().getFullYear();
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `MAP-${year}-${randomDigits}`;
}

// Backwards-compatible bootstrap hashes. Production uses the already-persisted admin records.
// Plaintext administrator passwords are intentionally not embedded in source.
export const defaultAdminPassword = process.env.MID_AMA_DEFAULT_ADMIN_PASSWORD_HASH || '2022dcc7295595c52c85f30539836310d8b201ed3e72480509556318b78bf9cc';
export const remoAdminPassword = process.env.MID_AMA_ADMIN_PASSWORD_HASH || '5dedea32a787f7e35548e5e2980448d62d23bc12b100d2bc8a0bb11318b3e26a';

// Only the official Mid-Ama administrator is authorized for admin endpoints.
export const DESIGNATED_ADMIN_EMAILS = ['remoabetswemolefi@gmail.com'];

const SESSION_TTL_SECONDS = 24 * 60 * 60;
const SESSION_SECRET = process.env.MID_AMA_SESSION_SECRET || process.env.OTP_HASH_SECRET || 'mid-ama-development-session-secret-change-me';

function base64UrlEncode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signSessionPayload(payload: string): string {
  return crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
}

export function createSessionToken(userId: string, ttlSeconds = SESSION_TTL_SECONDS): string {
  const payload = base64UrlEncode(JSON.stringify({ sub: userId, exp: Math.floor(Date.now() / 1000) + ttlSeconds, v: 1 }));
  return `v1.${payload}.${signSessionPayload(payload)}`;
}

export function verifySessionToken(token: string): { userId: string; expiresAt: number } | null {
  try {
    const [version, payload, signature] = token.split('.');
    if (version !== 'v1' || !payload || !signature) return null;
    const expected = signSessionPayload(payload);
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const data = JSON.parse(base64UrlDecode(payload));
    if (!data?.sub || data?.v !== 1 || !Number.isFinite(data.exp) || data.exp <= Math.floor(Date.now() / 1000)) return null;
    return { userId: String(data.sub), expiresAt: Number(data.exp) };
  } catch (_) {
    return null;
  }
}

const INITIAL_DB: DatabaseSchema = {
  _version: 2,
  users: [
    {
      id: 'usr_admin_002',
      email: 'remoabetswemolefi@gmail.com',
      name: 'Remoabetswe Molefi / Midnight-Amapiano',
      role: 'admin',
      passwordHash: remoAdminPassword,
      status: 'active',
      createdAt: '2026-09-24T10:44:00.000Z',
      country: 'South Africa',
    },
    {
      id: 'usr_admin_001',
      email: 'midnightamapiano@yahoo.com',
      name: 'Mid-Ama Head Office',
      role: 'admin',
      passwordHash: defaultAdminPassword,
      status: 'active',
      createdAt: '2026-01-15T08:00:00.000Z',
      country: 'South Africa',
    },
  ],
  releases: [],
  enquiries: [],
  notifications: [],
  catalogue: [],
  withdrawals: [],
  presavePages: [],
};

// ----------------------------------------------------
// Synchronous sleep helper for concurrency backoff
// ----------------------------------------------------
function sleepMs(ms: number) {
  try {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  } catch (_) {
    const end = Date.now() + ms;
    while (Date.now() < end) {}
  }
}

// ----------------------------------------------------
// Inter-Process File Locking
// ----------------------------------------------------
function withFileLock<T>(fn: () => T): T {
  const maxRetries = 120;
  const retryIntervalMs = 25;
  const staleLockAgeMs = 12000; // 12 seconds
  let acquired = false;
  let lockFd: number | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // O_CREAT | O_EXCL flag creates the file only if it doesn't already exist
      lockFd = fs.openSync(LOCK_FILE, 'wx');
      fs.writeFileSync(lockFd, `${process.pid}:${Date.now()}`);
      acquired = true;
      break;
    } catch (err: any) {
      if (err.code === 'EEXIST') {
        try {
          const stat = fs.statSync(LOCK_FILE);
          if (Date.now() - stat.mtimeMs > staleLockAgeMs) {
            console.warn(`[DB] Breaking stale lock file older than ${staleLockAgeMs}ms`);
            try { fs.unlinkSync(LOCK_FILE); } catch (_) {}
          }
        } catch (_) {}
        sleepMs(retryIntervalMs);
      } else {
        throw err;
      }
    }
  }

  if (!acquired) {
    throw new Error(`Database lock timeout: failed to acquire lock on ${LOCK_FILE} after ${maxRetries * retryIntervalMs}ms`);
  }

  try {
    return fn();
  } finally {
    if (lockFd !== null) {
      try { fs.closeSync(lockFd); } catch (_) {}
    }
    try {
      fs.unlinkSync(LOCK_FILE);
    } catch (_) {}
  }
}

// ----------------------------------------------------
// Authoritative Persistent Database Engine
// ----------------------------------------------------
class Database {
  private cachedData: DatabaseSchema | null = null;
  private lastMtimeMs: number = -1;
  private remoteVersion: number = 0;

  constructor() {
    if (remotePersistenceConfigured) remoteEnsureDatabase();
    if (isProduction) {
      if (!remotePersistenceConfigured) {
        const missing = [];
        if (!process.env.DATABASE_URL) missing.push('DATABASE_URL');
        const err = new Error(
          `[FATAL PRODUCTION CONFIGURATION ERROR] The Mid-Ama Promo application is running in production mode, ` +
          `but required Neon PostgreSQL environment variable(s) are missing: ${missing.join(', ')}. ` +
          `Silent fallback to ephemeral local JSON storage (data/db.json) is strictly prohibited in production ` +
          `because container restarts will cause data loss. Configure DATABASE_URL in your Render environment.`
        );
        console.error('\n' + '!'.repeat(80));
        console.error(err.message);
        console.error('!'.repeat(80) + '\n');
        throw err;
      }
      this.ensureRemoteInitialized();
    } else {
      if (remotePersistenceConfigured) {
        console.log('[DB] Development mode: Neon PostgreSQL persistence enabled.');
        this.ensureRemoteInitialized();
      } else {
        console.warn('[DB] Development mode: using local JSON database (data/db.json). NOTE: Production strictly requires Neon PostgreSQL.');
        this.ensureInitialized();
      }
    }
  }

  // Validates schema integrity and applies migrations if necessary
  private validateAndMigrate(parsed: any): DatabaseSchema {
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Database payload is not a valid JSON object');
    }

    const users: User[] = Array.isArray(parsed.users) ? parsed.users : [];
    const releases: Release[] = Array.isArray(parsed.releases) ? parsed.releases : [];
    const enquiries: Enquiry[] = Array.isArray(parsed.enquiries) ? parsed.enquiries : [];
    const notifications: NotificationLog[] = Array.isArray(parsed.notifications) ? parsed.notifications : [];
    const catalogue: CatalogueEntry[] = Array.isArray(parsed.catalogue) ? parsed.catalogue : [];
    const withdrawals: WithdrawalRequest[] = Array.isArray(parsed.withdrawals) ? parsed.withdrawals : [];
    const presavePages: SmartPreSavePage[] = Array.isArray(parsed.presavePages) ? parsed.presavePages : [];

    // Ensure designated platform administrator accounts exist idempotently
    // 1. Remoabetswe Molefi (Founder / Distribution Manager)
    const remoIndex = users.findIndex(u => u.email.toLowerCase() === 'remoabetswemolefi@gmail.com');
    if (remoIndex === -1) {
      users.unshift({ ...INITIAL_DB.users[0] });
    } else {
      const remo = users[remoIndex];
      // Preserve ID and existing data, guarantee admin role and active status
      remo.role = 'admin';
      remo.status = 'active';
      if (!remo.passwordHash) {
        remo.passwordHash = remoAdminPassword;
      }
      if (!remo.name) {
        remo.name = 'Remoabetswe Molefi / Midnight-Amapiano';
      }
    }

    // Preserve the existing Head Office contact account if it exists, but never grant it
    // platform-admin privileges. Existing persisted data is left untouched.
    const midnightIndex = users.findIndex(u => u.email.toLowerCase() === 'midnightamapiano@yahoo.com');
    if (midnightIndex === -1) {
      users.push({ ...INITIAL_DB.users[1], role: 'client' });
    }

    // Release schema migrations: ensure tracks, statusHistory, allowPublicShare exist
    for (const rel of releases) {
      if (!Array.isArray(rel.tracks)) rel.tracks = [];
      if (!Array.isArray(rel.primaryArtists)) rel.primaryArtists = [];
      if (!Array.isArray(rel.featuredArtists)) rel.featuredArtists = [];
      if (typeof rel.allowPublicShare !== 'boolean') rel.allowPublicShare = false;
      if (typeof rel.royaltyAmount !== 'number' || !Number.isFinite(rel.royaltyAmount) || rel.royaltyAmount < 0) rel.royaltyAmount = 0;
      if (!Array.isArray(rel.statusHistory)) {
        rel.statusHistory = [
          {
            status: rel.status || 'Pending Review',
            timestamp: rel.submittedAt || new Date().toISOString(),
            updatedBy: 'System',
          },
        ];
      }
    }

    for (const entry of catalogue) {
      if (typeof entry.royaltyAmount !== 'number' || !Number.isFinite(entry.royaltyAmount) || entry.royaltyAmount < 0) entry.royaltyAmount = 0;
      if (!Array.isArray(entry.primaryArtists)) entry.primaryArtists = [];
      if (!Array.isArray(entry.featuredArtists)) entry.featuredArtists = [];
      if (!Array.isArray(entry.tracks)) entry.tracks = [];
    }

    return {
      _version: 2,
      users,
      releases,
      enquiries,
      notifications,
      catalogue,
      withdrawals,
      presavePages,
    };
  }

  // Neon PostgreSQL is authoritative for hosted application state.
  private ensureRemoteInitialized() {
    try {
      const remote = remoteGetState();
      if (remote) {
        const validated = this.validateAndMigrate(remote.state);
        this.remoteVersion = Number(remote.version);
        this.cachedData = validated;
        console.log(`[DB] Hosted database verified: ${validated.users.length} users, ${validated.releases.length} releases, ${validated.catalogue.length} catalogue entries.`);
        return;
      }

      // A new Neon database starts with the application's defined system seed only.
      // Customer records are never imported from ZIP backups or another provider automatically.
      const seed: DatabaseSchema = JSON.parse(JSON.stringify(INITIAL_DB));
      const initialized = remoteInitializeState(this.validateAndMigrate(seed));
      this.remoteVersion = Number(initialized.version);
      this.cachedData = this.validateAndMigrate(initialized.state);
      console.log(`[DB] Hosted database initialized from bundled recovery data: ${this.cachedData.users.length} users.`);
    } catch (error) {
      throw new Error(`[DB] Hosted persistence initialization failed. Set DATABASE_URL correctly; the application creates its own tables automatically. ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Idempotent startup initialization: never resets or deletes existing records
  private ensureInitialized() {
    withFileLock(() => {
      if (fs.existsSync(DB_FILE)) {
        try {
          const raw = fs.readFileSync(DB_FILE, 'utf-8');
          const parsed = JSON.parse(raw);
          const validated = this.validateAndMigrate(parsed);
          // Save back any non-destructive schema migrations or missing admin anchors
          this.atomicWrite(validated, false);
          this.cachedData = validated;
          this.lastMtimeMs = fs.statSync(DB_FILE).mtimeMs;
          console.log(`[DB] Authoritative database verified: ${validated.users.length} users, ${validated.releases.length} releases, ${validated.catalogue.length} catalogue entries.`);
          return;
        } catch (err) {
          console.error('[DB] Primary database file read/parse error. Attempting last known good recovery...', err);
          const recovered = this.tryRecover();
          if (recovered) {
            this.atomicWrite(recovered, false);
            this.cachedData = recovered;
            this.lastMtimeMs = fs.statSync(DB_FILE).mtimeMs;
            console.log('[DB] Successfully recovered database from last known good backup.');
            return;
          }
          throw new Error(`[DB] Database integrity stop: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      // If file does NOT exist, create clean initial database
      console.log(`[DB] No existing database at ${DB_FILE}. Initializing clean persistent store...`);
      this.atomicWrite(INITIAL_DB, false);
      this.cachedData = INITIAL_DB;
      this.lastMtimeMs = fs.statSync(DB_FILE).mtimeMs;
    });
  }

  // Recovery helper from last known good file or rolling backups
  private tryRecover(): DatabaseSchema | null {
    if (fs.existsSync(LAST_GOOD_FILE)) {
      try {
        const raw = fs.readFileSync(LAST_GOOD_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return this.validateAndMigrate(parsed);
      } catch (_) {}
    }

    try {
      if (fs.existsSync(BACKUPS_DIR)) {
        const backups = fs.readdirSync(BACKUPS_DIR)
          .filter(f => f.startsWith('db_backup_') && f.endsWith('.json'))
          .sort()
          .reverse();

        for (const backup of backups) {
          try {
            const raw = fs.readFileSync(path.join(BACKUPS_DIR, backup), 'utf-8');
            const parsed = JSON.parse(raw);
            return this.validateAndMigrate(parsed);
          } catch (_) {}
        }
      }
    } catch (_) {}

    return null;
  }

  // Atomic write with fsync, temporary file rename, and rotating backup creation
  private atomicWrite(data: DatabaseSchema, createRollingBackup = true) {
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });

    const jsonString = JSON.stringify(data, null, 2);

    // 1. Create a rolling backup if database already existed
    if (createRollingBackup && fs.existsSync(DB_FILE)) {
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(BACKUPS_DIR, `db_backup_${timestamp}.json`);
        fs.copyFileSync(DB_FILE, backupFile);
        fs.copyFileSync(DB_FILE, LAST_GOOD_FILE);

        // Prune older backups keeping last 15
        const files = fs.readdirSync(BACKUPS_DIR)
          .filter(f => f.startsWith('db_backup_') && f.endsWith('.json'))
          .sort();
        if (files.length > 15) {
          for (let i = 0; i < files.length - 15; i++) {
            try { fs.unlinkSync(path.join(BACKUPS_DIR, files[i])); } catch (_) {}
          }
        }
      } catch (backupErr) {
        console.warn('[DB] Warning: Could not create backup snapshot before write:', backupErr);
      }
    }

    // 2. Write to unique temp file
    const uniqueId = `${process.pid}.${Date.now()}.${Math.random().toString(36).substring(2, 8)}`;
    const tempFile = `${DB_FILE}.tmp.${uniqueId}`;

    const fd = fs.openSync(tempFile, 'w', 0o600);
    fs.writeFileSync(fd, jsonString, { encoding: 'utf-8' });
    // Guarantee physical flush to disk storage
    fs.fsyncSync(fd);
    fs.closeSync(fd);

    // 3. POSIX atomic rename replaces destination file without interruption
    fs.renameSync(tempFile, DB_FILE);
    try { fs.chmodSync(DB_FILE, 0o600); } catch (_) {}

    // 4. Update last good copy
    try {
      fs.writeFileSync(LAST_GOOD_FILE, jsonString, { encoding: 'utf-8' });
    } catch (_) {}
  }

  // Reads the fresh authoritative state from disk. Multi-instance safe.
  public getAuthoritativeData(): DatabaseSchema {
    if (isProduction || remotePersistenceConfigured) {
      if (!remotePersistenceConfigured) {
        throw new Error(
          '[DB FATAL] Production database cannot fall back to local disk. DATABASE_URL is required.'
        );
      }
      try {
        const remote = remoteGetState();
        if (!remote) throw new Error('Hosted database row is missing in Neon. Refusing to fall back to an empty database.');
        this.remoteVersion = Number(remote.version);
        this.cachedData = this.validateAndMigrate(remote.state);
        return this.cachedData;
      } catch (err) {
        console.error('[DB] Hosted database read failed:', err);
        throw err;
      }
    }

    try {
      if (fs.existsSync(DB_FILE)) {
        const stat = fs.statSync(DB_FILE);
        if (this.cachedData && stat.mtimeMs === this.lastMtimeMs) {
          return this.cachedData;
        }

        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.cachedData = this.validateAndMigrate(parsed);
        this.lastMtimeMs = stat.mtimeMs;
        return this.cachedData;
      }
    } catch (err) {
      console.error('[DB] Error reading authoritative database from disk:', err);
      if (this.cachedData) return this.cachedData;
      const rec = this.tryRecover();
      if (rec) {
        this.cachedData = rec;
        return rec;
      }
    }
    throw new Error('Database is unavailable. Refusing to silently create an empty database.');
  }

  // Mutates the authoritative database under exclusive file lock and read-before-write
  public mutate<T>(mutator: (data: DatabaseSchema) => T): T {
    if (isProduction || remotePersistenceConfigured) {
      if (!remotePersistenceConfigured) {
        throw new Error(
          '[DB FATAL] Production database cannot fall back to local disk. DATABASE_URL is required.'
        );
      }
      // Optimistic concurrency with a database-side compare-and-swap function.
      // This prevents two Cloud Run instances from overwriting each other's registrations.
      for (let attempt = 0; attempt < 8; attempt++) {
        const remote = remoteGetState();
        if (!remote) throw new Error('Hosted database row is missing in Neon. Refusing to overwrite it with a clean seed.');
        const current = this.validateAndMigrate(remote.state);
        const result = mutator(current);
        const validated = this.validateAndMigrate(current);
        const saved = remoteUpdateState(Number(remote.version), validated);
        if (saved) {
          this.remoteVersion = Number(saved.version);
          this.cachedData = validated;
          return result;
        }
      }
      throw new Error('Hosted database was modified concurrently too many times. Please retry the operation.');
    }

    return withFileLock(() => {
      // 1. Read fresh from disk to eliminate any stale in-memory state
      let current: DatabaseSchema;
      try {
        if (fs.existsSync(DB_FILE)) {
          const raw = fs.readFileSync(DB_FILE, 'utf-8');
          current = this.validateAndMigrate(JSON.parse(raw));
        } else {
          current = JSON.parse(JSON.stringify(INITIAL_DB));
        }
      } catch (readErr) {
        console.error('[DB] Error during read-before-write, attempting recovery:', readErr);
        const rec = this.tryRecover();
        if (!rec) throw new Error('Database read-before-write failure: file corrupt and no backup found.');
        current = rec;
      }

      // 2. Execute mutation
      const result = mutator(current);

      // 3. Validate mutated result
      const validated = this.validateAndMigrate(current);

      // 4. Atomically persist to disk with rolling backup
      this.atomicWrite(validated, true);

      // 5. Update cached state
      this.cachedData = validated;
      try {
        this.lastMtimeMs = fs.statSync(DB_FILE).mtimeMs;
      } catch (_) {}

      return result;
    });
  }

  // ====================================================
  // USER / CLIENT OPERATIONS
  // ====================================================
  getUsers(): User[] {
    const data = this.getAuthoritativeData();
    return data.users.map(u => {
      if (DESIGNATED_ADMIN_EMAILS.includes(u.email.toLowerCase())) {
        return { ...u, role: 'admin', status: 'active' };
      }
      return { ...u };
    });
  }

  findUserById(id: string): User | undefined {
    const data = this.getAuthoritativeData();
    const user = data.users.find(u => u.id === id);
    if (!user) return undefined;
    if (DESIGNATED_ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      return { ...user, role: 'admin', status: 'active' };
    }
    if (user.role === 'admin') return { ...user, role: 'client' };
    return { ...user };
  }

  findUserByEmail(email: string): User | undefined {
    const data = this.getAuthoritativeData();
    const norm = email.trim().toLowerCase();
    const user = data.users.find(u => u.email.toLowerCase() === norm);
    if (!user) return undefined;
    if (DESIGNATED_ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      return { ...user, role: 'admin', status: 'active' };
    }
    if (user.role === 'admin') return { ...user, role: 'client' };
    return { ...user };
  }

  findUserByInviteToken(token: string): User | undefined {
    const data = this.getAuthoritativeData();
    return data.users.find(u => u.inviteToken === token);
  }

  findUserByResetToken(token: string): User | undefined {
    const data = this.getAuthoritativeData();
    return data.users.find(u => u.resetToken === token && (!u.resetTokenExpiry || new Date(u.resetTokenExpiry) > new Date()));
  }

  createUser(user: User): User {
    return this.mutate((data) => {
      // Never allow creating a non-designated administrator
      if (!DESIGNATED_ADMIN_EMAILS.includes(user.email.toLowerCase()) && user.role === 'admin') {
        user.role = 'client';
      }
      // Check for duplicate email
      const existing = data.users.find(u => u.email.toLowerCase() === user.email.toLowerCase());
      if (existing) {
        throw new Error(`A client or user with email "${user.email}" already exists.`);
      }
      data.users.push(user);
      return user;
    });
  }

  updateUser(id: string, updates: Partial<User>): User | undefined {
    return this.mutate((data) => {
      const idx = data.users.findIndex(u => u.id === id);
      if (idx === -1) return undefined;
      const existing = data.users[idx];

      // Prevent demoting or deactivating designated administrators
      if (DESIGNATED_ADMIN_EMAILS.includes(existing.email.toLowerCase())) {
        delete updates.role;
        delete updates.status;
      }

      data.users[idx] = { ...existing, ...updates };
      return data.users[idx];
    });
  }

  deleteUser(id: string): boolean {
    return this.mutate((data) => {
      const target = data.users.find(u => u.id === id);
      if (target && DESIGNATED_ADMIN_EMAILS.includes(target.email.toLowerCase())) {
        return false; // Cannot delete designated administrators
      }
      const prevLen = data.users.length;
      data.users = data.users.filter(u => u.id !== id);
      if (data.users.length !== prevLen) {
        data.releases = data.releases.filter(r => r.userId !== id);
        return true;
      }
      return false;
    });
  }

  // ====================================================
  // RELEASE OPERATIONS
  // ====================================================
  getReleases(): Release[] {
    return this.getAuthoritativeData().releases;
  }

  getReleasesByUserId(userId: string): Release[] {
    return this.getAuthoritativeData().releases.filter(r => r.userId === userId);
  }

  findReleaseById(id: string): Release | undefined {
    return this.getAuthoritativeData().releases.find(r => r.id === id);
  }

  findReleaseByRef(refNumber: string): Release | undefined {
    const norm = refNumber.trim().toUpperCase();
    return this.getAuthoritativeData().releases.find(r => r.refNumber.toUpperCase() === norm);
  }

  createRelease(release: Release): Release {
    return this.mutate((data) => {
      // Prepend release to maintain chronological descending order
      data.releases.unshift(release);
      return release;
    });
  }

  updateRelease(id: string, updates: Partial<Release>): Release | undefined {
    return this.mutate((data) => {
      const idx = data.releases.findIndex(r => r.id === id);
      if (idx === -1) return undefined;
      data.releases[idx] = {
        ...data.releases[idx],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      return data.releases[idx];
    });
  }

  deleteRelease(id: string): boolean {
    return this.mutate((data) => {
      const initialLen = data.releases.length;
      data.releases = data.releases.filter(r => r.id !== id);
      return data.releases.length !== initialLen;
    });
  }

  // ====================================================
  // ROYALTY / WITHDRAWAL OPERATIONS
  // ====================================================
  getWithdrawals(): WithdrawalRequest[] {
    return this.getAuthoritativeData().withdrawals || [];
  }

  getWithdrawalsByUserId(userId: string): WithdrawalRequest[] {
    return this.getWithdrawals().filter(w => w.userId === userId);
  }

  createWithdrawal(withdrawal: WithdrawalRequest): WithdrawalRequest {
    return this.mutate((data) => {
      data.withdrawals = Array.isArray(data.withdrawals) ? data.withdrawals : [];
      const releaseEarnings = data.releases
        .filter(r => r.userId === withdrawal.userId)
        .reduce((sum, r) => sum + Math.max(0, Number(r.royaltyAmount || 0)), 0);
      // Standalone legacy catalogue entries contribute royalties too. Linked entries
      // are excluded here because their release royalty is already counted above.
      const catalogueEarnings = (data.catalogue || [])
        .filter(entry => entry.userId === withdrawal.userId && !entry.releaseId)
        .reduce((sum, entry) => sum + Math.max(0, Number(entry.royaltyAmount || 0)), 0);
      const totalEarnings = releaseEarnings + catalogueEarnings;
      const reserved = data.withdrawals
        .filter(w => w.userId === withdrawal.userId && w.status === 'pending')
        .reduce((sum, w) => sum + Number(w.amount || 0), 0);
      const paid = data.withdrawals
        .filter(w => w.userId === withdrawal.userId && w.status === 'paid')
        .reduce((sum, w) => sum + Number(w.amount || 0), 0);
      const available = Math.max(0, totalEarnings - reserved - paid);
      if (withdrawal.amount > available + 0.000001) {
        throw new Error(`The maximum available amount is R${available.toFixed(2)}.`);
      }
      data.withdrawals.unshift(withdrawal);
      return withdrawal;
    });
  }

  updateWithdrawal(id: string, updates: Partial<WithdrawalRequest>): WithdrawalRequest | undefined {
    return this.mutate((data) => {
      const idx = (data.withdrawals || []).findIndex(w => w.id === id);
      if (idx === -1) return undefined;
      data.withdrawals[idx] = { ...data.withdrawals[idx], ...updates };
      return data.withdrawals[idx];
    });
  }

  // ====================================================
  // ENQUIRY OPERATIONS
  // ====================================================
  getEnquiries(): Enquiry[] {
    return this.getAuthoritativeData().enquiries;
  }

  createEnquiry(enquiry: Enquiry): Enquiry {
    return this.mutate((data) => {
      data.enquiries.unshift(enquiry);
      return enquiry;
    });
  }

  updateEnquiryStatus(id: string, status: 'new' | 'read' | 'replied'): Enquiry | undefined {
    return this.mutate((data) => {
      const enq = data.enquiries.find(e => e.id === id);
      if (enq) {
        enq.status = status;
        return enq;
      }
      return undefined;
    });
  }

  // ====================================================
  // NOTIFICATION OPERATIONS
  // ====================================================
  getNotifications(): NotificationLog[] {
    return this.getAuthoritativeData().notifications;
  }

  createNotification(notif: NotificationLog): NotificationLog {
    return this.mutate((data) => {
      data.notifications.unshift(notif);
      return notif;
    });
  }

  // ====================================================
  // CATALOGUE OPERATIONS
  // ====================================================
  getCatalogue(): CatalogueEntry[] {
    return this.getAuthoritativeData().catalogue;
  }

  getCatalogueByUserId(userId: string): CatalogueEntry[] {
    return this.getAuthoritativeData().catalogue.filter(entry => entry.userId === userId);
  }

  findCatalogueEntry(releaseId: string, userId: string): CatalogueEntry | undefined {
    return this.getAuthoritativeData().catalogue.find(entry => entry.releaseId === releaseId && entry.userId === userId);
  }

  findCatalogueById(id: string): CatalogueEntry | undefined {
    return this.getAuthoritativeData().catalogue.find(entry => entry.id === id);
  }

  addCatalogueEntry(entry: CatalogueEntry): CatalogueEntry {
    return this.mutate((data) => {
      if (entry.releaseId && data.catalogue.some(e => e.releaseId === entry.releaseId && e.userId === entry.userId)) {
        throw new Error('This release is already in the client catalogue.');
      }
      data.catalogue.push(entry);
      return entry;
    });
  }

  updateCatalogueEntry(id: string, updates: Partial<CatalogueEntry>): CatalogueEntry | undefined {
    return this.mutate((data) => {
      const idx = data.catalogue.findIndex(entry => entry.id === id);
      if (idx === -1) return undefined;
      data.catalogue[idx] = {
        ...data.catalogue[idx],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      return data.catalogue[idx];
    });
  }

  // ====================================================
  // PERSISTENCE AUDIT & SNAPSHOT OPERATIONS
  // ====================================================
  getPersistenceInfo() {
    if (remotePersistenceConfigured) {
      const data = this.getAuthoritativeData();
      return {
        persistenceMode: 'neon-postgres',
        neonConfigured: true,
        databaseConfigured: true,
        storageConfigured: remoteStorageConfigured,
        authConfigured: remoteCheckAuth(),
        mode: 'neon-postgres',
        databaseFile: 'hosted:midama_app_state',
        dataDirectory: 'hosted',
        backupsDirectory: 'hosted database backups / provider backups',
        exists: true,
        size: JSON.stringify(data).length,
        modifiedAt: new Date().toISOString(),
        backupsCount: -1,
        persistentDirectoryConfigured: true,
        users: data.users.length,
        clients: data.users.filter(u => u.role === 'client').length,
        releases: data.releases.length,
        catalogue: data.catalogue.length,
        enquiries: data.enquiries.length,
        notifications: data.notifications.length,
        remoteVersion: this.remoteVersion,
      };
    }

    let size = 0;
    let modifiedAt: string | null = null;
    try {
      const stat = fs.statSync(DB_FILE);
      size = stat.size;
      modifiedAt = stat.mtime.toISOString();
    } catch (_) {}

    const data = this.getAuthoritativeData();
    let backupsCount = 0;
    try {
      if (fs.existsSync(BACKUPS_DIR)) {
        backupsCount = fs.readdirSync(BACKUPS_DIR).filter(f => f.endsWith('.json')).length;
      }
    } catch (_) {}

    return {
      persistenceMode: 'local-json',
      neonConfigured: false,
      databaseConfigured: false,
      storageConfigured: false,
      authConfigured: false,
      mode: 'local-json',
      databaseFile: DB_FILE,
      dataDirectory: DATA_DIR,
      backupsDirectory: BACKUPS_DIR,
      exists: fs.existsSync(DB_FILE),
      size,
      modifiedAt,
      backupsCount,
      persistentDirectoryConfigured: Boolean(process.env.MID_AMA_DATA_DIR || process.env.MID_AMA_DB_FILE),
      users: data.users.length,
      clients: data.users.filter(u => u.role === 'client').length,
      releases: data.releases.length,
      catalogue: data.catalogue.length,
      enquiries: data.enquiries.length,
      notifications: data.notifications.length,
    };
  }

  getSnapshot(): DatabaseSchema {
    return JSON.parse(JSON.stringify(this.getAuthoritativeData()));
  }

  importAdditive(snapshot: Partial<DatabaseSchema>): {
    usersAdded: number;
    releasesAdded: number;
    enquiriesAdded: number;
    notificationsAdded: number;
    catalogueAdded: number;
  } {
    return this.mutate((data) => {
      const result = { usersAdded: 0, releasesAdded: 0, enquiriesAdded: 0, notificationsAdded: 0, catalogueAdded: 0 };
      const addUnique = <T extends { id: string }>(target: T[], incoming: unknown, counter: keyof typeof result) => {
        if (!Array.isArray(incoming)) return;
        for (const item of incoming as T[]) {
          if (!item || typeof item.id !== 'string') continue;
          if (!target.some(existing => existing.id === item.id)) {
            target.push(item);
            result[counter]++;
          }
        }
      };

      addUnique(data.users, snapshot.users, 'usersAdded');
      addUnique(data.releases, snapshot.releases, 'releasesAdded');
      addUnique(data.enquiries, snapshot.enquiries, 'enquiriesAdded');
      addUnique(data.notifications, snapshot.notifications, 'notificationsAdded');
      addUnique(data.catalogue, snapshot.catalogue, 'catalogueAdded');
      if (Array.isArray(snapshot.presavePages)) {
        for (const page of snapshot.presavePages) if (page?.id && !data.presavePages.some(p => p.id === page.id)) data.presavePages.push(page);
      }
      return result;
    });
  }

  getPreSavePages(): SmartPreSavePage[] { return this.getAuthoritativeData().presavePages || []; }
  findPreSavePageBySlug(slug: string): SmartPreSavePage | undefined { return this.getPreSavePages().find(p => p.slug.toLowerCase() === slug.toLowerCase()); }
  createPreSavePage(page: SmartPreSavePage): SmartPreSavePage { return this.mutate(data => { if (!Array.isArray(data.presavePages)) data.presavePages = []; if (data.presavePages.some(p => p.slug.toLowerCase() === page.slug.toLowerCase())) throw new Error('That pre-save URL is already in use.'); data.presavePages.unshift(page); return page; }); }
  updatePreSavePage(id: string, updates: Partial<SmartPreSavePage>): SmartPreSavePage | undefined { return this.mutate(data => { const page = (data.presavePages || []).find(p => p.id === id); if (!page) return undefined; Object.assign(page, updates); return page; }); }
  deletePreSavePage(id: string): boolean { return this.mutate(data => { const before = (data.presavePages || []).length; data.presavePages = (data.presavePages || []).filter(p => p.id !== id); return data.presavePages.length !== before; }); }

  // Explicit safety block: destructive reset must NEVER be callable
  resetToClean() {
    throw new Error('Destructive database reset is strictly disabled for data protection. Restore from an explicit backup instead.');
  }
}

export const db = new Database();

// Helper to enforce private file storage and role/ownership access control
export function canAccessUploadedFile(filename: string, user?: User | null): boolean {
  if (user && user.role === 'admin') return true;

  const base = path.basename(filename);
  const release = db.getReleases().find(r => {
    if (r.storedArtworkFilename === base || path.basename(r.artworkUrl) === base) return true;
    if (r.tracks.some(t => t.storedFilename === base || path.basename(t.fileUrl) === base)) return true;
    if (r.documents?.some(d => d.storedFilename === base || path.basename(d.fileUrl) === base)) return true;
    return false;
  });

  if (release) {
    if (user && release.userId === user.id) return true;
    if (release.allowPublicShare && release.status !== 'Denied') return true;
    return false;
  }

  const catalogue = db.getCatalogue().find(entry => {
    if (entry.storedArtworkFilename === base || (entry.artworkUrl && path.basename(entry.artworkUrl) === base)) return true;
    if (entry.tracks?.some(t => t.storedFilename === base || path.basename(t.fileUrl) === base)) return true;
    if (entry.documents?.some(d => d.storedFilename === base || path.basename(d.fileUrl) === base)) return true;
    return false;
  });
  if (catalogue) return !!user && (user.role === 'admin' || catalogue.userId === user.id);

  // Authenticated user can access freshly uploaded asset before form submit
  return !!user;
}
