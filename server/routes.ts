import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import os from 'os';
import { execFileSync } from 'child_process';
import {
  db,
  hashPassword,
  generateToken,
  generateRefNumber,
  createSessionToken,
  verifySessionToken,
  DESIGNATED_ADMIN_EMAILS,
  UPLOADS_DIR,
  ARTWORK_DIR,
  AUDIO_DIR,
  DOCUMENTS_DIR,
} from './db.ts';
import type {
  User,
  Release,
  ReleaseStatus,
  ReleaseDocumentItem,
  CatalogueEntry,
  WithdrawalRequest,
} from './db.ts';
import { sendNotification, sendAdminReleaseEmail, sendAdminEnquiryEmail, sendAdminTakedownEmail } from './mailer.ts';
import { requestEmailOtp, verifyEmailOtp } from './otp.ts';
import {
  remotePersistenceConfigured,
  remoteStorageConfigured,
  remoteUploadFile,
  remoteSignedUrl,
  remoteSignedUrlForStoredName,
  encodeRemoteAssetPath,
  decodeRemoteAssetPath,
  remoteObjectPathFromStoredName,
  remoteCheckDatabase,
  remoteCheckStorage,
  remoteCheckAuth,
} from './remote.ts';

export const apiRouter = express.Router();

// Application-side OTP throttling adds a per-IP and per-email defense layer.
const otpRequestByKey = new Map<string, number>();
const otpVerifyAttempts = new Map<string, { count: number; resetAt: number }>();
const OTP_REQUEST_COOLDOWN_MS = 60_000;
const OTP_VERIFY_WINDOW_MS = 10 * 60_000;
const OTP_MAX_VERIFY_ATTEMPTS = 8;

function normalizeAuthEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function clientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) return forwarded.split(',')[0].trim();
  return req.ip || 'unknown';
}

function setSessionCookie(res: Response, token: string, maxAgeMs = 24 * 60 * 60 * 1000) {
  res.cookie('midama_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' || Boolean(process.env.K_SERVICE),
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeMs,
  });
}

function clearSessionCookie(res: Response) {
  res.clearCookie('midama_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' || Boolean(process.env.K_SERVICE),
    sameSite: 'lax',
    path: '/',
  });
}

// Multer storage for artwork
const artworkStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, ARTWORK_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `art_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
    cb(null, safeName);
  }
});

// Multer storage for audio masters (MP3 only)
const audioStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, AUDIO_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `track_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
    cb(null, safeName);
  }
});

// Multer storage for supporting documents (PDF, DOCX, TXT)
const documentStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, DOCUMENTS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
    cb(null, safeName);
  }
});

const uploadDocument = multer({
  storage: documentStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.pdf', '.doc', '.docx', '.txt', '.csv', '.rtf'];
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid document format. Only PDF, DOC, DOCX, TXT, CSV files are accepted.'));
    }
  }
});

const uploadArtwork = multer({
  storage: artworkStorage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowed.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Invalid artwork format. Only JPG/JPEG and PNG image files are accepted.'));
    }
  }
});

const uploadAudio = multer({
  storage: audioStorage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const name = file.originalname.toLowerCase();
    const isMp3 = name.endsWith('.mp3') || file.mimetype === 'audio/mpeg' || file.mimetype === 'audio/mp3' || file.mimetype === 'audio/x-mp3';
    if (isMp3) cb(null, true);
    else cb(new Error('Invalid audio format. Only MP3 master audio files are accepted.'));
  }
});

// Helper auth middleware
interface AuthenticatedRequest extends Request {
  user?: User;
}

export function getAuthTokenFromRequest(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  if (req.query && typeof req.query.token === 'string' && req.query.token.length > 20) {
    return req.query.token;
  }
  const cookies = req.headers.cookie;
  if (cookies) {
    const match = cookies.match(/(?:^|;\s*)midama_token=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  return null;
}

function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = getAuthTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  const verified = verifySessionToken(token);
  if (!verified) {
    return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
  }
  const user = db.findUserById(verified.userId);

  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
  }

  req.user = user;
  next();
}

function activeClientOnly(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.user?.role === 'client' && req.user.status === 'disabled') {
    return res.status(403).json({
      error: req.user.disabledReason
        ? `Your Mid-Ama Promo account is currently banned / terminated. Reason: ${req.user.disabledReason}`
        : 'Your Mid-Ama Promo account is currently banned / terminated. Please contact Mid-Ama Promo administration.',
      code: 'ACCOUNT_DISABLED',
      reason: req.user.disabledReason || null,
    });
  }
  next();
}

function adminOnly(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const isDesignatedAdmin = !!req.user && req.user.email.toLowerCase() === 'remoabetswemolefi@gmail.com';
  if (!req.user || !isDesignatedAdmin) {
    return res.status(403).json({ error: 'Access denied. Administrative privilege required.' });
  }
  next();
}


const PLAN_CONFIG = {
  free: { id: 'free' as const, name: 'Free', amountZar: 0, amountKobo: 0, monthlyReleaseLimit: 50, artistLimit: 50 },
  starter: { id: 'starter' as const, name: 'Starter', amountZar: 99, amountKobo: 9900, monthlyReleaseLimit: null as number | null, artistLimit: null as number | null },
  pro: { id: 'pro' as const, name: 'Pro', amountZar: 449, amountKobo: 44900, monthlyReleaseLimit: null as number | null, artistLimit: null as number | null },
};
type PaidPlanId = 'starter' | 'pro';

function effectivePlanId(user: User): 'free' | 'starter' | 'pro' {
  const plan = user.planId || 'free';
  if (plan === 'free') return 'free';
  if (!user.planExpiresAt || new Date(user.planExpiresAt).getTime() <= Date.now()) return 'free';
  return plan;
}

function releaseArtistNames(release: Release): string[] {
  const names: string[] = [
    ...(release.primaryArtists || []), ...(release.featuredArtists || []),
    ...(release.primaryArtistProfiles || []).map((p: any) => p.name),
    ...(release.featuredArtistProfiles || []).map((p: any) => p.name),
    ...(release.artistProfiles || []).map((p: any) => p.name),
  ];
  for (const track of release.tracks || []) {
    if (track.primaryArtist) names.push(track.primaryArtist);
    names.push(...(track.featuredArtists || []));
    names.push(...(track.artistProfiles || []).map((p: any) => p.name));
  }
  return names.map(n => String(n || '').trim()).filter(Boolean);
}

function planUsage(user: User) {
  const planId = effectivePlanId(user);
  const plan = PLAN_CONFIG[planId];
  const allUserReleases = db.getReleases().filter(r => r.userId === user.id);
  const now = Date.now();
  const windowStart = now - 30 * 24 * 60 * 60 * 1000;
  const monthlyReleases = allUserReleases.filter(r => new Date(r.submittedAt).getTime() >= windowStart);
  const artistNames = new Set([...(user.artistName || user.name ? [user.artistName || user.name] : []), ...allUserReleases.flatMap(releaseArtistNames)].map(n => n.toLocaleLowerCase()));
  return {
    planId,
    planName: plan.name,
    planExpiresAt: planId === 'free' ? null : user.planExpiresAt || null,
    usage: { releasesThisMonth: monthlyReleases.length, artists: artistNames.size },
    limits: { releasesPerMonth: plan.monthlyReleaseLimit, artists: plan.artistLimit },
    prices: { starter: PLAN_CONFIG.starter.amountZar, pro: PLAN_CONFIG.pro.amountZar },
  };
}

function applyPaidPlan(userId: string, planId: PaidPlanId, reference: string): User | undefined {
  const user = db.findUserById(userId);
  if (!user || user.role !== 'client') return undefined;
  if (user.lastPaymentReference === reference) return user;
  const now = Date.now();
  const currentExpiry = user.planExpiresAt ? new Date(user.planExpiresAt).getTime() : 0;
  const base = Number.isFinite(currentExpiry) && currentExpiry > now ? currentExpiry : now;
  const expiresAt = new Date(base + 30 * 24 * 60 * 60 * 1000).toISOString();
  return db.updateUser(user.id, {
    planId,
    planExpiresAt: expiresAt,
    planActivatedAt: new Date().toISOString(),
    lastPaymentReference: reference,
  });
}

