import 'dotenv/config';
import express from 'express';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { apiRouter, getAuthTokenFromRequest } from './server/routes.ts';
import { db, canAccessUploadedFile, UPLOADS_DIR, isProduction } from './server/db.ts';
import {
  remotePersistenceConfigured,
  remoteEnsureBucket,
  remoteUploadFile,
  remoteFindAuthUserByEmail,
  remoteCreateAuthUser,
} from './server/remote.ts';

// CRITICAL SAFETY REQUIREMENT:
// If running in production and Supabase environment variables are missing,
// fail loudly and immediately. Silent fallback to local JSON database is strictly forbidden in production.
if (isProduction && !remotePersistenceConfigured) {
  const missing = [];
  if (!process.env.SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!process.env.SUPABASE_ANON_KEY && !process.env.SUPABASE_PUBLISHABLE_KEY) missing.push('SUPABASE_ANON_KEY');

  const errorBanner = `
================================================================================
[FATAL PRODUCTION CONFIGURATION ERROR]
The application is running in production mode, but the required Supabase
environment variable(s) are missing:
  ${missing.map(m => `* ${m}`).join('\n  ')}

CRITICAL DATA SAFETY NOTICE:
In production, silent fallback to local JSON storage (data/db.json) is disabled.
Google Cloud Run containers are ephemeral and stateless: any data written to
local disk will vanish upon instance restart or deployment.

TO FIX THIS:
1. Provide the following environment variables in your deployment settings:
   - SUPABASE_URL: Your Supabase Project URL (e.g. https://xyzcompany.supabase.co)
   - SUPABASE_SERVICE_ROLE_KEY: Your Supabase service_role secret key
   - SUPABASE_ANON_KEY: Your Supabase anon/publishable key for email OTP authentication
2. Ensure you have run supabase-schema.sql in your Supabase SQL Editor.
================================================================================
`;
  console.error(errorBanner);
  process.exit(1);
}

function syncClientAuthUsers() {
  if (!remotePersistenceConfigured) return;
  const clients = db.getUsers().filter(u => !u.authUserId);
  let synced = 0;
  for (const client of clients) {
    try {
      const authUser = remoteFindAuthUserByEmail(client.email) || remoteCreateAuthUser(client.email, crypto.randomUUID(), { role: client.role, name: client.name, midama_user_id: client.id });
      db.updateUser(client.id, { authUserId: authUser.id });
      synced++;
    } catch (error: any) {
      console.warn(`[SUPABASE AUTH] Could not sync ${client.email}:`, error?.message || error);
    }
  }
  if (synced) console.log(`[SUPABASE AUTH] Linked ${synced} existing client account(s) to Supabase Auth.`);
}

function migrateLocalAssetsToHostedStorage() {
  if (!remotePersistenceConfigured) return;
  const snapshot = db.getSnapshot();
  let migrated = 0;

  const migrateFile = (localPath: string, userId: string, folder: string, currentStored: string | undefined, update: (stored: string, url: string) => void) => {
    if (!currentStored || currentStored.startsWith('remote:') || !fs.existsSync(localPath)) return;
    const objectPath = `${userId}/migrated/${folder}/${crypto.randomUUID()}-${path.basename(localPath)}`;
    const mime = folder === 'audio' ? 'audio/mpeg' : folder === 'artwork' ? 'image/jpeg' : 'application/octet-stream';
    remoteUploadFile(localPath, objectPath, mime);
    update(`remote:${objectPath}`, `/api/assets/${Buffer.from(objectPath, 'utf8').toString('base64url')}`);
    migrated++;
  };

  for (const release of snapshot.releases) {
    if (release.storedArtworkFilename) {
      migrateFile(path.join(process.cwd(), 'uploads', 'artwork', release.storedArtworkFilename), release.userId, 'artwork', release.storedArtworkFilename, (stored, url) => db.updateRelease(release.id, { storedArtworkFilename: stored, artworkUrl: url }));
    }
    for (const track of release.tracks || []) {
      migrateFile(path.join(process.cwd(), 'uploads', 'audio', track.storedFilename || ''), release.userId, 'audio', track.storedFilename, (stored, url) => db.updateRelease(release.id, { tracks: release.tracks.map(t => t.id === track.id ? { ...t, storedFilename: stored, fileUrl: url } : t) }));
    }
    for (const doc of release.documents || []) {
      migrateFile(path.join(process.cwd(), 'uploads', 'documents', doc.storedFilename || ''), release.userId, 'documents', doc.storedFilename, (stored, url) => db.updateRelease(release.id, { documents: release.documents!.map(d => d.id === doc.id ? { ...d, storedFilename: stored, fileUrl: url } : d) }));
    }
  }

  for (const entry of snapshot.catalogue) {
    if (entry.storedArtworkFilename) {
      migrateFile(path.join(process.cwd(), 'uploads', 'artwork', entry.storedArtworkFilename), entry.userId, 'artwork', entry.storedArtworkFilename, (stored, url) => db.updateCatalogueEntry(entry.id, { storedArtworkFilename: stored, artworkUrl: url }));
    }
    for (const track of entry.tracks || []) {
      migrateFile(path.join(process.cwd(), 'uploads', 'audio', track.storedFilename || ''), entry.userId, 'audio', track.storedFilename, (stored, url) => db.updateCatalogueEntry(entry.id, { tracks: entry.tracks.map(t => t.id === track.id ? { ...t, storedFilename: stored, fileUrl: url } : t) }));
    }
    for (const doc of entry.documents || []) {
      migrateFile(path.join(process.cwd(), 'uploads', 'documents', doc.storedFilename || ''), entry.userId, 'documents', doc.storedFilename, (stored, url) => db.updateCatalogueEntry(entry.id, { documents: entry.documents!.map(d => d.id === doc.id ? { ...d, storedFilename: stored, fileUrl: url } : d) }));
    }
  }

  if (migrated) console.log(`[REMOTE STORAGE] Migrated ${migrated} existing local asset(s) to Supabase Storage.`);
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '1mb', verify: (req, _res, buf) => { (req as any).rawBody = Buffer.from(buf); } }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Never let browsers/proxies cache account and catalogue responses. A stale GET
// response can otherwise make a newly registered artist appear to have vanished.
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Private storage directory
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Enforce private storage: only authorized admins or file owners (or public showcase if enabled) can access assets
app.use('/uploads', (req, res, next) => {
  const token = getAuthTokenFromRequest(req);
  let user = null;
  if (token) {
    const parts = token.split(':');
    user = db.findUserById(parts[0]) || null;
  }

  const requestedFilename = path.basename(req.path);
  if (!canAccessUploadedFile(requestedFilename, user)) {
    return res.status(403).json({ error: 'Access denied. Customer assets are strictly private and require authorization.' });
  }

  next();
}, express.static(UPLOADS_DIR));

// API routes mounted at /api
app.use('/api', apiRouter);

// Return JSON for unexpected API/multipart failures instead of Express' HTML error page.
app.use('/api', (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('API error:', err);
  if (res.headersSent) return;
  const status = err?.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
  res.status(status).json({ error: err?.message || 'An unexpected server error occurred.' });
});

// Start server with Vite middleware in dev or static files in production
async function startServer() {
  if (remotePersistenceConfigured) { remoteEnsureBucket(); syncClientAuthUsers(); migrateLocalAssetsToHostedStorage(); }
  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Mid-Ama Promo Server] Running at http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});

