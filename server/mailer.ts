import { db } from './db.ts';
import type { NotificationLog, Release } from './db.ts';

export interface AnnouncementEmailTarget {
  userId: string;
  email: string;
  name: string;
  isLegacy?: boolean;
}

export interface AnnouncementEmailResult {
  userId: string;
  email: string;
  success: boolean;
  resendId?: string;
  error?: string;
}

const ANNOUNCEMENT_EMAIL_FROM = process.env.EMAIL_FROM || 'Mid-Ama Promo <no-reply@midamapromo.co.za>'; // Same verified sender configuration as OTP

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Sends one Resend batch. The OTP sender in server/otp.ts is intentionally untouched. */
export async function sendAnnouncementBatch(
  targets: AnnouncementEmailTarget[],
  subject: string,
  message: string,
  idempotencyKey = `midama-announcement-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
): Promise<AnnouncementEmailResult[]> {
  if (!targets.length) return [];
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured on the server.');
  if (targets.length > 100) throw new Error('Announcement batches cannot exceed 100 recipients.');

  const emails = targets.map(target => {
    const greeting = target.isLegacy
      ? `${target.name.trim()}\n\nEmail: ${target.email}`
      : (target.name?.trim() ? `Hello ${target.name.trim()},` : 'Hello,');
    const htmlGreeting = target.isLegacy ? target.name.trim() : greeting;
    const text = `${greeting}\n\n${message}\n\nKind regards,\nMid-Ama Promo Support\nhttps://distro.midamapromo.co.za/`;
    const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;color:#171717;line-height:1.65"><div style="background:#111;color:#fff;padding:22px 26px;border-bottom:4px solid #dc2626"><strong style="font-size:20px;letter-spacing:.3px">MID-AMA PROMO</strong><div style="font-size:12px;color:#d4d4d4;margin-top:4px">Music Distribution · Client Support</div></div><div style="padding:28px 26px;background:#fff"><p>${escapeHtml(htmlGreeting)}</p><div style="white-space:pre-wrap">${escapeHtml(target.isLegacy ? `Email: ${target.email}\n\n${message}` : message)}</div><p style="margin-top:28px">Kind regards,<br><strong>Mid-Ama Promo Support</strong></p></div><div style="padding:16px 26px;background:#f5f5f5;color:#737373;font-size:12px">Need assistance? Contact <a href="mailto:midnightamapiano@yahoo.com">midnightamapiano@yahoo.com</a>.<br><a href="https://distro.midamapromo.co.za/">distro.midamapromo.co.za</a></div></div>`;
    return { from: ANNOUNCEMENT_EMAIL_FROM, to: [target.email], subject, text, html };
  });

  const response = await fetch('https://api.resend.com/emails/batch', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey.slice(0, 256) },
    body: JSON.stringify(emails),
  });
  const responseText = await response.text();
  if (!response.ok) throw new Error(`Resend batch delivery failed (${response.status}): ${responseText.slice(0, 1000)}`);

  let payload: any = {};
  try { payload = responseText ? JSON.parse(responseText) : {}; } catch (_) {}
  const sentItems = Array.isArray(payload?.data) ? payload.data : [];
  if (sentItems.length !== targets.length) {
    throw new Error('Resend returned an unexpected batch response. Delivery status may be uncertain; check the Resend logs before attempting another send.');
  }
  return targets.map((target, index) => ({
    userId: target.userId,
    email: target.email,
    success: true,
    resendId: sentItems[index]?.id,
  }));
}

interface SendNotificationOptions {
  recipientEmail: string;
  recipientName: string;
  subject: string;
  template: 'invitation' | 'submission_received' | 'status_change' | 'corrections_required' | 'approved_distribution' | 'denied' | 'password_reset' | string;
  metadata: Record<string, any>;
}

async function sendResendEmail(to: string, subject: string, text: string, html?: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'Mid-Ama Promo <no-reply@midamapromo.co.za>';
  if (!apiKey) {
    console.warn('[EMAIL] RESEND_API_KEY is not configured; email was recorded but not delivered:', subject);
    return;
  }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, text, ...(html ? { html } : {}) }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend email delivery failed (${response.status}): ${body}`);
  }
}

export async function sendNotification(options: SendNotificationOptions): Promise<NotificationLog> {
  const notif: NotificationLog = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    recipientEmail: options.recipientEmail,
    recipientName: options.recipientName,
    subject: options.subject,
    template: options.template,
    metadata: options.metadata,
    sentAt: new Date().toISOString(),
    status: 'delivered',
  };
  db.createNotification(notif);
  return notif;
}

function artistProfileLines(release: Release): string {
  const all = [
    ...(release.primaryArtistProfiles || []),
    ...(release.featuredArtistProfiles || []),
  ];
  const lines = all.map(a => `- ${a.role || 'artist'}: ${a.name}\n  Spotify: ${a.spotifyProfileUrl || 'PROFILE CREATION REQUESTED'}\n  Apple Music: ${a.appleMusicProfileUrl || 'PROFILE CREATION REQUESTED'}`);
  release.tracks.forEach((t, i) => {
    (t.artistProfiles || []).forEach(a => lines.push(`- Track ${i + 1} ${a.role || 'artist'}: ${a.name}\n  Spotify: ${a.spotifyProfileUrl || 'PROFILE CREATION REQUESTED'}\n  Apple Music: ${a.appleMusicProfileUrl || 'PROFILE CREATION REQUESTED'}`));
  });
  return lines.length ? lines.join('\n') : 'No artist profile links supplied.';
}

export async function sendAdminReleaseEmail(release: Release, baseUrl: string): Promise<NotificationLog> {
  const tracklistSummary = release.tracks.map((t, idx) =>
    `  ${idx + 1}. ${t.title} (${t.version || 'Original Mix'}) - ${t.filename}\n     Audio: ${baseUrl}${t.fileUrl}`
  ).join('\n');

  const fullEmailBody = `