async function verifyPaystackTransaction(reference: string) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) throw new Error('Paystack is not configured on the server yet. Add PAYSTACK_SECRET_KEY to your hosting environment.');
  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret}`, Accept: 'application/json' },
  });
  const result: any = await response.json().catch(() => ({}));
  if (!response.ok || !result?.status) throw new Error(result?.message || 'Paystack could not verify this payment.');
  return result.data;
}

function activateFromVerifiedTransaction(data: any, expectedUserId: string) {
  const metadata = data?.metadata || {};
  const userId = String(metadata.user_id || metadata.userId || '');
  const planId = String(metadata.plan_id || metadata.planId || '') as PaidPlanId;
  if (data?.status !== 'success') throw new Error('Payment has not been completed successfully.');
  if (userId !== expectedUserId) throw new Error('This payment does not belong to the signed-in account.');
  if (!(planId in PLAN_CONFIG)) throw new Error('The paid plan on this transaction is invalid.');
  const plan = PLAN_CONFIG[planId];
  if (Number(data.amount) !== plan.amountKobo || String(data.currency || '').toUpperCase() !== 'ZAR') {
    throw new Error('Payment amount or currency does not match the selected plan.');
  }
  const customerEmail = String(data.customer?.email || '').toLowerCase();
  const user = db.findUserById(expectedUserId);
  if (!user || customerEmail !== user.email.toLowerCase()) throw new Error('The payment email does not match your account email.');
  const activated = applyPaidPlan(user.id, planId, String(data.reference || ''));
  if (!activated) throw new Error('Could not activate the plan for this account.');
  return activated;
}

// Paid-plan purchases remain deliberately disabled until Mid-Ama Promo confirms Paystack business approval.
// Re-enable only after approval and an end-to-end test of live checkout, verification, and webhooks.
const PAYSTACK_PLAN_PURCHASES_ENABLED = false;

// Paystack checkout initialization. Amounts and plan entitlements are always determined server-side.
apiRouter.post('/payments/paystack/initialize', authMiddleware, activeClientOnly, async (req: AuthenticatedRequest, res: Response) => {
  if (!PAYSTACK_PLAN_PURCHASES_ENABLED) return res.status(503).json({ error: 'Paid plans are coming soon while Paystack completes business verification.' });
  const user = req.user!;
  if (user.role !== 'client') return res.status(403).json({ error: 'Only client accounts can purchase a plan.' });
  const planId = String(req.body?.planId || '') as PaidPlanId;
  if (planId !== 'starter' && planId !== 'pro') return res.status(400).json({ error: 'Choose a valid paid plan.' });
  if (!process.env.PAYSTACK_SECRET_KEY) return res.status(503).json({ error: 'Paystack is not configured yet. Add PAYSTACK_SECRET_KEY to the server environment before accepting payments.' });
  try {
    const plan = PLAN_CONFIG[planId];
    const reference = `midama_${user.id}_${Date.now()}_${crypto.randomBytes(5).toString('hex')}`;
    const baseUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        email: user.email,
        amount: plan.amountKobo,
        currency: 'ZAR',
        reference,
        callback_url: `${baseUrl}/?payment=paystack&reference=${encodeURIComponent(reference)}`,
        metadata: { user_id: user.id, plan_id: plan.id, plan_name: plan.name, billing_period_days: 30, service: 'Mid-Ama Promo™ music distribution' },
      }),
    });
    const result: any = await response.json().catch(() => ({}));
    if (!response.ok || !result?.status || !result?.data?.authorization_url) {
      console.error('[Paystack] Initialize failed:', result?.message || response.status);
      return res.status(502).json({ error: result?.message || 'Paystack could not start checkout. Please try again.' });
    }
    return res.json({ authorizationUrl: result.data.authorization_url, reference, planId, amount: plan.amountZar });
  } catch (error: any) {
    console.error('[Paystack] Initialize error:', error?.message || error);
    return res.status(502).json({ error: 'Could not connect to Paystack. Please try again shortly.' });
  }
});

apiRouter.get('/payments/plan', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (req.user!.role !== 'client') return res.status(403).json({ error: 'This endpoint is for client accounts.' });
  return res.json(planUsage(req.user!));
});

apiRouter.post('/payments/paystack/verify', authMiddleware, activeClientOnly, async (req: AuthenticatedRequest, res: Response) => {
  if (!PAYSTACK_PLAN_PURCHASES_ENABLED) return res.status(503).json({ error: 'Paid plans are coming soon while Paystack completes business verification.' });
  const reference = typeof req.body?.reference === 'string' ? req.body.reference.trim() : '';
  if (!reference) return res.status(400).json({ error: 'Payment reference is required.' });
  try {
    const data = await verifyPaystackTransaction(reference);
    const updated = activateFromVerifiedTransaction(data, req.user!.id);
    const { passwordHash: _passwordHash, ...safeUser } = updated;
    return res.json({ message: 'Payment verified and plan activated.', user: safeUser, plan: planUsage(updated) });
  } catch (error: any) {
    return res.status(400).json({ error: error?.message || 'Could not verify payment.' });
  }
});

apiRouter.post('/payments/paystack/webhook', (req: Request, res: Response) => {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const signature = req.header('x-paystack-signature') || '';
  const rawBody = (req as any).rawBody as Buffer | undefined;
  if (!secret || !rawBody || !signature) return res.status(400).send('Invalid webhook request.');
  const expected = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
  const received = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  if (received.length !== expectedBuffer.length || !crypto.timingSafeEqual(received, expectedBuffer)) return res.status(401).send('Invalid signature.');
  const event = req.body;
  if (PAYSTACK_PLAN_PURCHASES_ENABLED && event?.event === 'charge.success') {
    try {
      const metadata = event?.data?.metadata || {};
      const userId = String(metadata.user_id || metadata.userId || '');
      if (userId) activateFromVerifiedTransaction(event.data, userId);
    } catch (error: any) {
      console.error('[Paystack webhook] Could not activate plan:', error?.message || error);
      // Acknowledge signed events; the user can still verify from the callback page.
    }
  }
  return res.status(200).json({ received: true });
});

// ----------------------------------------------------
// AUTH ROUTES
// ----------------------------------------------------

apiRouter.get('/auth/config', (_req: Request, res: Response) => res.json({ provider: 'resend', otpLength: 6 }));

apiRouter.post('/auth/request-otp', async (req: Request, res: Response) => {
  const email = normalizeAuthEmail(req.body?.email);
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  const key = `${clientIp(req)}:${email}`;
  const now = Date.now();
  const last = otpRequestByKey.get(key) || 0;
  if (now - last < OTP_REQUEST_COOLDOWN_MS) {
    const remainingSecs = Math.max(1, Math.ceil((OTP_REQUEST_COOLDOWN_MS - (now - last)) / 1000));
    return res.status(429).json({ error: `Please wait ${remainingSecs} seconds before requesting another login code.` });
  }
  otpRequestByKey.set(key, now);
  const user = db.findUserByEmail(email);
  // Return the same response for unknown accounts to avoid account enumeration.
  if (user && user.status !== 'disabled') {
    try { await requestEmailOtp(email); }
    catch (error: any) {
      otpRequestByKey.delete(key);
      console.error('[AUTH OTP] Resend delivery failed:', error?.message || error);
      return res.status(502).json({ error: 'We could not send your login code. Please try again later.' });
    }
  }
  return res.json({ message: 'If this email is registered with Mid-Ama Promo, a one-time login code has been sent. Check your inbox and spam folder.' });
});

apiRouter.post('/auth/register-artist', async (req: Request, res: Response) => {
  const email = normalizeAuthEmail(req.body?.email);
  const realFirstName = typeof req.body?.realFirstName === 'string' ? req.body.realFirstName.trim() : '';
  const realSurname = typeof req.body?.realSurname === 'string' ? req.body.realSurname.trim() : '';
  const artistName = typeof req.body?.artistName === 'string' ? req.body.artistName.trim() : '';
  if (!email || !/^\S+@\S+\.\S+$/.test(email) || !realFirstName || !realSurname || !artistName) {
    return res.status(400).json({ error: 'Real first name, surname, artist name, and a valid email are required.' });
  }
  if (!remotePersistenceConfigured) return res.status(503).json({ error: 'Registration requires the Neon database to be configured.' });
  if (db.findUserByEmail(email)) return res.status(409).json({ error: 'An account with this email already exists. Please sign in using OTP.' });
  const id = `usr_client_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const created: User = {
    id, email, name: artistName, artistName, realFirstName, realSurname,
    role: 'client', passwordHash: hashPassword(crypto.randomBytes(32).toString('hex')),
    status: 'active', createdAt: new Date().toISOString(), country: 'South Africa',
  };
  try {
    db.createUser(created);
    await requestEmailOtp(email);
    return res.status(201).json({ message: 'Registration received. A one-time verification code has been sent to your email.', email });
  } catch (error: any) {
    console.error('[AUTH REGISTRATION]', error?.message || error);
    return res.status(400).json({ error: error?.message || 'Could not complete registration.' });
  }
});

apiRouter.post('/auth/verify-otp', async (req: Request, res: Response) => {
  const email = normalizeAuthEmail(req.body?.email);
  const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (!/^\d{6}$/.test(code)) return res.status(400).json({ error: 'Enter the 6-digit code sent to your email.' });

  const key = `${clientIp(req)}:${email}`;
  const now = Date.now();
  const existing = otpVerifyAttempts.get(key);
  if (!existing || existing.resetAt <= now) otpVerifyAttempts.set(key, { count: 0, resetAt: now + OTP_VERIFY_WINDOW_MS });
  const state = otpVerifyAttempts.get(key)!;
  if (state.count >= OTP_MAX_VERIFY_ATTEMPTS) return res.status(429).json({ error: 'Too many incorrect code attempts. Please request a new code and try again later.' });

  try { await verifyEmailOtp(email, code); }
  catch (error: any) {
    state.count += 1;
    return res.status(401).json({ error: 'The code is invalid or has expired. Please request a new code.' });
  }

  const user = db.findUserByEmail(email);
  if (!user || user.status === 'disabled') {
    clearSessionCookie(res);
    return res.status(403).json({ error: 'This email is not authorized to access Mid-Ama Promo.' });
  }
  const role = DESIGNATED_ADMIN_EMAILS.includes(email) ? 'admin' : 'client';
  if (user.role !== role) db.updateUser(user.id, { role });
  otpVerifyAttempts.delete(key);
  const token = createSessionToken(user.id);
  setSessionCookie(res, token);
  const { passwordHash: _passwordHash, ...safeUser } = { ...user, role };
  return res.json({ token, user: safeUser });
});

apiRouter.post('/auth/logout', (_req: Request, res: Response) => {
  clearSessionCookie(res);
  return res.json({ message: 'Signed out.' });
});

apiRouter.get('/auth/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const { passwordHash, ...safeUser } = req.user;
  res.json({ user: safeUser });
});

// Client self-report for Spotify for Artists profile claiming.
apiRouter.patch('/auth/spotify-profile-claim', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (req.user.role !== 'client') return res.status(403).json({ error: 'Only client accounts can update this confirmation.' });
  if (typeof req.body?.claimed !== 'boolean') {
    return res.status(400).json({ error: 'Please confirm whether you have claimed your Spotify for Artists profile.' });
  }

  const updated = db.updateUser(req.user.id, {
    spotifyProfileClaimed: req.body.claimed,
    spotifyProfileClaimedAt: req.body.claimed ? new Date().toISOString() : null,
  });
  if (!updated) return res.status(404).json({ error: 'Client account not found.' });
  const { passwordHash: _passwordHash, ...safeUser } = updated;
  return res.json({
    message: req.body.claimed ? 'Spotify profile claim marked as completed.' : 'Spotify profile claim marked as not yet completed.',
    user: safeUser,
  });
});

// Password creation/reset through a bare email is intentionally disabled.
// Authentication is email OTP based; this closes any previous password takeover path.
apiRouter.post('/auth/set-password', (_req: Request, res: Response) => {
  return res.status(410).json({ error: 'Password login has been retired. Use the email one-time login code instead.' });
});

apiRouter.post('/auth/reset-password-direct', (_req: Request, res: Response) => {
  return res.status(410).json({ error: 'Password login has been retired. Use the email one-time login code instead.' });
});

apiRouter.post('/auth/register-invite', (_req: Request, res: Response) => {
  return res.status(410).json({ error: 'Password registration has been retired. Sign in directly using your email one-time code.' });
});

apiRouter.post('/auth/forgot-password', (_req: Request, res: Response) => {
  return res.status(410).json({ error: 'Password recovery is no longer used. Sign in with an email one-time login code.' });
});

apiRouter.post('/auth/reset-password', (_req: Request, res: Response) => {
  return res.status(410).json({ error: 'Password recovery is no longer used. Sign in with an email one-time login code.' });
});

// ----------------------------------------------------
// FILE UPLOAD ROUTES (Artwork & MP3 Audio)
// ----------------------------------------------------

function detectImageDimensions(filePath: string, mime: string): { width: number; height: number } | null {
  const b = fs.readFileSync(filePath);
  if (mime === 'image/png' || b.subarray(0,8).toString('hex') === '89504e470d0a1a0a') {
    if (b.length >= 24) return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
    return null;
  }
  if (mime === 'image/jpeg' || b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const marker = b[i+1]; i += 2;
      if (marker === 0xd8 || marker === 0xd9) continue;
      if (i + 1 >= b.length) break;
      const len = b.readUInt16BE(i);
      if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker) && i + 7 < b.length) {
        return { width: b.readUInt16BE(i+5), height: b.readUInt16BE(i+3) };
      }
      i += len;
    }
  }
  return null;
}

apiRouter.post('/upload/artwork', authMiddleware, activeClientOnly, uploadArtwork.single('artwork'), (req: AuthenticatedRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No artwork image file uploaded.' });
  }

  const detected = detectImageDimensions(req.file.path, req.file.mimetype);
  const parsedWidth = detected?.width;
  const parsedHeight = detected?.height;
  if (!parsedWidth || !parsedHeight) {
    try { fs.unlinkSync(req.file.path); } catch (_) {}
    return res.status(400).json({ error: 'Could not read artwork dimensions. Please upload a valid JPG/PNG image.' });
  }
  if (parsedWidth !== parsedHeight) {
    try { fs.unlinkSync(req.file.path); } catch (_) {}
    return res.status(400).json({ error: `Artwork must be exactly square (received ${parsedWidth}×${parsedHeight}px).` });
  }
  if (parsedWidth < 3000 || parsedWidth > 4000) {
    try { fs.unlinkSync(req.file.path); } catch (_) {}
    return res.status(400).json({ error: `Artwork dimensions must be between 3000×3000 and 4000×4000 pixels (received ${parsedWidth}×${parsedHeight}px).` });
  }

  let storedFilename = req.file.filename;
  let fileUrl = `/uploads/artwork/${req.file.filename}`;
  if (remoteStorageConfigured) { const objectPath = `${req.user!.id}/artwork/${req.file.filename}`; remoteUploadFile(req.file.path, objectPath, req.file.mimetype || 'application/octet-stream'); try { fs.unlinkSync(req.file.path); } catch (_) {} storedFilename = `r2:${objectPath}`; fileUrl = `/api/assets/${encodeRemoteAssetPath(objectPath)}`; }
  res.json({
    success: true,
    message: 'Cover artwork uploaded successfully',
    filename: req.file.originalname,
    storedFilename,
    fileUrl,
    size: req.file.size,
    dimensions: parsedWidth && parsedHeight ? { width: parsedWidth, height: parsedHeight } : undefined
  });
});

