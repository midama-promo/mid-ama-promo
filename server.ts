import 'dotenv/config';
import express from 'express';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { apiRouter, getAuthTokenFromRequest } from './server/routes.ts';
import { db, canAccessUploadedFile, UPLOADS_DIR, isProduction, verifySessionToken } from './server/db.ts';
import {
  remotePersistenceConfigured,
  remoteStorageConfigured,
  remoteEnsureBucket,
  remoteUploadFile,
} from './server/remote.ts';

// Production must use durable Neon persistence; never silently fall back to local disk.
if (isProduction) {
  const missing = ['DATABASE_URL', 'MID_AMA_SESSION_SECRET', 'RESEND_API_KEY', 'EMAIL_FROM', 'R2_ACCOUNT_ID', 'R2_BUCKET_NAME', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'].filter(key => !process.env[key]);
  if (missing.length) {
    console.error(`[FATAL CONFIGURATION ERROR] Production is missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}


function migrateLocalAssetsToHostedStorage() {
  if (!remoteStorageConfigured) return;
  const snapshot = db.getSnapshot();
  let migrated = 0;

  const migrateFile = (localPath: string, userId: string, folder: string, currentStored: string | undefined, update: (stored: string, url: string) => void) => {
    if (!currentStored || currentStored.startsWith('remote:') || currentStored.startsWith('r2:') || !fs.existsSync(localPath)) return;
    const objectPath = `${userId}/migrated/${folder}/${crypto.randomUUID()}-${path.basename(localPath)}`;
    const mime = folder === 'audio' ? 'audio/mpeg' : folder === 'artwork' ? 'image/jpeg' : 'application/octet-stream';
    remoteUploadFile(localPath, objectPath, mime);
    update(`r2:${objectPath}`, `/api/assets/${Buffer.from(objectPath, 'utf8').toString('base64url')}`);
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

  if (migrated) console.log(`[R2 STORAGE] Migrated ${migrated} existing local asset(s) to Cloudflare R2.`);
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
    const session = verifySessionToken(token);
    user = session ? db.findUserById(session.userId) || null : null;
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
  if (remoteStorageConfigured) { remoteEnsureBucket(); migrateLocalAssetsToHostedStorage(); }
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

