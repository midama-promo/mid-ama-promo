export type UserRole = 'admin' | 'client';
export type UserStatus = 'active' | 'pending_activation' | 'disabled';

export interface User {
  id: string;
  email: string;
  name: string;
  realFirstName?: string;
  realSurname?: string;
  artistName?: string;
  role: UserRole;
  status: UserStatus;
  disabledReason?: string;
  phone?: string;
  country?: string;
  createdAt: string;
  inviteToken?: string;
  releasesCount?: number;
  releases?: Release[];
  latestRelease?: string | null;
  privateAccessUrl?: string | null;
  /** Client-confirmed Spotify for Artists profile claim status. */
  spotifyProfileClaimed?: boolean;
  spotifyProfileClaimedAt?: string | null;
  planId?: 'free' | 'starter' | 'pro';
  planExpiresAt?: string | null;
  planActivatedAt?: string | null;
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

export type ReleaseType = 'Single' | 'EP' | 'Album';

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

export interface ReleaseDocumentItem {
  id: string;
  title: string;
  filename: string;
  storedFilename?: string;
  fileUrl: string;
  fileSize: number;
  uploadedAt: string;
}

export interface StatusHistoryItem {
  status: ReleaseStatus;
  note?: string;
  timestamp: string;
  updatedBy: string;
}

export interface PreSaveLink {
  id: string;
  label: string;
  url: string;
}

export interface Release {
  /** Royalty earnings assigned by the administrator for this release. Stored in ZAR. */
  royaltyAmount?: number;
  id: string;
  userId: string;
  userEmail: string;
  artistLabelName: string;
  refNumber: string;
  title: string;
  releaseType: ReleaseType;
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
  cLine?: string;
  pLine?: string;
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
  statusHistory?: StatusHistoryItem[];
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

export interface NotificationLog {
  id: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  template: 'invitation' | 'submission_received' | 'status_change' | 'corrections_required' | 'approved_distribution' | 'denied' | 'password_reset';
  metadata: Record<string, any>;
  sentAt: string;
  status: 'delivered' | 'queued';
}

export interface AdminStats {
  totalClients: number;
  totalReleases: number;
  pendingReviews: number;
  correctionsRequired: number;
  approved: number;
  denied: number;
}