apiRouter.post('/upload/audio', authMiddleware, activeClientOnly, uploadAudio.single('audio'), (req: AuthenticatedRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file uploaded.' });
  }

  const audioName = req.file.originalname.toLowerCase();
  const isMp3 = audioName.endsWith('.mp3') || req.file.mimetype === 'audio/mpeg' || req.file.mimetype === 'audio/mp3' || req.file.mimetype === 'audio/x-mp3';
  if (!isMp3) {
    try { fs.unlinkSync(req.file.path); } catch (_) {}
    return res.status(400).json({ error: 'Invalid file format. Master audio must be MP3 only.' });
  }

  let storedFilename = req.file.filename;
  let fileUrl = `/uploads/audio/${req.file.filename}`;
  if (remoteStorageConfigured) { const objectPath = `${req.user!.id}/audio/${req.file.filename}`; remoteUploadFile(req.file.path, objectPath, req.file.mimetype || 'audio/mpeg'); try { fs.unlinkSync(req.file.path); } catch (_) {} storedFilename = `r2:${objectPath}`; fileUrl = `/api/assets/${encodeRemoteAssetPath(objectPath)}`; }
  res.json({
    success: true,
    message: 'MP3 audio master uploaded successfully',
    filename: req.file.originalname,
    storedFilename,
    fileUrl,
    fileSize: req.file.size,
  });
});

// Supporting Document Upload (PDF, DOCX, TXT, CSV)
apiRouter.post('/upload/document', authMiddleware, activeClientOnly, uploadDocument.single('document'), (req: AuthenticatedRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No document file uploaded.' });
  }

  let storedFilename = req.file.filename;
  let fileUrl = `/uploads/documents/${req.file.filename}`;
  if (remoteStorageConfigured) { const objectPath = `${req.user!.id}/documents/${req.file.filename}`; remoteUploadFile(req.file.path, objectPath, req.file.mimetype || 'application/octet-stream'); try { fs.unlinkSync(req.file.path); } catch (_) {} storedFilename = `r2:${objectPath}`; fileUrl = `/api/assets/${encodeRemoteAssetPath(objectPath)}`; }
  res.json({
    success: true,
    message: 'Supporting document uploaded successfully',
    filename: req.file.originalname,
    storedFilename,
    fileUrl,
    fileSize: req.file.size,
  });
});

// ----------------------------------------------------
// SECURE SIGNED ASSET DOWNLOAD SYSTEM
// ----------------------------------------------------

const DOWNLOAD_SECRET = process.env.DOWNLOAD_SECRET || 'mid_ama_promo_secure_signing_salt_2026_x89q';

export interface DownloadTicketPayload {
  releaseId: string;
  assetType: 'artwork' | 'track' | 'document';
  assetId?: string;
  userId: string;
  userRole: 'admin' | 'client';
  filename: string;
  filePath: string;
  contentType: string;
  expiresAt: number; // Unix timestamp in ms
}

export function generateSignedDownloadToken(payload: DownloadTicketPayload): string {
  const jsonStr = JSON.stringify(payload);
  const data = Buffer.from(jsonStr, 'utf-8').toString('base64url');
  const signature = crypto.createHmac('sha256', DOWNLOAD_SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
}

export function verifySignedDownloadToken(token: string): { valid: boolean; payload?: DownloadTicketPayload; error?: string; expired?: boolean } {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) {
      return { valid: false, error: 'Malformed download token.' };
    }
    const [data, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', DOWNLOAD_SECRET).update(data).digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return { valid: false, error: 'Invalid or tampered download token signature.' };
    }

    const payload: DownloadTicketPayload = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8'));
    if (Date.now() > payload.expiresAt) {
      return { valid: false, expired: true, error: 'This download link has expired. Please click Download again to generate a fresh link.' };
    }

    return { valid: true, payload };
  } catch (err: any) {
    return { valid: false, error: 'Failed to verify download token.' };
  }
}

// Generates an official Mid-Ama Promo QC Verification & Metadata Cue Sheet document
export function generateReleaseQcDocument(release: Release): string {
  if (!fs.existsSync(DOCUMENTS_DIR)) {
    fs.mkdirSync(DOCUMENTS_DIR, { recursive: true });
  }

  const docFilename = `${release.refNumber}-QC-Metadata-Sheet.txt`;
  const docPath = path.join(DOCUMENTS_DIR, docFilename);

  const content = `================================================================================
MID-AMA PROMO™ - OFFICIAL DISTRIBUTION QC & METADATA CUE SHEET
Worldwide Digital Music Distribution & Quality Control Administration
Portal: Mid-Ama Promo™ | Contact: midnightamapiano@yahoo.com
================================================================================

RELEASE IDENTIFICATION:
--------------------------------------------------------------------------------
Catalogue Reference:    ${release.refNumber}
Release Title:          ${release.title}
Release Type:           ${release.releaseType}
Primary Artist(s):      ${release.primaryArtists.join(', ')}
Featured Artist(s):     ${release.featuredArtists?.length ? release.featuredArtists.join(', ') : 'None'}
Main Genre:             ${release.genre}
Sub-Genre:              ${release.subGenre || 'Amapiano / Private School Piano'}
Primary Language:       ${release.language || 'Zulu / English / Multilingual'}
Target Release Date:    ${release.targetReleaseDate}
Submission Timestamp:   ${release.submittedAt}
Current Status:         ${release.status.toUpperCase()}
${release.approvalDate ? `Approval Timestamp:     ${release.approvalDate}` : ''}

RECORD LABEL & RIGHTS OWNER DETAILS:
--------------------------------------------------------------------------------
Artist / Record Label:  ${release.artistLabelName}
Client Account Email:   ${release.userEmail}
C-Line (Copyright):     ${release.cLine || `${new Date().getFullYear()} Mid-Ama Promo`}
P-Line (Phonogram):     ${release.pLine || '℗ ' + new Date().getFullYear()}
Composer(s):            ${release.composers?.length ? release.composers.join(', ') : release.primaryArtists.join(', ')}
Producer(s):            ${release.producers?.length ? release.producers.join(', ') : release.primaryArtists.join(', ')}

TECHNICAL QUALITY CONTROL AUDIT:
--------------------------------------------------------------------------------
Master Audio Standard:  MP3 (Verified)
Artwork Standard:       Square 1:1 Aspect Ratio JPG/PNG (Verified)
Artwork Dimensions:     ${release.artworkDimensions ? `${release.artworkDimensions.width}×${release.artworkDimensions.height}px` : 'Square compliant'}
Artwork Source File:    ${release.artworkFilename}
Track Total Count:      ${release.tracks.length} track(s)

SUBMITTED MASTER TRACKLIST & ISRCs:
--------------------------------------------------------------------------------
${release.tracks.map(t => `Track #${t.trackNumber}
  Title:      ${t.title}
  Version:    ${t.version || 'Original Mix'}
  Filename:   ${t.filename}
  File Size:  ${(t.fileSize / (1024 * 1024)).toFixed(2)} MB
  Explicit:   ${t.explicit ? 'YES (Parental Advisory)' : 'NO (Clean / All Audiences)'}
  ISRC:       ${t.isrc || 'Pending DSP Distribution Code'}
`).join('\n')}

ADMINISTRATIVE NOTES & REVIEW:
--------------------------------------------------------------------------------
${release.adminNotes ? release.adminNotes : 'Quality control check verified by Mid-Ama Promo™ Administration.'}
${release.denialReason ? `Denial Reason: ${release.denialReason}` : ''}
${release.clientNotes ? `Client Notes: "${release.clientNotes}"` : ''}

STATUS AUDIT TRAIL:
--------------------------------------------------------------------------------
${(release.statusHistory || []).map(h => `[${h.timestamp}] Status changed to ${h.status} by ${h.updatedBy}${h.note ? ` - Note: "${h.note}"` : ''}`).join('\n')}

================================================================================
CONFIDENTIAL NOTICE: This document contains proprietary metadata submitted to MID-AMA PROMO™.
Master ownership: Free, Starter, and Pro plans are 100% artist-owned. Publishing rights are separate.
================================================================================
`;

  fs.writeFileSync(docPath, content, 'utf-8');
  return docPath;
}

// Endpoint 1: Generate a secure temporary signed download URL (For authenticated Admin and Release Owner)
apiRouter.post('/releases/:id/download-ticket', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const releaseId = req.params.id;
  const { assetType, trackId, documentId } = req.body;
  const user = req.user!;

  if (!assetType || !['artwork', 'track', 'audio', 'document'].includes(assetType)) {
    return res.status(400).json({ error: 'Valid assetType (artwork, track, document) is required.' });
  }

  const release = db.findReleaseById(releaseId);
  if (!release) {
    return res.status(404).json({ error: 'Release not found.' });
  }

  // Strict RBAC: Admin has access to all submitted releases. Customers ONLY to their own releases.
  if (user.role !== 'admin' && release.userId !== user.id) {
    return res.status(403).json({ error: 'Access denied. You can only download assets from your own releases.' });
  }

  let filePath = '';
  let filename = '';
  let contentType = 'application/octet-stream';
  const normAssetType = assetType === 'audio' ? 'track' : assetType;

  if (normAssetType === 'artwork') {
    const storedName = release.storedArtworkFilename || path.basename(release.artworkUrl);
    filePath = path.join(ARTWORK_DIR, storedName);
    filename = release.artworkFilename || `${release.refNumber}-artwork${path.extname(storedName) || '.jpg'}`;
    contentType = filename.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
  } else if (normAssetType === 'track') {
    if (!trackId) {
      const track = release.tracks[0];
      if (!track) return res.status(404).json({ error: 'No audio tracks found in this release.' });
      const storedName = track.storedFilename || path.basename(track.fileUrl);
      filePath = path.join(AUDIO_DIR, storedName);
      filename = track.filename || `${release.refNumber}-track-1.mp3`;
      contentType = 'audio/mpeg';
    } else {
      const track = release.tracks.find(t => t.id === trackId);
      if (!track) return res.status(404).json({ error: 'Audio track not found in this release.' });
      const storedName = track.storedFilename || path.basename(track.fileUrl);
      filePath = path.join(AUDIO_DIR, storedName);
      filename = track.filename || `${release.refNumber}-${track.trackNumber}-${track.title}.mp3`;
      contentType = 'audio/mpeg';
    }
  } else if (normAssetType === 'document') {
    if (documentId && release.documents && release.documents.length > 0) {
      const doc = release.documents.find(d => d.id === documentId);
      if (!doc) return res.status(404).json({ error: 'Document not found in this release.' });
      filePath = path.join(DOCUMENTS_DIR, doc.storedFilename || path.basename(doc.fileUrl));
      filename = doc.filename;
      contentType = 'application/pdf';
    } else if (release.documents && release.documents.length > 0 && !documentId) {
      const doc = release.documents[0];
      filePath = path.join(DOCUMENTS_DIR, doc.storedFilename || path.basename(doc.fileUrl));
      filename = doc.filename;
      contentType = 'application/pdf';
    } else {
      filePath = generateReleaseQcDocument(release);
      filename = `${release.refNumber}-QC-Metadata-Sheet.txt`;
      contentType = 'text/plain; charset=utf-8';
    }
  }

  const selectedStoredName = normAssetType === 'artwork' ? (release.storedArtworkFilename || '') : normAssetType === 'track' ? ((release.tracks.find(t => !trackId || t.id === trackId) || release.tracks[0])?.storedFilename || '') : (documentId ? (release.documents?.find(d => d.id === documentId)?.storedFilename || '') : (release.documents?.[0]?.storedFilename || ''));
  if (selectedStoredName && /^(remote:|r2:)/.test(selectedStoredName)) {
    filePath = selectedStoredName;
  } else if (selectedStoredName && !fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'The requested file is not available in local storage. Legacy non-R2 files require a separately verified migration before download.' });
  } else if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'The requested file no longer exists on the server.' });
  }

  // Temporary signed token valid for 60 seconds
  const expiresAt = Date.now() + 60 * 1000;
  const token = generateSignedDownloadToken({
    releaseId: release.id,
    assetType: normAssetType as 'artwork' | 'track' | 'document',
    assetId: normAssetType === 'track' ? trackId : documentId,
    userId: user.id,
    userRole: user.role,
    filename,
    filePath,
    contentType,
    expiresAt,
  });

  return res.json({
    success: true,
    downloadUrl: `/api/downloads/${token}`,
    filename,
    contentType,
    expiresAt,
    expiresInSeconds: 60,
  });
});