MID-AMA PROMO™ — NEW RELEASE SUBMISSION

Reference: ${release.refNumber}
Release: ${release.title}
Type: ${release.releaseType}
Client / Artist: ${release.artistLabelName}
Client email: ${release.userEmail}
Target release date: ${release.targetReleaseDate}
Genre: ${release.genre}${release.subGenre ? ` / ${release.subGenre}` : ''}
Language: ${release.language || 'Unspecified'}

PRIMARY ARTISTS:
${release.primaryArtists.join(', ')}

FEATURED / SECONDARY ARTISTS:
${release.featuredArtists?.length ? release.featuredArtists.join(', ') : 'None'}

ARTIST PROFILE LINKS:
${artistProfileLines(release)}

COMPOSERS:
${release.composers?.length ? release.composers.join(', ') : 'None supplied'}

PRODUCERS:
${release.producers?.length ? release.producers.join(', ') : 'None supplied'}

RIGHTS:
C-Line: ${release.cLine || 'N/A'}
P-Line: ${release.pLine || 'N/A'}

ARTWORK:
${release.artworkFilename}
Dimensions: ${release.artworkDimensions ? `${release.artworkDimensions.width}×${release.artworkDimensions.height}px` : 'N/A'}
Artwork: ${baseUrl}${release.artworkUrl}

TRACKS:
${tracklistSummary}

CLIENT NOTES:
${release.clientNotes || 'None'}

ADMIN PORTAL:
${baseUrl}?view=admin

The complete submission remains available in the Mid-Ama Promo Admin Portal for review and secure download.
`;

  try {
    await sendResendEmail(
      process.env.ADMIN_NOTIFICATION_EMAIL || 'midnightamapiano@yahoo.com',
      `[NEW SUBMISSION] ${release.title} — ${release.refNumber}`,
      fullEmailBody,
      `<pre style="font-family:Arial,sans-serif;white-space:pre-wrap">${fullEmailBody.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>`
    );
  } catch (error: any) {
    console.error('[EMAIL] New submission email failed:', error?.message || error);
  }

  const notif: NotificationLog = {
    id: `notif_admin_${Date.now()}`,
    recipientEmail: process.env.ADMIN_NOTIFICATION_EMAIL || 'midnightamapiano@yahoo.com',
    recipientName: 'Mid-Ama Promo Head Office',
    subject: `[NEW SUBMISSION] ${release.title} by ${release.primaryArtists.join(', ')} (${release.refNumber})`,
    template: 'submission_received',
    metadata: {
      refNumber: release.refNumber,
      title: release.title,
      artist: release.primaryArtists.join(', '),
      clientEmail: release.userEmail,
      trackCount: release.tracks.length,
      artworkUrl: `${baseUrl}${release.artworkUrl}`,
      reviewUrl: `${baseUrl}?view=admin`,
      artistProfileLinks: release.primaryArtistProfiles || [],
      body: fullEmailBody,
    },
    sentAt: new Date().toISOString(),
    status: 'delivered',
  };

  db.createNotification(notif);
  return notif;
}

export async function sendAdminEnquiryEmail(enquiry: { name: string; email: string; subject: string; message: string }): Promise<void> {
  const body = `A client submitted a query through the Mid-Ama Promo portal.\n\nFrom: ${enquiry.name}\nEmail: ${enquiry.email}\nSubject: ${enquiry.subject}\n\n${enquiry.message}`;
  try { await sendResendEmail(process.env.ADMIN_NOTIFICATION_EMAIL || 'midnightamapiano@yahoo.com', `[CLIENT QUERY] ${enquiry.subject}`, body); }
  catch (error: any) { console.error('[EMAIL] Client query email failed:', error?.message || error); }
}

export async function sendAdminTakedownEmail(release: Release): Promise<void> {
  const body = `A takedown request was submitted.\n\nReference: ${release.refNumber}\nRelease: ${release.title}\nArtist: ${release.primaryArtists.join(', ')}\nClient: ${release.artistLabelName}\nEmail: ${release.userEmail}\nStatus: ${release.status}\n\nOpen the Admin Portal to process the request.`;
  try { await sendResendEmail(process.env.ADMIN_NOTIFICATION_EMAIL || 'midnightamapiano@yahoo.com', `[TAKEDOWN REQUEST] ${release.title} — ${release.refNumber}`, body); }
  catch (error: any) { console.error('[EMAIL] Takedown email failed:', error?.message || error); }
}
