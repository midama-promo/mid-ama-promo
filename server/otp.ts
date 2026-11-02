import 'dotenv/config';
import crypto from 'node:crypto';
import { remoteStoreOtp, remoteConsumeOtp, remoteDeleteOtp } from './remote.ts';

const OTP_SECRET = process.env.OTP_HASH_SECRET || process.env.MID_AMA_SESSION_SECRET || '';
const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const EMAIL_FROM = process.env.EMAIL_FROM || '';

function hashCode(email: string, code: string): string {
  if (!OTP_SECRET) throw new Error('OTP_HASH_SECRET or MID_AMA_SESSION_SECRET must be configured.');
  return crypto.createHmac('sha256', OTP_SECRET).update(`${email}:${code}`).digest('hex');
}

async function sendOtpEmail(email: string, code: string): Promise<void> {
  if (!RESEND_API_KEY || !EMAIL_FROM) throw new Error('Resend is not configured. Set RESEND_API_KEY and EMAIL_FROM.');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [email],
      subject: 'Your Mid-Ama Promo login code',
      text: `Your Mid-Ama Promo verification code is ${code}. It expires in 10 minutes. If you did not request this code, you can ignore this email.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto"><h2>Mid-Ama Promo</h2><p>Your one-time verification code is:</p><p style="font-size:30px;font-weight:bold;letter-spacing:8px">${code}</p><p>This code expires in 10 minutes. If you did not request it, ignore this email.</p></div>`,
    }),
  });
  if (!response.ok) throw new Error(`Resend email delivery failed (${response.status}): ${await response.text()}`);
}

export async function requestEmailOtp(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  const code = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  remoteStoreOtp(normalized, hashCode(normalized, code), expiresAt);
  try { await sendOtpEmail(normalized, code); }
  catch (error) { remoteDeleteOtp(normalized); throw error; }
}

export async function verifyEmailOtp(email: string, token: string): Promise<{ email: string }> {
  const normalized = email.trim().toLowerCase();
  const candidateHash = hashCode(normalized, token.trim());
  // One atomic DELETE both validates and consumes the OTP, preventing parallel replay.
  if (!remoteConsumeOtp(normalized, candidateHash)) {
    throw new Error('The code is invalid or has expired.');
  }
  return { email: normalized };
}