// Endpoint 2: Serve the secure signed download (With expiration, signature, and access validation)
apiRouter.get('/downloads/:token', (req: Request, res: Response) => {
  const token = req.params.token;
  const result = verifySignedDownloadToken(token);

  if (!result.valid) {
    if (result.expired) {
      return res.status(410).json({
        error: 'This download link has expired. Please click Download again to generate a fresh link.',
        expired: true,
        code: 'DOWNLOAD_EXPIRED'
      });
    }
    return res.status(403).json({
      error: result.error || 'Invalid or unauthorized download link.',
    });
  }

  const payload = result.payload!;

  // Verify user still exists and not disabled
  const user = db.findUserById(payload.userId);
  if (!user || user.status === 'disabled') {
    return res.status(403).json({ error: 'User account disabled or not found.' });
  }

  // Verify release still exists
  const release = db.findReleaseById(payload.releaseId);
  if (!release) {
    return res.status(404).json({ error: 'Release no longer exists.' });
  }

  // Verify permissions: admin has access, customer only to own release
  if (user.role !== 'admin' && release.userId !== user.id) {
    return res.status(403).json({ error: 'Unauthorized. You cannot access another customer\'s files.' });
  }

  if (payload.filePath && /^(remote:|r2:)/.test(payload.filePath)) {
    if (payload.filePath.startsWith('/') || payload.filePath.includes('\\')) {
      return res.status(404).json({ error: 'The requested remote asset is not configured.' });
    }
    try {
      return res.redirect(remoteSignedUrlForStoredName(payload.filePath, 120));
    } catch (error: any) {
      return res.status(404).json({ error: `The requested file could not be retrieved from persistent storage: ${error?.message || 'storage error'}` });
    }
  }

  if (!fs.existsSync(payload.filePath)) {
    return res.status(404).json({ error: 'The requested file no longer exists on the server.' });
  }

  res.setHeader('Content-Type', payload.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(payload.filename)}"; filename*=UTF-8''${encodeURIComponent(payload.filename)}`);
  res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  res.download(payload.filePath, payload.filename, (err) => {
    if (err && !res.headersSent) res.status(500).json({ error: 'Error transmitting file.' });
  });
});

// Direct download fallback routes (Support Bearer auth header OR signed token ticket)
apiRouter.get('/releases/:id/download-artwork', (req: Request, res: Response) => {
  // If ticket passed in query
  if (req.query.ticket && typeof req.query.ticket === 'string') {
    return res.redirect(`/api/downloads/${req.query.ticket}`);
  }

  // Otherwise run auth
  authMiddleware(req as AuthenticatedRequest, res, () => {
    const authReq = req as AuthenticatedRequest;
    const release = db.findReleaseById(authReq.params.id);
    if (!release) return res.status(404).json({ error: 'Release not found.' });

    if (authReq.user!.role !== 'admin' && release.userId !== authReq.user!.id) {
      return res.status(403).json({ error: 'Unauthorized. You cannot access another customer\'s files.' });
    }

    const filename = release.storedArtworkFilename || path.basename(release.artworkUrl);
    if (/^(remote:|r2:)/.test(filename)) return res.redirect(remoteSignedUrlForStoredName(filename, 300));
    const filePath = path.join(ARTWORK_DIR, filename);

    if (fs.existsSync(filePath)) {
      return res.download(filePath, release.artworkFilename || `${release.refNumber}-cover.jpg`);
    }
    return res.status(404).json({ error: 'The requested artwork file no longer exists on the server.' });
  });
});

apiRouter.get('/releases/:id/download-track/:trackId', (req: Request, res: Response) => {
  if (req.query.ticket && typeof req.query.ticket === 'string') {
    return res.redirect(`/api/downloads/${req.query.ticket}`);
  }

  authMiddleware(req as AuthenticatedRequest, res, () => {
    const authReq = req as AuthenticatedRequest;
    const release = db.findReleaseById(authReq.params.id);
    if (!release) return res.status(404).json({ error: 'Release not found.' });

    if (authReq.user!.role !== 'admin' && release.userId !== authReq.user!.id) {
      return res.status(403).json({ error: 'Unauthorized. You cannot access another customer\'s files.' });
    }

    const track = release.tracks.find(t => t.id === authReq.params.trackId);
    if (!track) return res.status(404).json({ error: 'Track not found in this release.' });

    const filename = track.storedFilename || path.basename(track.fileUrl);
    if (/^(remote:|r2:)/.test(filename)) return res.redirect(remoteSignedUrlForStoredName(filename, 300));
    const filePath = path.join(AUDIO_DIR, filename);

    if (fs.existsSync(filePath)) {
      return res.download(filePath, track.filename || `${release.refNumber}-${track.trackNumber}-${track.title}.mp3`);
    }
    return res.status(404).json({ error: 'The requested lossless audio file no longer exists on the server.' });
  });
});

apiRouter.get('/releases/:id/download-document', (req: Request, res: Response) => {
  if (req.query.ticket && typeof req.query.ticket === 'string') {
    return res.redirect(`/api/downloads/${req.query.ticket}`);
  }

  authMiddleware(req as AuthenticatedRequest, res, () => {
    const authReq = req as AuthenticatedRequest;
    const release = db.findReleaseById(authReq.params.id);
    if (!release) return res.status(404).json({ error: 'Release not found.' });

    if (authReq.user!.role !== 'admin' && release.userId !== authReq.user!.id) {
      return res.status(403).json({ error: 'Unauthorized. You cannot access another customer\'s files.' });
    }

    const filePath = generateReleaseQcDocument(release);
    const filename = `${release.refNumber}-QC-Metadata-Sheet.txt`;

    if (fs.existsSync(filePath)) {
      return res.download(filePath, filename);
    }
    return res.status(404).json({ error: 'The requested document file no longer exists on the server.' });
  });
});

// Hosted persistent assets. The object path is base64url encoded so slashes are safe in the URL.
apiRouter.get('/assets/:encoded', (req: Request, res: Response) => {
  if (!remoteStorageConfigured) return res.status(404).json({ error: 'Cloudflare R2 asset storage is not enabled.' });
  let objectPath: string;
  try { objectPath = decodeRemoteAssetPath(req.params.encoded); } catch (_) { return res.status(400).json({ error: 'Invalid asset path.' }); }

  let user: User | null = null;
  const token = getAuthTokenFromRequest(req);
  if (token) { const verified = verifySessionToken(token); if (verified) user = db.findUserById(verified.userId) || null; }

  const releaseMatch = db.getReleases().flatMap(r => {
    const paths = [r.storedArtworkFilename, ...(r.tracks || []).map(t => t.storedFilename), ...(r.documents || []).map(d => d.storedFilename)].filter(Boolean) as string[];
    const match = paths.find(p => remoteObjectPathFromStoredName(p) === objectPath);
    return match ? [{ storedName: match, allowed: r.userId === user?.id || r.allowPublicShare || user?.role === 'admin' }] : [];
  })[0];
  const catalogueMatch = db.getCatalogue().flatMap(c => {
    const paths = [c.storedArtworkFilename, ...(c.tracks || []).map(t => t.storedFilename), ...(c.documents || []).map(d => d.storedFilename)].filter(Boolean) as string[];
    const match = paths.find(p => remoteObjectPathFromStoredName(p) === objectPath);
    return match ? [{ storedName: match, allowed: c.userId === user?.id || user?.role === 'admin' }] : [];
  })[0];
  const matched = releaseMatch || catalogueMatch;
  if (!matched || (!matched.allowed && (!user || user.role !== 'admin'))) return res.status(403).json({ error: 'Access denied.' });

  try { return res.redirect(remoteSignedUrlForStoredName(matched.storedName, 300)); }
  catch (error: any) { return res.status(404).json({ error: `Asset unavailable: ${error?.message || 'storage error'}` }); }
});

// ----------------------------------------------------
// RELEASES API
// ----------------------------------------------------

apiRouter.get('/releases', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  if (user.role === 'admin') {
    const releases = db.getReleases();
    return res.json({ releases });
  }

  // Client only ever sees their OWN real releases
  const clientReleases = db.getReleasesByUserId(user.id);
  res.json({ releases: clientReleases });
});

// Admin-controlled royalty value for each release.
apiRouter.patch('/releases/:id/royalty', authMiddleware, adminOnly, (req: AuthenticatedRequest, res: Response) => {
  const existing = db.findReleaseById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Release not found.' });

  const amount = Number(req.body?.amount);
  if (!Number.isFinite(amount) || amount < 0 || amount > 999999999.99) {
    return res.status(400).json({ error: 'Royalty amount must be a valid non-negative Rand value.' });
  }

  const rounded = Math.round((amount + Number.EPSILON) * 100) / 100;
  const updated = db.updateRelease(existing.id, { royaltyAmount: rounded });
  if (!updated) return res.status(404).json({ error: 'Release could not be updated.' });

  res.json({ message: `Royalty for ${updated.title} updated to R${rounded.toFixed(2)}.`, release: updated });
});

apiRouter.get('/releases/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const release = db.findReleaseById(req.params.id);

  if (!release) {
    return res.status(404).json({ error: 'Release not found.' });
  }

  // Client cannot view another client's release
  if (user.role !== 'admin' && release.userId !== user.id) {
    return res.status(403).json({ error: 'Unauthorized to view this release.' });
  }

  res.json({ release });
});

