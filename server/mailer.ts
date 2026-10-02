import { db } from './db.ts';
import type { NotificationLog, Release } from './db.ts';

interface SendNotificationOptions {
  recipientEmail: string;
  recipientName: string;
  subject: string;
  template: 'invitation' | 'submission_received' | 'status_change' | 'corrections_required' | 'approved_distribution' | 'denied' | 'password_reset';
  metadata: Record<string, any>;
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

  console.log(`[EMAIL DISPATCH] To: ${options.recipientEmail} (${options.recipientName}) | Subject: ${options.subject}`);
  
  db.createNotification(notif);
  return notif;
}

// Dedicated email delivery to midnightamapiano@yahoo.com when a client submits a release
export async function sendAdminReleaseEmail(release: Release, baseUrl: string): Promise<NotificationLog> {
  const tracklistSummary = release.tracks.map((t, idx) => 
    `  ${idx + 1}. ${t.title} (${t.version || 'Original Mix'}) - File: ${t.filename} [Download: ${baseUrl}${t.fileUrl}]`
  ).join('\n');

  const fullEmailBody = `
=====================================================
MID-AMA PROMO™ - NEW CLIENT RELEASE SUBMISSION RECEIVED
=====================================================

A new music release has been successfully submitted by an artist/client for review.

RELEASE DETAILS:
- Reference Number: ${release.refNumber}
- Release Title:    ${release.title}
- Release Type:     ${release.releaseType}
- Primary Artist(s):${release.primaryArtists.join(', ')}
- Featured Artist(s):${release.featuredArtists && release.featuredArtists.length > 0 ? release.featuredArtists.join(', ') : 'None'}
- Genre:            ${release.genre}${release.subGenre ? ` (${release.subGenre})` : ''}
- Language:         ${release.language || 'Unspecified'}
- Target Release:   ${release.targetReleaseDate}
- Client / Label:   ${release.artistLabelName} (${release.userEmail})

CREDITS & METADATA:
- Composer(s):      ${release.composers && release.composers.length > 0 ? release.composers.join(', ') : 'N/A'}
- Producer(s):      ${release.producers && release.producers.length > 0 ? release.producers.join(', ') : 'N/A'}
- Copyright (C):    ${release.cLine || 'N/A'}
- Sound Rec (P):    ${release.pLine || 'N/A'}

TRACKLIST (${release.tracks.length} MP3 audio master(s)):
${tracklistSummary}

COVER ARTWORK:
- Artwork File:     ${release.artworkFilename}
- Dimensions:       ${release.artworkDimensions ? `${release.artworkDimensions.width}x${release.artworkDimensions.height}px` : 'Square'}
- Artwork URL:      ${baseUrl}${release.artworkUrl}

CLIENT NOTES:
${release.clientNotes ? `"${release.clientNotes}"` : 'None provided'}

ADMIN ACTION REQUIRED:
Open the Mid-Ama Promo Admin Portal to review, play audio, download masters, and approve or deny:
${baseUrl}?view=admin

This complete release and all uploaded master MP3s and cover artwork are securely stored and backed up on the Mid-Ama Promo server.
=====================================================
  `;

  console.log(`[ADMIN NOTIFICATION DISPATCH to midnightamapiano@yahoo.com]:\n${fullEmailBody}`);

  const notif: NotificationLog = {
    id: `notif_admin_${Date.now()}`,
    recipientEmail: 'midnightamapiano@yahoo.com',
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
      body: fullEmailBody,
    },
    sentAt: new Date().toISOString(),
    status: 'delivered',
  };

  db.createNotification(notif);
  return notif;
}
