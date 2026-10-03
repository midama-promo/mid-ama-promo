import { db } from './db.ts';
import type { NotificationLog, Release } from './db.ts';

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