apiRouter.post('/releases', authMiddleware, activeClientOnly, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  if (user.role === 'client') {
    const usage = planUsage(user);
    if (usage.limits.releasesPerMonth !== null && usage.usage.releasesThisMonth >= usage.limits.releasesPerMonth) {
      return res.status(403).json({ error: `You have reached your ${usage.planName} plan limit of ${usage.limits.releasesPerMonth} releases this month. Upgrade your plan to submit more releases.`, code: 'PLAN_RELEASE_LIMIT', plan: usage });
    }
  }
  const {
    title,
    releaseType,
    primaryArtists,
    featuredArtists,
    primaryArtistProfiles,
    featuredArtistProfiles,
    artistProfiles,
    genre,
    subGenre,
    language,
    composers,
    producers,
    targetReleaseDate,
    previouslyReleased,
    previousReleaseDetails,
    cLine,
    pLine,
    artworkUrl,
    artworkFilename,
    storedArtworkFilename,
    artworkDimensions,
    tracks,
    clientNotes,
  } = req.body;

  // Strict Validation
  if (typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Release title is required.' });
  }
  if (!releaseType || !['Single', 'EP', 'Album'].includes(releaseType)) {
    return res.status(400).json({ error: 'Release type must be Single, EP, or Album.' });
  }

  // Determine effective primary artists
  const effectivePrimaryArtists: string[] = (
    Array.isArray(primaryArtists) && primaryArtists.length > 0
      ? primaryArtists
      : Array.isArray(primaryArtistProfiles) && primaryArtistProfiles.length > 0
      ? primaryArtistProfiles.map((p: any) => p.name)
      : []
  ).map((a: string) => (typeof a === 'string' ? a.trim() : '')).filter(Boolean);

  if (effectivePrimaryArtists.length === 0) {
    return res.status(400).json({ error: 'At least one primary artist is required.' });
  }

  if (!genre) {
    return res.status(400).json({ error: 'Genre is required.' });
  }
  if (!targetReleaseDate) {
    return res.status(400).json({ error: 'Target release date is required.' });
  }

  // Strict 14-day release rule: Must be AT LEAST 14 DAYS in the future from today
  const now = new Date();
  const subYear = now.getFullYear();
  const subMonth = now.getMonth();
  const subDate = now.getDate();
  const minAllowedDate = new Date(subYear, subMonth, subDate + 14);

  const dateParts = String(targetReleaseDate).split('-').map(Number);
  const targetDateObj = dateParts.length === 3
    ? new Date(dateParts[0], dateParts[1] - 1, dateParts[2])
    : new Date(targetReleaseDate);

  if (isNaN(targetDateObj.getTime()) || targetDateObj < minAllowedDate) {
    return res.status(400).json({ error: 'Release date must be at least 14 days from today.' });
  }

  // Profile URL validation helper
  const isValidHttpUrl = (str?: string) => {
    if (!str || !str.trim()) return true;
    try {
      const u = new URL(str.trim());
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const allArtistProfiles = [
    ...(Array.isArray(primaryArtistProfiles) ? primaryArtistProfiles : []),
    ...(Array.isArray(featuredArtistProfiles) ? featuredArtistProfiles : []),
    ...(Array.isArray(artistProfiles) ? artistProfiles : []),
  ];
  if (user.role === 'client') {
    const usage = planUsage(user);
    if (usage.limits.artists !== null) {
      const existingArtists = new Set([...(user.artistName || user.name ? [user.artistName || user.name] : []), ...db.getReleases().filter(r => r.userId === user.id).flatMap(releaseArtistNames)].map(n => n.toLocaleLowerCase()));
      const incomingArtists = [
        ...effectivePrimaryArtists,
        ...(Array.isArray(featuredArtists) ? featuredArtists : []),
        ...allArtistProfiles.map((p: any) => p?.name),
        ...(Array.isArray(tracks) ? tracks.flatMap((t: any) => [t?.primaryArtist, ...(Array.isArray(t?.featuredArtists) ? t.featuredArtists : []), ...(Array.isArray(t?.artistProfiles) ? t.artistProfiles.map((p: any) => p?.name) : [])]) : []),
      ].map((n: any) => String(n || '').trim()).filter(Boolean);
      const combined = new Set([...existingArtists, ...incomingArtists.map(n => n.toLocaleLowerCase())]);
      if (combined.size > usage.limits.artists) {
        return res.status(403).json({ error: `Your ${usage.planName} plan allows up to ${usage.limits.artists} unique artist profiles. This release would bring your account to ${combined.size}. Upgrade your plan or remove artists you do not need.`, code: 'PLAN_ARTIST_LIMIT', plan: usage });
      }
    }
  }
  for (const prof of allArtistProfiles) {
    if (!prof?.name?.trim()) return res.status(400).json({ error: 'Every artist must have a name.' });
    if (prof.spotifyProfileUrl && !isValidHttpUrl(prof.spotifyProfileUrl)) {
      return res.status(400).json({ error: `Spotify Artist Profile for "${prof.name}" must be a valid URL when provided.` });
    }
    if (prof.appleMusicProfileUrl && !isValidHttpUrl(prof.appleMusicProfileUrl)) {
      return res.status(400).json({ error: `Apple Music Artist Profile for "${prof.name}" must be a valid URL when provided.` });
    }
  }

  if (!artworkUrl) {
    return res.status(400).json({ error: 'Cover artwork is required.' });
  }
  if (!tracks || !Array.isArray(tracks) || tracks.length === 0) {
    return res.status(400).json({ error: 'At least one MP3 audio track master is required.' });
  }

  // Validate lossless audio files & song artist metadata
  for (let i = 0; i < tracks.length; i++) {
    const t = tracks[i];
    if (!t.title || !t.title.trim()) {
      return res.status(400).json({ error: 'Every audio track must have a track title.' });
    }
    if (!t.filename || !/\.mp3$/i.test(t.filename)) {
      return res.status(400).json({ error: `Track "${t.title}" must be an MP3 audio file.` });
    }

    if ((releaseType === 'EP' || releaseType === 'Album')) {
      if (!t.primaryArtist?.trim()) return res.status(400).json({ error: `Track #${i + 1} requires a Primary Artist.` });
      if (t.primaryArtistSpotifyUrl && !isValidHttpUrl(t.primaryArtistSpotifyUrl)) return res.status(400).json({ error: `Track #${i + 1} Spotify artist profile link must be a valid URL when provided.` });
      if (t.primaryArtistAppleMusicUrl && !isValidHttpUrl(t.primaryArtistAppleMusicUrl)) return res.status(400).json({ error: `Track #${i + 1} Apple Music artist profile link must be a valid URL when provided.` });
    }
    if (Array.isArray(t.artistProfiles)) {
      for (const ap of t.artistProfiles) {
        if (!ap?.name?.trim()) return res.status(400).json({ error: `Track #${i + 1} contains an artist without a name.` });
        if (ap.spotifyProfileUrl && !isValidHttpUrl(ap.spotifyProfileUrl)) return res.status(400).json({ error: `Track #${i + 1} artist "${ap.name}" Spotify profile link must be a valid URL when provided.` });
        if (ap.appleMusicProfileUrl && !isValidHttpUrl(ap.appleMusicProfileUrl)) return res.status(400).json({ error: `Track #${i + 1} artist "${ap.name}" Apple Music profile link must be a valid URL when provided.` });
      }
    }

    // For EP/Episode and Album releases, require artist information for every song
    if (releaseType === 'EP' || releaseType === 'Album') {
      const hasSongArtist = !!t.primaryArtist?.trim();
      if (!hasSongArtist) {
        return res.status(400).json({
          error: `Track #${i + 1} (${t.title || 'Untitled'}) requires a Primary Artist for ${releaseType === 'EP' ? 'Episode/EP' : 'Album'} releases.`
        });
      }
    }
  }

  const refNumber = generateRefNumber();
  const nowIso = new Date().toISOString();

  const newRelease: Release = {
    id: `rel_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId: user.id,
    userEmail: user.email,
    artistLabelName: user.name,
    refNumber,
    title: title.trim(),
    releaseType,
    primaryArtists: effectivePrimaryArtists,
    featuredArtists: Array.isArray(featuredArtists)
      ? featuredArtists.map((a: unknown) => typeof a === 'string' ? a.trim() : '').filter(Boolean)
      : Array.isArray(featuredArtistProfiles)
      ? featuredArtistProfiles.map((p: any) => p.name).filter(Boolean)
      : [],
    primaryArtistProfiles: Array.isArray(primaryArtistProfiles) ? primaryArtistProfiles : undefined,
    featuredArtistProfiles: Array.isArray(featuredArtistProfiles) ? featuredArtistProfiles : undefined,
    artistProfiles: Array.isArray(artistProfiles) ? artistProfiles : undefined,
    genre,
    subGenre: subGenre || undefined,
    language: language || 'Zulu / English',
    composers: Array.isArray(composers) ? composers.map((c: unknown) => typeof c === 'string' ? c.trim() : '').filter(Boolean) : [],
    producers: Array.isArray(producers) ? producers.map((p: unknown) => typeof p === 'string' ? p.trim() : '').filter(Boolean) : [],
    targetReleaseDate,
    previouslyReleased: !!previouslyReleased,
    previousReleaseDetails: previousReleaseDetails || undefined,
    cLine: `${new Date().getFullYear()} Mid-Ama Promo`,
    pLine: `${new Date().getFullYear()} Mid-Ama Promo`,
    artworkUrl,
    artworkFilename: artworkFilename || 'cover.jpg',
    storedArtworkFilename,
    artworkDimensions: artworkDimensions || { width: 1400, height: 1400 },
    tracks: tracks.map((t: any, index: number) => ({
      id: `trk_${Date.now()}_${index + 1}`,
      trackNumber: t.trackNumber || index + 1,
      title: t.title.trim(),
      version: t.version || 'Original Mix',
      filename: t.filename,
      storedFilename: t.storedFilename,
      fileUrl: t.fileUrl,
      fileSize: t.fileSize || 0,
      duration: t.duration || 0,
      isrc: t.isrc || '',
      explicit: !!t.explicit,
      primaryArtist: t.primaryArtist?.trim() || (releaseType === 'Single' ? (effectivePrimaryArtists[0] || user.name) : ''),
      primaryArtistSpotifyUrl: t.primaryArtistSpotifyUrl?.trim() || undefined,
      primaryArtistAppleMusicUrl: t.primaryArtistAppleMusicUrl?.trim() || undefined,
      featuredArtists: Array.isArray(t.featuredArtists) ? t.featuredArtists.filter(Boolean) : [],
      artistProfiles: Array.isArray(t.artistProfiles) ? t.artistProfiles : undefined,
    })),
    clientNotes: clientNotes || '',
    status: 'Pending Review',
    allowPublicShare: true,
    submittedAt: nowIso,
    updatedAt: nowIso,
    statusHistory: [
      {
        status: 'Pending Review',
        note: 'Release submitted by client. Waiting for Administrator review.',
        timestamp: nowIso,
        updatedBy: user.name,
      }
    ]
  };

  const saved = db.createRelease(newRelease);

  // Send complete submission details to midnightamapiano@yahoo.com
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  try {
    await sendAdminReleaseEmail(saved, baseUrl);
  } catch (err) {
    console.error('Error sending admin notification email:', err);
    // Do not fail submission if mail delivery throws
  }

  // Also record client confirmation notification
  await sendNotification({
    recipientEmail: user.email,
    recipientName: user.name,
    subject: `Submission Received: ${saved.title} [${saved.refNumber}] - Mid-Ama Promo™`,
    template: 'submission_received',
    metadata: {
      refNumber: saved.refNumber,
      title: saved.title,
      trackCount: saved.tracks.length,
      targetDate: saved.targetReleaseDate,
    }
  });

  res.status(201).json({
    message: 'Release submitted successfully! Reference number: ' + saved.refNumber,
    release: saved,
  });
});

// Admin Approve Release
apiRouter.post('/releases/:id/approve', authMiddleware, adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  const existing = db.findReleaseById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Release not found.' });

  const now = new Date().toISOString();
  const updatedHistory = [
    ...(existing.statusHistory || []),
    {
      status: 'Approved' as ReleaseStatus,
      note: req.body.note || 'Release approved for worldwide distribution.',
      timestamp: now,
      updatedBy: req.user!.name,
    }
  ];

  const updated = db.updateRelease(existing.id, {
    status: 'Approved',
    approvalDate: now,
    adminNotes: req.body.note || 'Approved by Mid-Ama Promo Administration.',
    statusHistory: updatedHistory,
  });

  // Notify client of approval
  void sendNotification({
    recipientEmail: existing.userEmail,
    recipientName: existing.artistLabelName,
    subject: `Release Approved: ${existing.title} (${existing.refNumber}) - Mid-Ama Promo™`,
    template: 'approved_distribution',
    metadata: {
      refNumber: existing.refNumber,
      title: existing.title,
      approvalDate: now,
      note: req.body.note,
    }
  }).catch((error) => console.error('Release status notification failed:', error));

  res.json({
    message: `Release ${existing.refNumber} has been approved!`,
    release: updated,
  });
});

// Admin-managed pre-save links for approved releases
apiRouter.patch('/releases/:id/presave-links', authMiddleware, adminOnly, (req: AuthenticatedRequest, res: Response) => {
  const existing = db.findReleaseById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Release not found.' });

  if (existing.status !== 'Approved' && existing.status !== 'Completed') {
    return res.status(400).json({ error: 'Pre-save links can only be managed for approved releases.' });
  }

  if (!Array.isArray(req.body?.links)) {
    return res.status(400).json({ error: 'A links array is required.' });
  }

  const links = req.body.links.map((raw: any, index: number) => {
    const label = String(raw?.label || '').trim();
    const url = String(raw?.url || '').trim();
    if (!label) throw new Error(`Pre-save link #${index + 1} requires a label.`);
    if (label.length > 80) throw new Error(`Pre-save link #${index + 1} label is too long.`);
    if (url.length > 2000) throw new Error(`Pre-save link #${index + 1} URL is too long.`);
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error(`Pre-save link #${index + 1} must be a valid URL.`);
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error(`Pre-save link #${index + 1} must use http:// or https://.`);
    }
    return {
      id: String(raw?.id || `presave_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`),
      label,
      url,
    };
  });

  if (links.length > 20) {
    return res.status(400).json({ error: 'A release can have a maximum of 20 pre-save links.' });
  }

  const updated = db.updateRelease(existing.id, { preSaveLinks: links });
  if (!updated) return res.status(404).json({ error: 'Release could not be updated.' });

  res.json({
    message: links.length ? 'Pre-save links updated successfully.' : 'Pre-save links removed.',
    release: updated,
  });
});

// Admin Mark Release Completed / Distributed
apiRouter.post('/releases/:id/complete', authMiddleware, adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  const existing = db.findReleaseById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Release not found.' });

  const now = new Date().toISOString();
  const updatedHistory = [
    ...(existing.statusHistory || []),
    {
      status: 'Completed' as ReleaseStatus,
      note: req.body.note ? `Distribution Completed: ${req.body.note.trim()}` : 'Distribution completed across worldwide DSP streaming platforms.',
      timestamp: now,
      updatedBy: req.user!.name,
    }
  ];

  const updated = db.updateRelease(existing.id, {
    status: 'Completed',
    adminNotes: req.body.note?.trim() || existing.adminNotes,
    statusHistory: updatedHistory,
  });

  // Notify client
  void sendNotification({
    recipientEmail: existing.userEmail,
    recipientName: existing.artistLabelName,
    subject: `Release Distribution Completed: ${existing.title} (${existing.refNumber}) - Mid-Ama Promo™`,
    template: 'approved_distribution',
    metadata: {
      refNumber: existing.refNumber,
      title: existing.title,
      note: req.body.note,
    }
  }).catch((error) => console.error('Release status notification failed:', error));

  res.json({
    message: `Release ${existing.refNumber} marked as Completed.`,
    release: updated,
  });
});

// Admin Deny Release (Requires Reason)
apiRouter.post('/releases/:id/deny', authMiddleware, adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  const { reason } = req.body;
  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: 'A denial reason is required when denying a release.' });
  }

  const existing = db.findReleaseById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Release not found.' });

  const now = new Date().toISOString();
  const updatedHistory = [
    ...(existing.statusHistory || []),
    {
      status: 'Denied' as ReleaseStatus,
      note: `Denied: ${reason.trim()}`,
      timestamp: now,
      updatedBy: req.user!.name,
    }
  ];

  const updated = db.updateRelease(existing.id, {
    status: 'Denied',
    denialReason: reason.trim(),
    adminNotes: reason.trim(),
    statusHistory: updatedHistory,
  });

  // Notify client of denial with reason
  void sendNotification({
    recipientEmail: existing.userEmail,
    recipientName: existing.artistLabelName,
    subject: `Release Denied: ${existing.title} (${existing.refNumber}) - Mid-Ama Promo™`,
    template: 'denied',
    metadata: {
      refNumber: existing.refNumber,
      title: existing.title,
      reason: reason.trim(),
    }
  }).catch((error) => console.error('Release status notification failed:', error));

  res.json({
    message: `Release ${existing.refNumber} has been denied.`,
    release: updated,
  });
});

// Admin Request Corrections
apiRouter.post('/releases/:id/request-corrections', authMiddleware, adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  const { note } = req.body;
  if (!note || !note.trim()) {
    return res.status(400).json({ error: 'Please specify the corrections required from the artist.' });
  }

  const existing = db.findReleaseById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Release not found.' });

  const now = new Date().toISOString();
  const updatedHistory = [
    ...(existing.statusHistory || []),
    {
      status: 'Corrections Required' as ReleaseStatus,
      note: `Corrections Required: ${note.trim()}`,
      timestamp: now,
      updatedBy: req.user!.name,
    }
  ];

  const updated = db.updateRelease(existing.id, {
    status: 'Corrections Required',
    adminNotes: note.trim(),
    statusHistory: updatedHistory,
  });

  // Notify client
  void sendNotification({
    recipientEmail: existing.userEmail,
    recipientName: existing.artistLabelName,
    subject: `Corrections Required: ${existing.title} (${existing.refNumber}) - Mid-Ama Promo™`,
    template: 'corrections_required',
    metadata: {
      refNumber: existing.refNumber,
      title: existing.title,
      note: note.trim(),
    }
  }).catch((error) => console.error('Release status notification failed:', error));

  res.json({
    message: `Corrections requested for ${existing.refNumber}.`,
    release: updated,
  });
});

// ----------------------------------------------------
// PUBLIC SHARE / SHOWCASE (If allowed)
// ----------------------------------------------------

apiRouter.get('/public/share/:refNumber', (req: Request, res: Response) => {
  const refNumber = req.params.refNumber;
  const release = db.findReleaseByRef(refNumber);

  if (!release) {
    return res.status(404).json({ error: 'Release not found. Please verify reference number.' });
  }

  if (!release.allowPublicShare || release.status === 'Denied') {
    return res.status(403).json({ error: 'This release showcase is currently restricted.' });
  }

  const publicData = {
    refNumber: release.refNumber,
    title: release.title,
    releaseType: release.releaseType,
    primaryArtists: release.primaryArtists,
    featuredArtists: release.featuredArtists,
    genre: release.genre,
    subGenre: release.subGenre,
    language: release.language,
    targetReleaseDate: release.targetReleaseDate,
    artworkUrl: release.artworkUrl,
    artistLabelName: release.artistLabelName,
    status: release.status,
    tracks: release.tracks.map(t => ({
      id: t.id,
      trackNumber: t.trackNumber,
      title: t.title,
      version: t.version,
      fileUrl: t.fileUrl,
      duration: t.duration,
      explicit: t.explicit,
    })),
  };

  res.json({ release: publicData });
});

// ----------------------------------------------------
// ADMIN DASHBOARD & REAL CLIENT REGISTRATION
// ----------------------------------------------------

// Admin Diagnostic Endpoint reporting safe persistence and connectivity status without secrets
apiRouter.get('/admin/diagnostic', authMiddleware, adminOnly, (_req: AuthenticatedRequest, res: Response) => {
  const isConfigured = remotePersistenceConfigured;
  const dbOk = isConfigured ? remoteCheckDatabase() : false;
  const storageOk = remoteCheckStorage();
  const authOk = isConfigured ? remoteCheckAuth() : false;

  res.json({
    persistenceMode: isConfigured ? 'neon-postgres' : 'local-json',
    neonConfigured: isConfigured,
    databaseConfigured: dbOk,
    storageConfigured: storageOk,
    storageProvider: remoteStorageConfigured ? 'cloudflare-r2' : 'not-configured',
    authConfigured: authOk,
  });
});

apiRouter.get('/admin/persistence-health', authMiddleware, adminOnly, (_req: AuthenticatedRequest, res: Response) => {
  const isConfigured = remotePersistenceConfigured;
  const dbOk = isConfigured ? remoteCheckDatabase() : false;
  const storageOk = remoteCheckStorage();
  const authOk = isConfigured ? remoteCheckAuth() : false;

  res.json({
    persistenceMode: isConfigured ? 'neon-postgres' : 'local-json',
    neonConfigured: isConfigured,
    databaseConfigured: dbOk,
    storageConfigured: storageOk,
    storageProvider: remoteStorageConfigured ? 'cloudflare-r2' : 'not-configured',
    authConfigured: authOk,
    persistence: db.getPersistenceInfo(),
  });
});

function calculateRoyaltySummary(userId: string) {
  const releases = db.getReleasesByUserId(userId);
  const totalEarnings = releases.reduce((sum, r) => sum + Math.max(0, Number(r.royaltyAmount || 0)), 0);
  const withdrawals = db.getWithdrawalsByUserId(userId);
  const pendingAmount = withdrawals.filter(w => w.status === 'pending').reduce((sum, w) => sum + w.amount, 0);
  const paidAmount = withdrawals.filter(w => w.status === 'paid').reduce((sum, w) => sum + w.amount, 0);
  const availableAmount = Math.max(0, totalEarnings - pendingAmount - paidAmount);
  return {
    totalEarnings: Number(totalEarnings.toFixed(2)),
    pendingAmount: Number(pendingAmount.toFixed(2)),
    paidAmount: Number(paidAmount.toFixed(2)),
    availableAmount: Number(availableAmount.toFixed(2)),
  };
}

apiRouter.get('/royalties/summary', authMiddleware, activeClientOnly, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const summary = calculateRoyaltySummary(userId);
  const withdrawals = db.getWithdrawalsByUserId(userId);
  res.json({ ...summary, withdrawals });
});

apiRouter.post('/royalties/withdrawals', authMiddleware, activeClientOnly, (req: AuthenticatedRequest, res: Response) => {
  if (req.user!.role !== 'client') return res.status(403).json({ error: 'Only client accounts can request a royalty withdrawal.' });

  const { amount, bankName, accountHolder, accountNumber, branchCode, accountType, notes, liabilityAcknowledged } = req.body || {};
  const normalizedAmount = Number(amount);
  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) return res.status(400).json({ error: 'Enter a valid withdrawal amount greater than R0.00.' });
  if (!String(bankName || '').trim()) return res.status(400).json({ error: 'Bank name is required.' });
  if (!String(accountHolder || '').trim()) return res.status(400).json({ error: 'Account holder name is required.' });
  if (!/^[0-9]{4,20}$/.test(String(accountNumber || '').replace(/\s+/g, ''))) return res.status(400).json({ error: 'Account number must contain 4–20 digits.' });
  if (!/^[0-9]{4,10}$/.test(String(branchCode || '').replace(/\s+/g, ''))) return res.status(400).json({ error: 'Branch code must contain 4–10 digits.' });
  if (!['Cheque', 'Savings', 'Transmission', 'Other'].includes(accountType)) return res.status(400).json({ error: 'Select a valid account type.' });
  if (liabilityAcknowledged !== true) return res.status(400).json({ error: 'You must confirm that the banking details are correct.' });

  const summary = calculateRoyaltySummary(req.user!.id);
  const roundedAmount = Math.round((normalizedAmount + Number.EPSILON) * 100) / 100;
  if (roundedAmount > summary.availableAmount) return res.status(400).json({ error: `The maximum available amount is R${summary.availableAmount.toFixed(2)}.` });

  const withdrawal: WithdrawalRequest = {
    id: `wd_${Date.now()}_${crypto.randomBytes(5).toString('hex')}`,
    userId: req.user!.id,
    userEmail: req.user!.email,
    clientName: req.user!.name,
    amount: roundedAmount,
    currency: 'ZAR',
    bankName: String(bankName).trim(),
    accountHolder: String(accountHolder).trim(),
    accountNumber: String(accountNumber).replace(/\s+/g, ''),
    branchCode: String(branchCode).replace(/\s+/g, ''),
    accountType,
    notes: String(notes || '').trim() || undefined,
    liabilityAcknowledged: true,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  let created: WithdrawalRequest;
  try {
    created = db.createWithdrawal(withdrawal);
  } catch (error: any) {
    return res.status(400).json({ error: error?.message || 'The withdrawal could not be created.' });
  }
  const nextSummary = calculateRoyaltySummary(req.user!.id);
  res.status(201).json({ message: 'Withdrawal request submitted successfully. Your banking details have been sent to Mid-Ama Promo administration.', withdrawal: created, summary: nextSummary });
});

apiRouter.get('/admin/royalties/withdrawals', authMiddleware, adminOnly, (_req: AuthenticatedRequest, res: Response) => {
  res.json({ withdrawals: db.getWithdrawals() });
});

apiRouter.patch('/admin/royalties/withdrawals/:id', authMiddleware, adminOnly, (req: AuthenticatedRequest, res: Response) => {
  const existing = db.getWithdrawals().find(w => w.id === req.params.id);
  if (!existing) return res.status(404).json({ error: 'Withdrawal request not found.' });
  const status = req.body?.status;
  if (!['paid', 'rejected'].includes(status)) return res.status(400).json({ error: 'Withdrawal status must be paid or rejected.' });
  if (existing.status !== 'pending') return res.status(400).json({ error: 'This withdrawal request has already been processed.' });

  const updated = db.updateWithdrawal(existing.id, {
    status,
    processedAt: new Date().toISOString(),
    processedBy: req.user!.email,
    adminNote: String(req.body?.adminNote || '').trim() || undefined,
  });
  if (!updated) return res.status(404).json({ error: 'Withdrawal request could not be updated.' });
  res.json({ message: status === 'paid' ? 'Withdrawal marked as paid.' : 'Withdrawal rejected. The amount is available to the client again.', withdrawal: updated });
});

apiRouter.get('/admin/stats', authMiddleware, adminOnly, (_req: AuthenticatedRequest, res: Response) => {
  const releases = db.getReleases();
  const users = db.getUsers().filter(u => u.role === 'client');

  const totalClients = users.length;
  const totalReleases = releases.length;
  const pendingReviews = releases.filter(r => r.status === 'Pending Review').length;
  const correctionsRequired = releases.filter(r => r.status === 'Corrections Required').length;
  const approved = releases.filter(r => r.status === 'Approved').length;
  const denied = releases.filter(r => r.status === 'Denied').length;

  res.json({
    stats: {
      totalClients,
      totalReleases,
      pendingReviews,
      correctionsRequired,
      approved,
      denied,
    }
  });
});

apiRouter.get('/admin/clients', authMiddleware, adminOnly, (_req: AuthenticatedRequest, res: Response) => {
  const users = db.getUsers().filter(u => u.role === 'client');
  const releases = db.getReleases();

  const clientsWithStats = users.map(u => {
    const clientReleases = releases.filter(r => r.userId === u.id);
    const { passwordHash, ...safeUser } = u;
    return {
      ...safeUser,
      releasesCount: clientReleases.length,
      releases: clientReleases,
      privateAccessUrl: u.inviteToken ? `/register?invite=${u.inviteToken}` : null,
    };
  });

  res.json({ clients: clientsWithStats });
});

// Admin Register Client Manually (Client creates their password upon first visit, or admin sets it)
apiRouter.post('/admin/clients/register', authMiddleware, adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  const { email, name, realFirstName, realSurname, phone, country } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid client email address is required.' });
  }
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Artist name is required.' });
  }
  const normalizedFirstName = typeof realFirstName === 'string' ? realFirstName.trim() : '';
  const normalizedSurname = typeof realSurname === 'string' ? realSurname.trim() : '';

  const existing = db.findUserByEmail(email.trim());
  if (existing) {
    return res.status(400).json({ error: 'A client account with this email address already exists.' });
  }

  const now = new Date().toISOString();
  const passwordHash = hashPassword(generateToken());
  const status: 'active' = 'active';

  const newClient: User = {
    id: `usr_client_${Date.now()}`,
    email: email.trim().toLowerCase(),
    name: name.trim(),
    artistName: name.trim(),
    realFirstName: normalizedFirstName || undefined,
    realSurname: normalizedSurname || undefined,
    role: 'client',
    passwordHash,
    status,
    phone: phone?.trim() || '',
    country: country?.trim() || 'South Africa',
    createdAt: now,
  };

  db.createUser(newClient);

  // Internal audit log
  await sendNotification({
    recipientEmail: newClient.email,
    recipientName: newClient.name,
    subject: 'Mid-Ama Promo™ - Client Account Registered',
    template: 'invitation',
    metadata: {
      registeredBy: req.user!.name,
      status: newClient.status,
    }
  });

  const { passwordHash: _hash, ...safeUser } = newClient;
  res.status(201).json({
    message: `Client "${newClient.name}" successfully registered. They can sign in using the one-time code sent to ${newClient.email}.`,
    client: safeUser,
    hasDirectPassword: false,
  });
});

// Password management is retired. All client authentication uses email OTP.
apiRouter.post('/admin/clients/:id/password', authMiddleware, adminOnly, (_req: AuthenticatedRequest, res: Response) => {
  return res.status(410).json({ error: 'Client passwords are retired. Clients sign in with an email one-time code.' });
});

// Admin: Access client account without client password (support & management)
apiRouter.post('/admin/clients/:id/access-session', authMiddleware, adminOnly, (req: AuthenticatedRequest, res: Response) => {
  const targetId = req.params.id;
  const targetClient = db.findUserById(targetId);
  if (!targetClient) {
    return res.status(404).json({ error: 'Client account not found.' });
  }
  if (targetClient.role !== 'client') {
    return res.status(403).json({ error: 'Access denied. You can only access client accounts.' });
  }

  // Issue a fresh authenticated session token for the target client.
  // The client's existing password remains completely untouched and is never read, stored, or revealed.
  const clientToken = createSessionToken(targetClient.id, 2 * 60 * 60);
  const { passwordHash: _hash, ...safeClient } = targetClient;

  return res.json({
    message: `Access granted for client ${targetClient.name}.`,
    token: clientToken,
    client: safeClient,
  });
});

// Admin update client status (enable/disable)
apiRouter.patch('/admin/clients/:id', authMiddleware, adminOnly, (req: AuthenticatedRequest, res: Response) => {
  const { status, name, realFirstName, realSurname, phone, disabledReason, planId } = req.body;
  const client = db.findUserById(req.params.id);

  if (!client || client.role !== 'client') {
    return res.status(404).json({ error: 'Client not found.' });
  }

  const updates: Partial<User> = {};
  if (status && ['active', 'disabled', 'pending_activation'].includes(status)) {
    updates.status = status;
    if (status === 'disabled') {
      const reason = typeof disabledReason === 'string' ? disabledReason.trim() : '';
      if (!reason) return res.status(400).json({ error: 'A reason is required when banning / terminating a client account.' });
      updates.disabledReason = reason;
    } else if (status === 'active') {
      updates.disabledReason = undefined;
    }
  }
  if (name) { updates.name = name.trim(); updates.artistName = name.trim(); }
  if (realFirstName !== undefined) updates.realFirstName = typeof realFirstName === 'string' ? realFirstName.trim() : '';
  if (realSurname !== undefined) updates.realSurname = typeof realSurname === 'string' ? realSurname.trim() : '';
  if (phone !== undefined) updates.phone = phone.trim();
  if (planId !== undefined) {
    if (!['free', 'starter', 'pro'].includes(planId)) {
      return res.status(400).json({ error: 'Choose Free, Starter, or Pro.' });
    }
    updates.planId = planId;
    if (planId === 'free') {
      updates.planExpiresAt = null;
      updates.planActivatedAt = null;
    } else {
      // Admin plan overrides are intended for testing/support and last 30 days.
      updates.planExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      updates.planActivatedAt = new Date().toISOString();
    }
  }

  const updated = db.updateUser(client.id, updates);
  const { passwordHash, ...safeUser } = updated!;
  res.json({ message: 'Client account updated.', client: safeUser });
});

// Admin delete client account
apiRouter.delete('/admin/clients/:id', authMiddleware, adminOnly, (req: AuthenticatedRequest, res: Response) => {
  const client = db.findUserById(req.params.id);
  if (!client || client.role !== 'client') {
    return res.status(404).json({ error: 'Client account not found.' });
  }

  const success = db.deleteUser(client.id);
  if (!success) {
    return res.status(500).json({ error: 'Failed to delete client account.' });
  }

  res.json({ success: true, message: `Client "${client.name}" successfully deleted.` });
});

// Admin get single client's submitted releases
apiRouter.get('/admin/clients/:id/releases', authMiddleware, adminOnly, (req: AuthenticatedRequest, res: Response) => {
  const client = db.findUserById(req.params.id);
  if (!client) return res.status(404).json({ error: 'Client not found.' });

  const clientReleases = db.getReleasesByUserId(client.id);
  res.json({ client, releases: clientReleases });
});

// ----------------------------------------------------
// ADMIN DATA SAFETY / BACKUP & CATALOGUE
// ----------------------------------------------------

const backupUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, os.tmpdir()),
    filename: (_req, file, cb) => cb(null, `midama-restore-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${path.extname(file.originalname) || '.tar.gz'}`),
  }),
  limits: { fileSize: 2 * 1024 * 1024 * 1024 },
});

apiRouter.get('/admin/backup/export', authMiddleware, adminOnly, (req: AuthenticatedRequest, res: Response) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'midama-backup-'));
  const archive = path.join(tempDir, `mid-ama-promo-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.tar.gz`);
  try {
    // The archive is a complete copy of the persistent application state.
    execFileSync('tar', ['-czf', archive, '-C', process.cwd(), 'data/db.json', 'uploads'], { stdio: 'ignore' });
    res.download(archive, path.basename(archive), err => {
      fs.rmSync(tempDir, { recursive: true, force: true });
      if (err && !res.headersSent) res.status(500).json({ error: 'Backup download failed.' });
    });
  } catch (error: any) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    res.status(500).json({ error: `Backup export failed: ${error?.message || 'tar is unavailable on this server.'}` });
  }
});

apiRouter.post('/admin/backup/import', authMiddleware, adminOnly, backupUpload.single('backup'), (req: AuthenticatedRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'Select a Mid-Ama Promo .tar.gz backup file.' });
  const archive = req.file.path;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'midama-restore-'));
  try {
    const listing = execFileSync('tar', ['-tzf', archive], { encoding: 'utf8' });
    const entries = listing.split('\n').map(x => x.trim()).filter(Boolean);
    const unsafe = entries.some(entry => {
      const n = entry.replace(/\\/g, '/');
      return n.startsWith('/') || n.split('/').includes('..') || (!['data/db.json', 'uploads'].some(prefix => n === prefix || n.startsWith(prefix + '/')));
    });
    if (unsafe) return res.status(400).json({ error: 'Backup contains unsafe paths and was rejected.' });

    execFileSync('tar', ['-xzf', archive, '-C', tempDir, '--no-same-owner', '--no-same-permissions']);
    const backupDbPath = path.join(tempDir, 'data', 'db.json');
    if (!fs.existsSync(backupDbPath)) return res.status(400).json({ error: 'Backup is missing data/db.json.' });
    const snapshot = JSON.parse(fs.readFileSync(backupDbPath, 'utf8'));
    const result = db.importAdditive(snapshot);

    let assetsRestored = 0;
    const backupUploads = path.join(tempDir, 'uploads');
    const copyMissing = (currentDir: string, backupDir: string) => {
      if (!fs.existsSync(backupDir)) return;
      for (const name of fs.readdirSync(backupDir)) {
        const src = path.join(backupDir, name);
        const dst = path.join(currentDir, name);
        const stat = fs.statSync(src);
        if (stat.isDirectory()) {
          fs.mkdirSync(dst, { recursive: true });
          copyMissing(dst, src);
        } else if (stat.isFile() && !fs.existsSync(dst)) {
          fs.mkdirSync(path.dirname(dst), { recursive: true });
          fs.copyFileSync(src, dst);
          assetsRestored++;
        }
      }
    };
    copyMissing(UPLOADS_DIR, backupUploads);
    res.json({ success: true, message: 'Backup imported additively. Existing records and files were preserved.', ...result, assetsRestored });
  } catch (error: any) {
    res.status(400).json({ error: `Backup import failed: ${error?.message || 'Invalid backup archive.'}` });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
    fs.rmSync(archive, { force: true });
  }
});

apiRouter.get('/catalogue', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const entries = db.getCatalogueByUserId(user.id).map(entry => ({
    ...entry,
    release: entry.releaseId ? db.findReleaseById(entry.releaseId) || null : null,
  }));
  res.json({ entries });
});

function buildCatalogueEntryPayload(body: any, client: User, adminId: string, existing?: CatalogueEntry): CatalogueEntry {
  const now = new Date().toISOString();
  const legacyRelease = existing?.releaseId ? db.findReleaseById(existing.releaseId) : undefined;
  const primaryArtists = Array.isArray(body.primaryArtists)
    ? body.primaryArtists.map((x: any) => String(x).trim()).filter(Boolean)
    : (body.primaryArtist ? [String(body.primaryArtist).trim()] : []);
  const featuredArtists = Array.isArray(body.featuredArtists)
    ? body.featuredArtists.map((x: any) => String(x).trim()).filter(Boolean)
    : [];
  const composers = Array.isArray(body.composers)
    ? body.composers.map((x: any) => String(x).trim()).filter(Boolean)
    : [];
  const producers = Array.isArray(body.producers)
    ? body.producers.map((x: any) => String(x).trim()).filter(Boolean)
    : [];

  const tracks = Array.isArray(body.tracks) ? body.tracks.map((t: any, index: number) => ({
    id: t.id || `cat_trk_${Date.now()}_${index + 1}_${crypto.randomBytes(3).toString('hex')}`,
    trackNumber: Number(t.trackNumber || index + 1),
    title: String(t.title || body.title || '').trim(),
    version: String(t.version || 'Original Mix').trim(),
    filename: String(t.filename || '').trim(),
    storedFilename: t.storedFilename || undefined,
    fileUrl: String(t.fileUrl || '').trim(),
    fileSize: Number(t.fileSize || 0),
    duration: Number(t.duration || 0),
    isrc: String(t.isrc || body.isrc || '').trim(),
    explicit: !!t.explicit,
  })).filter((t: any) => t.title) : (existing?.tracks || []);

  const entry: CatalogueEntry = {
    id: existing?.id || `cat_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    releaseId: existing?.releaseId || (body.releaseId ? String(body.releaseId) : undefined),
    userId: existing?.userId || client.id,
    title: String(body.title ?? existing?.title ?? legacyRelease?.title ?? '').trim(),
    artistLabelName: String(body.artistLabelName ?? existing?.artistLabelName ?? legacyRelease?.artistLabelName ?? client.name).trim(),
    releaseType: ['Single', 'EP', 'Album'].includes(body.releaseType) ? body.releaseType : (existing?.releaseType || legacyRelease?.releaseType || 'Single'),
    primaryArtists: primaryArtists.length ? primaryArtists : (existing?.primaryArtists?.length ? existing.primaryArtists : (legacyRelease?.primaryArtists || [client.name])),
    featuredArtists: featuredArtists.length ? featuredArtists : (existing?.featuredArtists || legacyRelease?.featuredArtists || []),
    genre: String(body.genre ?? existing?.genre ?? legacyRelease?.genre ?? '').trim(),
    subGenre: body.subGenre !== undefined ? String(body.subGenre || '').trim() || undefined : (existing?.subGenre || legacyRelease?.subGenre),
    language: body.language !== undefined ? String(body.language || '').trim() || undefined : (existing?.language || legacyRelease?.language),
    composers: composers.length ? composers : (existing?.composers?.length ? existing.composers : (legacyRelease?.composers || [])),
    producers: producers.length ? producers : (existing?.producers?.length ? existing.producers : (legacyRelease?.producers || [])),
    isrc: body.isrc !== undefined ? String(body.isrc || '').trim() || undefined : existing?.isrc,
    upc: body.upc !== undefined ? String(body.upc || '').trim() || undefined : existing?.upc,
    catalogueReleaseDate: body.catalogueReleaseDate !== undefined ? String(body.catalogueReleaseDate || '').trim() || undefined : existing?.catalogueReleaseDate,
    previouslyReleased: body.previouslyReleased !== undefined ? !!body.previouslyReleased : (existing?.previouslyReleased ?? true),
    previousReleaseDetails: body.previousReleaseDetails !== undefined ? String(body.previousReleaseDetails || '').trim() || undefined : existing?.previousReleaseDetails,
    cLine: `${new Date().getFullYear()} Mid-Ama Promo`,
    pLine: `${new Date().getFullYear()} Mid-Ama Promo`,
    artworkUrl: body.artworkUrl !== undefined ? String(body.artworkUrl || '').trim() || undefined : (existing?.artworkUrl || legacyRelease?.artworkUrl),
    artworkFilename: body.artworkFilename !== undefined ? String(body.artworkFilename || '').trim() || undefined : (existing?.artworkFilename || legacyRelease?.artworkFilename),
    storedArtworkFilename: body.storedArtworkFilename !== undefined ? String(body.storedArtworkFilename || '').trim() || undefined : (existing?.storedArtworkFilename || legacyRelease?.storedArtworkFilename),
    artworkDimensions: body.artworkDimensions || existing?.artworkDimensions || legacyRelease?.artworkDimensions,
    tracks: tracks.length ? tracks : (legacyRelease?.tracks || []),
    documents: Array.isArray(body.documents) ? body.documents : (existing?.documents || legacyRelease?.documents || []),
    notes: body.notes !== undefined ? String(body.notes || '').trim() : (existing?.notes || legacyRelease?.clientNotes),
    addedAt: existing?.addedAt || now,
    addedBy: existing?.addedBy || adminId,
    distributionStatus: ['Not Queued', 'Ready for SoundBlast', 'Submitted to SoundBlast', 'Distributed', 'Rejected'].includes(body.distributionStatus)
      ? body.distributionStatus : (existing?.distributionStatus || 'Not Queued'),
    distributionNote: body.distributionNote !== undefined ? String(body.distributionNote || '').trim() || undefined : existing?.distributionNote,
    updatedAt: now,
  };

  if (!entry.title) throw new Error('Song/release title is required.');
  if (!entry.primaryArtists.length) throw new Error('At least one primary artist is required.');
  if (!entry.genre) throw new Error('Genre is required.');
  return entry;
}

apiRouter.post('/admin/catalogue', authMiddleware, adminOnly, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'A registered client is required.' });
    const client = db.findUserById(String(userId));
    if (!client || client.role !== 'client') return res.status(404).json({ error: 'Client account not found.' });

    const entry = buildCatalogueEntryPayload(req.body, client, req.user!.id);
    db.addCatalogueEntry(entry);
    res.status(201).json({ message: 'Catalogue record created.', entry });
  } catch (error: any) {
    res.status(400).json({ error: error?.message || 'Could not create catalogue record.' });
  }
});

apiRouter.get('/admin/catalogue', authMiddleware, adminOnly, (_req: AuthenticatedRequest, res: Response) => {
  const entries = db.getCatalogue().map(entry => {
    const release = entry.releaseId ? db.findReleaseById(entry.releaseId) || null : null;
    const clientUser = db.findUserById(entry.userId);
    const { passwordHash, ...client } = clientUser || ({} as User);
    // Legacy linked entries pre-date the standalone catalogue model, so expose their release metadata consistently.
    const merged = release ? {
      ...entry,
      title: entry.title || release.title,
      artistLabelName: entry.artistLabelName || release.artistLabelName,
      releaseType: entry.releaseType || release.releaseType,
      primaryArtists: entry.primaryArtists?.length ? entry.primaryArtists : release.primaryArtists,
      featuredArtists: entry.featuredArtists?.length ? entry.featuredArtists : release.featuredArtists,
      genre: entry.genre || release.genre,
      language: entry.language || release.language,
      composers: entry.composers?.length ? entry.composers : (release.composers || []),
      producers: entry.producers?.length ? entry.producers : (release.producers || []),
      artworkUrl: entry.artworkUrl || release.artworkUrl,
      artworkFilename: entry.artworkFilename || release.artworkFilename,
      tracks: entry.tracks?.length ? entry.tracks : release.tracks,
    } : entry;
    return { ...merged, release, client: clientUser ? client : null };
  }).filter(entry => entry.client);
  res.json({ entries });
});

apiRouter.post('/admin/catalogue/add-existing-release', authMiddleware, adminOnly, (req: AuthenticatedRequest, res: Response) => {
  const { userId, releaseId } = req.body;
  if (!userId || !releaseId) return res.status(400).json({ error: 'Client and existing release are required.' });
  const client = db.findUserById(userId);
  if (!client || client.role !== 'client') return res.status(404).json({ error: 'Client account not found.' });
  const release = db.findReleaseById(releaseId);
  if (!release) return res.status(404).json({ error: 'Existing release not found.' });
  if (release.userId !== client.id) return res.status(409).json({ error: 'This release belongs to a different client. The original owner cannot be changed by catalogue linking.' });
  const existing = db.findCatalogueEntry(release.id, client.id);
  if (existing) return res.status(409).json({ error: 'This release is already in the client catalogue.', entry: existing });
  const now = new Date().toISOString();
  const entry: CatalogueEntry = {
    id: `cat_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    releaseId: release.id,
    userId: client.id,
    title: release.title,
    artistLabelName: release.artistLabelName,
    releaseType: release.releaseType,
    primaryArtists: release.primaryArtists,
    featuredArtists: release.featuredArtists,
    genre: release.genre,
    subGenre: release.subGenre,
    language: release.language,
    composers: release.composers || [],
    producers: release.producers || [],
    previouslyReleased: release.previouslyReleased,
    previousReleaseDetails: release.previousReleaseDetails,
    cLine: release.cLine,
    pLine: release.pLine,
    artworkUrl: release.artworkUrl,
    artworkFilename: release.artworkFilename,
    storedArtworkFilename: release.storedArtworkFilename,
    artworkDimensions: release.artworkDimensions,
    tracks: release.tracks,
    documents: release.documents,
    notes: release.clientNotes,
    addedAt: now,
    addedBy: req.user!.id,
    distributionStatus: 'Ready for SoundBlast',
    updatedAt: now,
  };
  db.addCatalogueEntry(entry);
  res.status(201).json({ message: 'Existing release added to the client catalogue.', entry, release, client });
});

apiRouter.patch('/admin/catalogue/:id', authMiddleware, adminOnly, (req: AuthenticatedRequest, res: Response) => {
  try {
    const existing = db.findCatalogueById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Catalogue entry not found.' });
    const client = db.findUserById(existing.userId);
    if (!client || client.role !== 'client') return res.status(404).json({ error: 'Catalogue client no longer exists.' });
    const entry = buildCatalogueEntryPayload(req.body, client, existing.addedBy, existing);
    db.updateCatalogueEntry(existing.id, entry);
    res.json({ message: 'Catalogue entry updated.', entry });
  } catch (error: any) {
    res.status(400).json({ error: error?.message || 'Could not update catalogue entry.' });
  }
});

// ----------------------------------------------------
// TAKEDOWN REQUESTS
// ----------------------------------------------------
apiRouter.post('/releases/:id/takedown-request', authMiddleware, activeClientOnly, (req: AuthenticatedRequest, res: Response) => {
  const release = db.findReleaseById(req.params.id);
  if (!release) return res.status(404).json({ error: 'Release not found.' });
  if (req.user!.role !== 'admin' && release.userId !== req.user!.id) return res.status(403).json({ error: 'Access denied.' });
  if (release.status === 'Takedown Completed' || release.status === 'Takedown Processing') return res.status(400).json({ error: 'A takedown is already being processed for this release.' });
  const updated = db.updateRelease(release.id, { status: 'Takedown Requested', statusHistory: [...(release.statusHistory || []), { status: 'Takedown Requested', timestamp: new Date().toISOString(), updatedBy: req.user!.name, note: 'Takedown requested by client.' }] });
  if (updated) void sendAdminTakedownEmail(updated);
  res.json({ message: 'Takedown request submitted.', release: updated });
});

apiRouter.post('/releases/:id/takedown-process', authMiddleware, adminOnly, (req: AuthenticatedRequest, res: Response) => {
  const release = db.findReleaseById(req.params.id);
  if (!release) return res.status(404).json({ error: 'Release not found.' });
  const status = req.body?.status === 'Takedown Completed' ? 'Takedown Completed' : 'Takedown Processing';
  const history = [...(release.statusHistory || []), { status: status as ReleaseStatus, timestamp: new Date().toISOString(), updatedBy: req.user!.name, note: req.body?.note || 'Admin updated takedown status.' }];
  const updated = db.updateRelease(release.id, { status: status as ReleaseStatus, statusHistory: history });
  res.json({ message: `Takedown status updated to ${status}.`, release: updated });
});

// ----------------------------------------------------
// ENQUIRIES / CONTACT
// ----------------------------------------------------

apiRouter.post('/enquiries', (req: Request, res: Response) => {
  const { name, email, phone, subject, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }

  const enquiry = db.createEnquiry({
    id: `enq_${Date.now()}`,
    name: name.trim(),
    email: email.trim(),
    phone: phone?.trim() || '',
    subject: subject?.trim() || 'General Music Distribution Enquiry',
    message: message.trim(),
    createdAt: new Date().toISOString(),
    status: 'new',
  });

  void sendAdminEnquiryEmail(enquiry);
  res.status(201).json({
    message: 'Enquiry received. Mid-Ama Promo administration will review your message.',
    enquiry,
  });
});

apiRouter.get('/admin/enquiries', authMiddleware, adminOnly, (_req: AuthenticatedRequest, res: Response) => {
  const enquiries = db.getEnquiries();
  res.json({ enquiries });
});

apiRouter.patch('/admin/enquiries/:id', authMiddleware, adminOnly, (req: AuthenticatedRequest, res: Response) => {
  const { status } = req.body;
  if (!status || !['new', 'read', 'replied'].includes(status)) {
    return res.status(400).json({ error: 'Valid status required.' });
  }
  const updated = db.updateEnquiryStatus(req.params.id, status);
  if (!updated) return res.status(404).json({ error: 'Enquiry not found.' });
  res.json({ message: 'Enquiry updated.', enquiry: updated });
});

// ----------------------------------------------------
// NOTIFICATIONS AUDIT LOG
// ----------------------------------------------------

apiRouter.get('/notifications', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const allNotifs = db.getNotifications();

  if (user.role === 'admin') {
    return res.json({ notifications: allNotifs });
  }

  const clientNotifs = allNotifs.filter(n => n.recipientEmail.toLowerCase() === user.email.toLowerCase());
  res.json({ notifications: clientNotifs });
});
