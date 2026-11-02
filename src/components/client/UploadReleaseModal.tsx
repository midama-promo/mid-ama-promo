import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Upload,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Music,
  ArrowRight,
  ArrowLeft,
  Disc,
  Calendar,
  Layers,
  FileCheck2,
  Play,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  Save,
  BookmarkCheck,
  AlertCircle,
  Check,
  FileText,
  Users,
  ExternalLink,
  Info
} from 'lucide-react';
import { api } from '../../services/api';
import { Release, ReleaseType, ArtistCredit, TrackItem } from '../../types';
import { AudioPlayer } from '../common/AudioPlayer';
import { useAuth } from '../../context/AuthContext';

interface UploadReleaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newRelease: Release) => void;
}

export interface TrackPrimaryArtist {
  name: string;
  spotifyProfileUrl?: string;
  appleMusicProfileUrl?: string;
  spotifyProfileCreateRequested?: boolean;
  appleMusicProfileCreateRequested?: boolean;
}

export interface TrackFeaturedArtist {
  name: string;
  spotifyProfileUrl?: string;
  appleMusicProfileUrl?: string;
  spotifyProfileCreateRequested?: boolean;
  appleMusicProfileCreateRequested?: boolean;
}

type ArtistProfilePlatform = 'spotify' | 'apple';

interface ArtistProfileFieldProps {
  platform: ArtistProfilePlatform;
  url?: string;
  createRequested?: boolean;
  onUrlChange: (value: string) => void;
  onCreateRequested: () => void;
  onUseExisting: () => void;
  compact?: boolean;
}

const ArtistProfileField: React.FC<ArtistProfileFieldProps> = ({
  platform,
  url = '',
  createRequested = false,
  onUrlChange,
  onCreateRequested,
  onUseExisting,
  compact = false,
}) => {
  const isSpotify = platform === 'spotify';
  const label = isSpotify ? 'Spotify Artist Profile' : 'Apple Music Artist Profile';
  const placeholder = isSpotify
    ? 'https://open.spotify.com/artist/...'
    : 'https://music.apple.com/.../artist/...';
  const createLabel = isSpotify ? 'Create new Spotify profile' : 'Create new Apple Music profile';

  return (
    <div>
      <label className={`block ${compact ? 'text-[10px]' : 'text-[11px]'} font-semibold text-neutral-400 mb-1`}>
        {label}
      </label>

      <div className="flex flex-wrap gap-1.5 mb-1.5">
        <button
          type="button"
          onClick={onUseExisting}
          className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition-colors ${
            !createRequested
              ? 'bg-neutral-800 border-neutral-600 text-white'
              : 'bg-neutral-950 border-neutral-800 text-neutral-500 hover:text-neutral-300'
          }`}
        >
          Use existing profile
        </button>
        <button
          type="button"
          onClick={onCreateRequested}
          className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition-colors ${
            createRequested
              ? 'bg-red-950/60 border-red-700 text-red-300'
              : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
          }`}
        >
          {createLabel}
        </button>
      </div>

      {createRequested ? (
        <div className="rounded-lg border border-red-900/50 bg-red-950/20 px-2.5 py-2 text-[10px] leading-relaxed text-neutral-400">
          No profile URL is required. This release will be submitted with a request to create a new {isSpotify ? 'Spotify' : 'Apple Music'} artist profile.
        </div>
      ) : (
        <input
          type="url"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 ${compact ? 'text-xs' : 'text-xs'} text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-red-600 font-mono`}
        />
      )}
    </div>
  );
};

export interface AudioTrackFormItem {
  id: string;
  trackNumber: number;
  title: string;
  version: string;
  file: File | null;
  fileUrl?: string;
  filename?: string;
  storedFilename?: string;
  fileSize?: number;
  duration?: number;
  isrc?: string;
  explicit?: boolean;
  uploading?: boolean;
  uploadProgress?: number;
  uploadError?: string;
  uploadedSuccess?: boolean;
  primaryArtist?: string;
  primaryArtists?: TrackPrimaryArtist[];
  primaryArtistSpotifyUrl?: string;
  primaryArtistAppleMusicUrl?: string;
  primaryArtistSpotifyProfileCreateRequested?: boolean;
  primaryArtistAppleMusicProfileCreateRequested?: boolean;
  featuredArtists?: TrackFeaturedArtist[];
}

export interface ArtistFormItem {
  id: string;
  name: string;
  spotifyProfileUrl: string;
  appleMusicProfileUrl: string;
  spotifyProfileCreateRequested?: boolean;
  appleMusicProfileCreateRequested?: boolean;
}

export const UploadReleaseModal: React.FC<UploadReleaseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const getMinTargetDate = (): string => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  };

  const minTargetDate = getMinTargetDate();

  // Step 1: Real Metadata
  const [title, setTitle] = useState('');
  const [releaseType, setReleaseType] = useState<ReleaseType>('Single');
  const [primaryArtistsList, setPrimaryArtistsList] = useState<ArtistFormItem[]>([
    { id: 'pa_1', name: '', spotifyProfileUrl: '', appleMusicProfileUrl: '', spotifyProfileCreateRequested: false, appleMusicProfileCreateRequested: false },
  ]);
  const [rememberedPrimaryArtists, setRememberedPrimaryArtists] = useState<string[]>([]);
  useEffect(() => {
    try { const saved = JSON.parse(localStorage.getItem('midama-primary-artists-v1') || '[]'); setRememberedPrimaryArtists(Array.isArray(saved) ? saved.filter((v): v is string => typeof v === 'string' && v.trim()) : []); } catch { setRememberedPrimaryArtists([]); }
  }, []);
  useEffect(() => {
    const ownName = (user?.name || '').trim().toLocaleLowerCase();
    const names = primaryArtistsList.map(a => (a?.name || '').trim()).filter(n => Boolean(n) && n.toLocaleLowerCase() !== ownName);
    if (!names.length) return;
    const merged = Array.from(new Set([...rememberedPrimaryArtists, ...names]));
    if (merged.length !== rememberedPrimaryArtists.length || merged.some((n, i) => n !== rememberedPrimaryArtists[i])) {
      setRememberedPrimaryArtists(merged); try { localStorage.setItem('midama-primary-artists-v1', JSON.stringify(merged)); } catch {}
    }
  }, [primaryArtistsList, user?.name]);
  const [featuredArtistsList, setFeaturedArtistsList] = useState<ArtistFormItem[]>([]);
  const [genre, setGenre] = useState('Amapiano');
  const [subGenre, setSubGenre] = useState('');
  const [language, setLanguage] = useState('Zulu');
  const [composerInput, setComposerInput] = useState('');
  const [composers, setComposers] = useState<string[]>([]);
  const [producerInput, setProducerInput] = useState('');
  const [producers, setProducers] = useState<string[]>([]);
  useEffect(() => {
    const legalName = (user?.name || '').trim();
    if (!legalName) return;
    setComposers(current => current.includes(legalName) ? current : [legalName, ...current]);
    setProducers(current => current.includes(legalName) ? current : [legalName, ...current]);
  }, [user?.name]);
  const [targetReleaseDate, setTargetReleaseDate] = useState(minTargetDate);
  const [previouslyReleased, setPreviouslyReleased] = useState(false);
  const [previousReleaseDetails, setPreviousReleaseDetails] = useState('');
  const currentCopyright = `${new Date().getFullYear()} Mid-Ama Promo`;
  const [cLine] = useState(currentCopyright);
  const [pLine] = useState(currentCopyright);

  // Step 2: Cover Artwork Upload
  const localPreviewRef = useRef<string | null>(null);
  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [artworkPreviewUrl, setArtworkPreviewUrl] = useState<string | null>(null);
  const [artworkDimensions, setArtworkDimensions] = useState<{ width: number; height: number } | null>(null);
  const [artworkValidationError, setArtworkValidationError] = useState<string | null>(null);
  const [artworkUploading, setArtworkUploading] = useState(false);
  const [uploadedArtworkUrl, setUploadedArtworkUrl] = useState<string | null>(null);
  const [uploadedArtworkFilename, setUploadedArtworkFilename] = useState<string | null>(null);
  const [storedArtworkFilename, setStoredArtworkFilename] = useState<string | null>(null);

  // Step 3: Tracks (Audio Upload)
  const [tracks, setTracks] = useState<AudioTrackFormItem[]>([
    {
      id: 'trk_1',
      trackNumber: 1,
      title: '',
      version: 'Original Mix',
      file: null,
      explicit: false,
      primaryArtist: '',
      primaryArtists: [{ name: '', spotifyProfileUrl: '', appleMusicProfileUrl: '', spotifyProfileCreateRequested: false, appleMusicProfileCreateRequested: false }],
      primaryArtistSpotifyUrl: '',
      primaryArtistAppleMusicUrl: '',
      primaryArtistSpotifyProfileCreateRequested: false,
      primaryArtistAppleMusicProfileCreateRequested: false,
      featuredArtists: [],
    },
  ]);

  // Step 4: Client Notes & Final Confirmation
  const [clientNotes, setClientNotes] = useState('');
  const [confirmedAccuracy, setConfirmedAccuracy] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedRelease, setSubmittedRelease] = useState<Release | null>(null);

  // Draft & Unsaved Progress State
  const DRAFT_KEY = `midama_release_draft_v2_${user?.id || 'anonymous'}`;
  const [hasDraftNotice, setHasDraftNotice] = useState(false);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [draftToast, setDraftToast] = useState<string | null>(null);

  const isValidUrl = (urlStr: string): boolean => {
    if (!urlStr || !urlStr.trim()) return true;
    try {
      const u = new URL(urlStr.trim());
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  };

  // Prefill primary artist name from signed in user if empty
  useEffect(() => {
    if (user?.name && primaryArtistsList.length === 1 && !primaryArtistsList[0].name.trim()) {
      setPrimaryArtistsList([
        {
          id: 'pa_1',
          name: user.name,
          spotifyProfileUrl: '',
          appleMusicProfileUrl: '',
        },
      ]);
    }
  }, [user]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (localPreviewRef.current) {
        URL.revokeObjectURL(localPreviewRef.current);
        localPreviewRef.current = null;
      }
    };
  }, []);

  // When modal is opened/closed
  useEffect(() => {
    if (isOpen) {
      try {
        const saved = localStorage.getItem(DRAFT_KEY);
        if (saved && !title && primaryArtistsList.every((a) => !(a?.name || '').trim())) {
          setHasDraftNotice(true);
        }
      } catch (_) {}
    }
  }, [isOpen]);

  const handleSaveDraft = () => {
    try {
      const draftData = {
        title,
        releaseType,
        primaryArtistsList,
        featuredArtistsList,
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
        clientNotes,
        uploadedArtworkUrl,
        uploadedArtworkFilename,
        storedArtworkFilename,
        artworkDimensions,
        tracks: tracks.map((t) => ({
          id: t.id,
          trackNumber: t.trackNumber,
          title: t.title,
          version: t.version,
          fileUrl: t.fileUrl,
          filename: t.filename,
          storedFilename: t.storedFilename,
          fileSize: t.fileSize,
          isrc: t.isrc,
          explicit: t.explicit,
          uploadedSuccess: t.uploadedSuccess,
          primaryArtist: t.primaryArtist,
          primaryArtistSpotifyUrl: t.primaryArtistSpotifyUrl,
          primaryArtistAppleMusicUrl: t.primaryArtistAppleMusicUrl,
          primaryArtistSpotifyProfileCreateRequested: t.primaryArtistSpotifyProfileCreateRequested,
          primaryArtistAppleMusicProfileCreateRequested: t.primaryArtistAppleMusicProfileCreateRequested,
          featuredArtists: t.featuredArtists,
        })),
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
      setDraftToast('Draft saved successfully! You can resume anytime.');
      setTimeout(() => setDraftToast(null), 3500);
    } catch (e) {
      console.warn('Draft save error', e);
    }
  };

  const handleRestoreDraft = () => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d) {
        if (d.title) setTitle(d.title);
        if (d.releaseType) setReleaseType(d.releaseType);
        if (Array.isArray(d.primaryArtistsList) && d.primaryArtistsList.length > 0) {
          setPrimaryArtistsList(d.primaryArtistsList);
        }
        if (Array.isArray(d.featuredArtistsList)) {
          setFeaturedArtistsList(d.featuredArtistsList);
        }
        if (d.genre) setGenre(d.genre);
        if (d.subGenre) setSubGenre(d.subGenre);
        if (d.language) setLanguage(d.language);
        if (Array.isArray(d.composers)) setComposers(d.composers);
        if (Array.isArray(d.producers)) setProducers(d.producers);
        if (d.targetReleaseDate) setTargetReleaseDate(d.targetReleaseDate);
        if (d.previouslyReleased !== undefined) setPreviouslyReleased(d.previouslyReleased);
        if (d.previousReleaseDetails) setPreviousReleaseDetails(d.previousReleaseDetails);
        if (d.clientNotes) setClientNotes(d.clientNotes);
        if (d.uploadedArtworkUrl) {
          setUploadedArtworkUrl(d.uploadedArtworkUrl);
          setUploadedArtworkFilename(d.uploadedArtworkFilename);
          setStoredArtworkFilename(d.storedArtworkFilename);
          setArtworkPreviewUrl(d.uploadedArtworkUrl);
          setArtworkDimensions(d.artworkDimensions);
        }
        if (Array.isArray(d.tracks) && d.tracks.length > 0) {
          setTracks(
            d.tracks.map((t: any) => ({
              ...t,
              file: null,
            }))
          );
        }
        setHasDraftNotice(false);
        setDraftToast('Draft restored successfully!');
        setTimeout(() => setDraftToast(null), 2500);
      }
    } catch (e) {
      console.warn('Draft restore error', e);
    }
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setHasDraftNotice(false);
  };

  const resetForm = () => {
    setStep(1);
    setTitle('');
    setReleaseType('Single');
    setPrimaryArtistsList([
      { id: 'pa_1', name: user?.name || '', spotifyProfileUrl: '', appleMusicProfileUrl: '', spotifyProfileCreateRequested: false, appleMusicProfileCreateRequested: false },
    ]);
    setFeaturedArtistsList([]);
    setGenre('Amapiano');
    setSubGenre('');
    setLanguage('Zulu');
    setComposerInput('');
    setComposers([]);
    setProducerInput('');
    setProducers([]);
    setTargetReleaseDate(getMinTargetDate());
    setPreviouslyReleased(false);
    setPreviousReleaseDetails('');
    if (localPreviewRef.current) {
      URL.revokeObjectURL(localPreviewRef.current);
      localPreviewRef.current = null;
    }
    setArtworkFile(null);
    setArtworkPreviewUrl(null);
    setArtworkDimensions(null);
    setArtworkValidationError(null);
    setUploadedArtworkUrl(null);
    setUploadedArtworkFilename(null);
    setStoredArtworkFilename(null);
    setTracks([
      {
        id: 'trk_1',
        trackNumber: 1,
        title: '',
        version: 'Original Mix',
        file: null,
        explicit: false,
        primaryArtist: '',
        primaryArtistSpotifyUrl: '',
        primaryArtistAppleMusicUrl: '',
        featuredArtists: [],
      },
    ]);
    setClientNotes('');
    setConfirmedAccuracy(false);
    setSubmitError(null);
    setSubmittedRelease(null);
    setShowExitWarning(false);
  };

  const hasUnsavedProgress = () => {
    if (submittedRelease) return false;
    return !!(
      title.trim() ||
      primaryArtistsList.some((a) => (a?.name || '').trim()) ||
      uploadedArtworkUrl ||
      tracks.some((t) => t.fileUrl || (t?.title || '').trim())
    );
  };

  const handleAttemptClose = () => {
    if (hasUnsavedProgress()) {
      setShowExitWarning(true);
    } else {
      resetForm();
      onClose();
    }
  };

  const handleConfirmClose = () => {
    setShowExitWarning(false);
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  // Add primary artist
  const handleAddPrimaryArtist = () => {
    setPrimaryArtistsList([
      ...primaryArtistsList,
      { id: `pa_${Date.now()}`, name: '', spotifyProfileUrl: '', appleMusicProfileUrl: '', spotifyProfileCreateRequested: false, appleMusicProfileCreateRequested: false },
    ]);
  };

  const handleUpdatePrimaryArtist = (idx: number, field: keyof ArtistFormItem, val: any) => {
    const copy = [...primaryArtistsList];
    copy[idx] = { ...copy[idx], [field]: val };
    setPrimaryArtistsList(copy);
  };

  const handleRemovePrimaryArtist = (idx: number) => {
    if (primaryArtistsList.length <= 1) return;
    setPrimaryArtistsList(primaryArtistsList.filter((_, i) => i !== idx));
  };

  // Track primary artist handlers (EP/Album)
  const getTrackPrimaryArtists = (track: AudioTrackFormItem): TrackPrimaryArtist[] => {
    if (track.primaryArtists && track.primaryArtists.length > 0) return track.primaryArtists;
    return [{
      name: track.primaryArtist || '',
      spotifyProfileUrl: track.primaryArtistSpotifyUrl || '',
      appleMusicProfileUrl: track.primaryArtistAppleMusicUrl || '',
      spotifyProfileCreateRequested: !!track.primaryArtistSpotifyProfileCreateRequested,
      appleMusicProfileCreateRequested: !!track.primaryArtistAppleMusicProfileCreateRequested,
    }];
  };

  const handleAddTrackPrimaryArtist = (trackIdx: number) => {
    const copy = [...tracks];
    const cur = getTrackPrimaryArtists(copy[trackIdx]);
    copy[trackIdx].primaryArtists = [
      ...cur,
      { name: '', spotifyProfileUrl: '', appleMusicProfileUrl: '', spotifyProfileCreateRequested: false, appleMusicProfileCreateRequested: false },
    ];
    setTracks(copy);
  };

  const handleUpdateTrackPrimaryArtist = (
    trackIdx: number,
    artistIdx: number,
    field: keyof TrackPrimaryArtist,
    val: string | boolean
  ) => {
    const copy = [...tracks];
    const cur = getTrackPrimaryArtists(copy[trackIdx]);
    cur[artistIdx] = { ...cur[artistIdx], [field]: val };
    copy[trackIdx].primaryArtists = cur;
    if (artistIdx === 0) {
      copy[trackIdx].primaryArtist = cur[0].name;
      copy[trackIdx].primaryArtistSpotifyUrl = cur[0].spotifyProfileUrl || '';
      copy[trackIdx].primaryArtistAppleMusicUrl = cur[0].appleMusicProfileUrl || '';
      copy[trackIdx].primaryArtistSpotifyProfileCreateRequested = !!cur[0].spotifyProfileCreateRequested;
      copy[trackIdx].primaryArtistAppleMusicProfileCreateRequested = !!cur[0].appleMusicProfileCreateRequested;
    }
    setTracks(copy);
  };

  const handleRemoveTrackPrimaryArtist = (trackIdx: number, artistIdx: number) => {
    const copy = [...tracks];
    const cur = getTrackPrimaryArtists(copy[trackIdx]).filter((_, i) => i !== artistIdx);
    copy[trackIdx].primaryArtists = cur;
    const first = cur[0];
    copy[trackIdx].primaryArtist = first?.name || '';
    copy[trackIdx].primaryArtistSpotifyUrl = first?.spotifyProfileUrl || '';
    copy[trackIdx].primaryArtistAppleMusicUrl = first?.appleMusicProfileUrl || '';
    copy[trackIdx].primaryArtistSpotifyProfileCreateRequested = !!first?.spotifyProfileCreateRequested;
    copy[trackIdx].primaryArtistAppleMusicProfileCreateRequested = !!first?.appleMusicProfileCreateRequested;
    setTracks(copy);
  };

  // Add featured artist
  const handleAddFeaturedArtist = () => {
    setFeaturedArtistsList([
      ...featuredArtistsList,
      { id: `fa_${Date.now()}`, name: '', spotifyProfileUrl: '', appleMusicProfileUrl: '', appleMusicProfileCreateRequested: false, spotifyProfileCreateRequested: false },
    ]);
  };

  const handleUpdateFeaturedArtist = (idx: number, field: keyof ArtistFormItem, val: any) => {
    const copy = [...featuredArtistsList];
    copy[idx] = { ...copy[idx], [field]: val };
    setFeaturedArtistsList(copy);
  };

  const handleRemoveFeaturedArtist = (idx: number) => {
    setFeaturedArtistsList(featuredArtistsList.filter((_, i) => i !== idx));
  };

  // Track featured artist handlers
  const handleAddTrackFeaturedArtist = (trackIdx: number) => {
    const copy = [...tracks];
    const cur = copy[trackIdx].featuredArtists || [];
    copy[trackIdx].featuredArtists = [
      ...cur,
      { name: '', spotifyProfileUrl: '', appleMusicProfileUrl: '' },
    ];
    setTracks(copy);
  };

  const handleUpdateTrackFeaturedArtist = (
    trackIdx: number,
    faIdx: number,
    field: keyof TrackFeaturedArtist,
    val: string
  ) => {
    const copy = [...tracks];
    const cur = [...(copy[trackIdx].featuredArtists || [])];
    cur[faIdx] = { ...cur[faIdx], [field]: val };
    copy[trackIdx].featuredArtists = cur;
    setTracks(copy);
  };

  const handleRemoveTrackFeaturedArtist = (trackIdx: number, faIdx: number) => {
    const copy = [...tracks];
    const cur = (copy[trackIdx].featuredArtists || []).filter((_, i) => i !== faIdx);
    copy[trackIdx].featuredArtists = cur;
    setTracks(copy);
  };

  // Add composer
  const handleAddComposer = () => {
    if (composerInput.trim() && !composers.includes(composerInput.trim())) {
      setComposers([...composers, composerInput.trim()]);
      setComposerInput('');
    }
  };

  const handleRemoveComposer = (idx: number) => {
    if (composers[idx]?.trim() === (user?.name || '').trim()) return;
    setComposers(composers.filter((_, i) => i !== idx));
  };

  // Add producer
  const handleAddProducer = () => {
    if (producerInput.trim() && !producers.includes(producerInput.trim())) {
      setProducers([...producers, producerInput.trim()]);
      setProducerInput('');
    }
  };

  const handleRemoveProducer = (idx: number) => {
    if (producers[idx]?.trim() === (user?.name || '').trim()) return;
    setProducers(producers.filter((_, i) => i !== idx));
  };

  // Artwork file upload & validation
  const handleArtworkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setArtworkValidationError(null);

    // Validate that the selected file is actually an image
    if (!file.type.startsWith('image/')) {
      setArtworkValidationError('Selected file is not an image. Please provide a valid JPG or PNG image.');
      return;
    }

    const validFormats = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!validFormats.includes(file.type.toLowerCase())) {
      setArtworkValidationError('Artwork must be in JPG/JPEG or PNG format.');
      return;
    }

    // Immediately show visual preview using the actual selected file
    if (localPreviewRef.current) {
      URL.revokeObjectURL(localPreviewRef.current);
    }
    const objectUrl = URL.createObjectURL(file);
    localPreviewRef.current = objectUrl;
    setArtworkPreviewUrl(objectUrl);
    setArtworkFile(file);

    const img = new Image();
    img.onload = async () => {
      const width = img.width;
      const height = img.height;
      const isSquare = Math.abs(width - height) <= 2;

      if (!isSquare) {
        setArtworkValidationError(`Artwork must have 1:1 square dimensions. Current is ${width}×${height}px.`);
        return;
      }

      if (width < 3000 || width > 4000) {
        setArtworkValidationError(
          `Artwork dimensions must be between 3000×3000 and 4000×4000 pixels. Current is ${width}×${height}px.`
        );
        return;
      }

      setArtworkDimensions({ width, height });

      // Real upload to server to get persistent URL
      try {
        setArtworkUploading(true);
        const res = await api.uploadArtwork(file, { width, height });
        setUploadedArtworkUrl(res.fileUrl);
        setUploadedArtworkFilename(res.filename);
        setStoredArtworkFilename(res.storedFilename);
        // Keep the local blob URL for the browser preview. The persistent server URL may be auth-protected.
        // uploadedArtworkUrl is stored separately and used for the submitted release.
      } catch (err: any) {
        setArtworkValidationError(err.message || 'Failed to upload cover artwork to server.');
      } finally {
        setArtworkUploading(false);
      }
    };

    img.onerror = () => {
      setArtworkValidationError('Unable to read image file. Please provide a valid JPG or PNG.');
    };

    img.src = objectUrl;
  };

  const handleRemoveArtwork = () => {
    if (localPreviewRef.current) {
      URL.revokeObjectURL(localPreviewRef.current);
      localPreviewRef.current = null;
    }
    setArtworkFile(null);
    setArtworkPreviewUrl(null);
    setUploadedArtworkUrl(null);
    setUploadedArtworkFilename(null);
    setStoredArtworkFilename(null);
    setArtworkDimensions(null);
    setArtworkValidationError(null);
  };

  // Add Track
  const handleAddTrack = () => {
    const nextNum = tracks.length + 1;
    setTracks([
      ...tracks,
      {
        id: `trk_${Date.now()}_${nextNum}`,
        trackNumber: nextNum,
        title: '',
        version: 'Original Mix',
        file: null,
        explicit: false,
        primaryArtist: primaryArtistsList[0]?.name || '',
        primaryArtistSpotifyUrl: primaryArtistsList[0]?.spotifyProfileUrl || '',
        primaryArtistAppleMusicUrl: primaryArtistsList[0]?.appleMusicProfileUrl || '',
        primaryArtistSpotifyProfileCreateRequested: false,
        primaryArtistAppleMusicProfileCreateRequested: false,
        featuredArtists: [],
      },
    ]);
  };

  const handleRemoveTrack = (index: number) => {
    if (tracks.length === 1) return;
    const updated = tracks.filter((_, i) => i !== index).map((t, idx) => ({
      ...t,
      trackNumber: idx + 1,
    }));
    setTracks(updated);
  };

  const handleMoveTrack = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === tracks.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const newTracks = [...tracks];
    const temp = newTracks[index];
    newTracks[index] = newTracks[targetIndex];
    newTracks[targetIndex] = temp;

    // update track numbers
    const reordered = newTracks.map((t, i) => ({ ...t, trackNumber: i + 1 }));
    setTracks(reordered);
  };

  // Handle Track Audio Master Upload (MP3 only)
  const handleTrackFileChange = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Strict validation: only MP3 audio masters
    const lowerName = file.name.toLowerCase();
    const isMp3 = lowerName.endsWith('.mp3') || file.type === 'audio/mpeg' || file.type === 'audio/mp3' || file.type === 'audio/x-mp3';
    if (!isMp3) {
      const copy = [...tracks];
      copy[index].uploadError =
        'Invalid audio format. Only MP3 master audio files are accepted.';
      copy[index].uploadedSuccess = false;
      setTracks(copy);
      return;
    }

    try {
      const copy = [...tracks];
      copy[index].file = file;
      copy[index].filename = file.name;
      copy[index].fileSize = file.size;
      copy[index].uploading = true;
      copy[index].uploadError = undefined;
      copy[index].uploadedSuccess = false;
      setTracks(copy);

      const res = await api.uploadAudio(file);
      const updated = [...tracks];
      updated[index].fileUrl = res.fileUrl;
      updated[index].storedFilename = res.storedFilename;
      updated[index].uploading = false;
      updated[index].uploadedSuccess = true;
      updated[index].uploadError = undefined;
      setTracks(updated);
    } catch (err: any) {
      const updated = [...tracks];
      updated[index].uploading = false;
      updated[index].uploadedSuccess = false;
      updated[index].uploadError = err.message || 'Failed to upload audio master to server.';
      setTracks(updated);
    }
  };

  const handleRemoveTrackFile = (index: number) => {
    const copy = [...tracks];
    copy[index].file = null;
    copy[index].fileUrl = undefined;
    copy[index].filename = undefined;
    copy[index].storedFilename = undefined;
    copy[index].uploadError = undefined;
    copy[index].uploadedSuccess = false;
    setTracks(copy);
  };

  // Step 1 Validation
  const validateStep1 = (): boolean => {
    if (!title.trim()) {
      setSubmitError('Please enter the release title.');
      return false;
    }

    // Require Primary Artist
    const hasPrimaryArtist = primaryArtistsList.some((a) => (a?.name || '').trim().length > 0);
    if (!hasPrimaryArtist) {
      setSubmitError('Please specify at least one Primary Artist name.');
      return false;
    }

    // Validate URLs for Primary Artists
    for (let i = 0; i < primaryArtistsList.length; i++) {
      const a = primaryArtistsList[i];
      if (a.spotifyProfileUrl && !isValidUrl(a.spotifyProfileUrl)) {
        setSubmitError(`Spotify Artist Profile for "${a.name || `Primary Artist #${i + 1}`}" must be a valid URL when provided.`);
        return false;
      }
      if (a.appleMusicProfileUrl && !isValidUrl(a.appleMusicProfileUrl)) {
        setSubmitError(`Apple Music Artist Profile for "${a.name || `Primary Artist #${i + 1}`}" must be a valid URL when provided.`);
        return false;
      }
    }

    // Validate Featured Artists
    for (let i = 0; i < featuredArtistsList.length; i++) {
      const fa = featuredArtistsList[i];
      if (!(fa?.name || '').trim()) {
        setSubmitError(`Please provide the name for Featured Artist #${i + 1} or remove the row.`);
        return false;
      }
      if (fa.spotifyProfileUrl && !isValidUrl(fa.spotifyProfileUrl)) {
        setSubmitError(`Spotify Artist Profile for featured artist "${fa.name}" must be a valid URL when provided.`);
        return false;
      }
      if (fa.appleMusicProfileUrl && !isValidUrl(fa.appleMusicProfileUrl)) {
        setSubmitError(`Apple Music Artist Profile for featured artist "${fa.name}" must be a valid URL when provided.`);
        return false;
      }
    }

    // Strict 7-Day Release Rule
    const parts = targetReleaseDate.split('-').map(Number);
    const selectedDate =
      parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(targetReleaseDate);

    const minDateObj = new Date();
    minDateObj.setHours(0, 0, 0, 0);
    minDateObj.setDate(minDateObj.getDate() + 7);

    if (!targetReleaseDate || isNaN(selectedDate.getTime()) || selectedDate < minDateObj) {
      setSubmitError('Release date must be at least 7 days from today.');
      return false;
    }

    setSubmitError(null);
    return true;
  };

  // Step 2 Validation
  const validateStep2 = (): boolean => {
    if (!uploadedArtworkUrl) {
      setArtworkValidationError('Please upload a 3000×3000 to 4000×4000 square cover artwork image (JPG/PNG).');
      return false;
    }
    if (artworkValidationError) return false;
    return true;
  };

  // Step 3 Validation
  const validateStep3 = (): boolean => {
    if (tracks.length === 0) {
      setSubmitError('At least one track is required.');
      return false;
    }

    const isEpOrAlbum = releaseType === 'EP' || releaseType === 'Album';
    const mainPrimaryName = primaryArtistsList[0]?.name?.trim() || '';

    for (let i = 0; i < tracks.length; i++) {
      const t = tracks[i];
      if (!(t?.title || '').trim()) {
        setSubmitError(`Please provide a track title for Track #${i + 1}.`);
        return false;
      }
      if (!t.fileUrl) {
        setSubmitError(`Please upload the MP3 audio master for Track #${i + 1} (${t.title || 'Untitled'}).`);
        return false;
      }
      if (t.uploadError) {
        setSubmitError(`Track #${i + 1} has an upload error. Please resolve it before proceeding.`);
        return false;
      }

      // For EP/Album releases, require at least one primary artist for every song.
      const songPrimaryArtists = getTrackPrimaryArtists(t);
      if (isEpOrAlbum) {
        const namedPrimaryArtists = songPrimaryArtists.filter((a) => (a?.name || '').trim());
        if (namedPrimaryArtists.length === 0) {
          setSubmitError(`Track #${i + 1} (${t.title}) requires at least one Primary Artist for ${releaseType === 'EP' ? 'EP' : 'Album'} releases.`);
          return false;
        }
        for (let pIdx = 0; pIdx < songPrimaryArtists.length; pIdx++) {
          const pa = songPrimaryArtists[pIdx];
          if (!(pa?.name || '').trim()) {
            setSubmitError(`Track #${i + 1} Primary Artist #${pIdx + 1} requires a name or must be removed.`);
            return false;
          }
          if (pa.spotifyProfileUrl && !isValidUrl(pa.spotifyProfileUrl)) {
            setSubmitError(`Track #${i + 1} Spotify Artist Profile for "${pa.name}" must be a valid URL when provided.`);
            return false;
          }
          if (pa.appleMusicProfileUrl && !isValidUrl(pa.appleMusicProfileUrl)) {
            setSubmitError(`Track #${i + 1} Apple Music Artist Profile for "${pa.name}" must be a valid URL when provided.`);
            return false;
          }
        }
      }

      // Validate song featured artists
      if (t.featuredArtists) {
        for (let faIdx = 0; faIdx < t.featuredArtists.length; faIdx++) {
          const fa = t.featuredArtists[faIdx];
          if (!(fa?.name || '').trim()) {
            setSubmitError(`Track #${i + 1} featured artist #${faIdx + 1} requires a name.`);
            return false;
          }
          if (isEpOrAlbum && fa.spotifyProfileUrl && !isValidUrl(fa.spotifyProfileUrl)) {
            setSubmitError(`Track #${i + 1} featured artist "${fa.name}" Spotify Artist Profile must be a valid URL when provided.`);
            return false;
          }
          if (isEpOrAlbum && fa.appleMusicProfileUrl && !isValidUrl(fa.appleMusicProfileUrl)) {
            setSubmitError(`Track #${i + 1} featured artist "${fa.name}" Apple Music Artist Profile must be a valid URL when provided.`);
            return false;
          }
        }
      }
    }

    setSubmitError(null);
    return true;
  };

  const handleNext = () => {
    setSubmitError(null);
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
    else if (step === 3 && validateStep3()) setStep(4);
  };

  const handlePrev = () => {
    setSubmitError(null);
    if (step > 1) setStep((step - 1) as any);
  };

  // Submit Release to server
  const handleFinalSubmit = async () => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const effectivePrimaryArtists = primaryArtistsList.map((a) => (a?.name || '').trim()).filter(Boolean);
      const effectiveFeaturedArtists = featuredArtistsList.map((a) => (a?.name || '').trim()).filter(Boolean);

      const primaryArtistProfiles: ArtistCredit[] = primaryArtistsList
        .filter((a) => (a?.name || '').trim())
        .map((a) => ({
          name: (a?.name || '').trim(),
          role: 'primary',
          spotifyProfileUrl: (a?.spotifyProfileUrl || '').trim() || undefined,
          appleMusicProfileUrl: (a?.appleMusicProfileUrl || '').trim() || undefined,
          spotifyProfileCreateRequested: !!a.spotifyProfileCreateRequested,
          appleMusicProfileCreateRequested: !!a.appleMusicProfileCreateRequested,
        }));

      const featuredArtistProfiles: ArtistCredit[] = featuredArtistsList
        .filter((a) => (a?.name || '').trim())
        .map((a) => ({
          name: (a?.name || '').trim(),
          role: 'featured',
          spotifyProfileUrl: (a?.spotifyProfileUrl || '').trim() || undefined,
          appleMusicProfileUrl: (a?.appleMusicProfileUrl || '').trim() || undefined,
          spotifyProfileCreateRequested: !!a.spotifyProfileCreateRequested,
          appleMusicProfileCreateRequested: !!a.appleMusicProfileCreateRequested,
        }));

      const finalTracks = tracks.map((t, idx) => {
        const trackPrimaryArtists = getTrackPrimaryArtists(t).filter((a) => (a?.name || '').trim());
        const trackPrimary = trackPrimaryArtists.map((a) => (a?.name || '').trim()).join(', ') || effectivePrimaryArtists[0] || user?.name || 'Artist';
        const firstTrackPrimary = trackPrimaryArtists[0];
        const trackSpotify = firstTrackPrimary?.spotifyProfileUrl?.trim() || t.primaryArtistSpotifyUrl?.trim() || primaryArtistProfiles[0]?.spotifyProfileUrl;
        const trackApple = firstTrackPrimary?.appleMusicProfileUrl?.trim() || t.primaryArtistAppleMusicUrl?.trim() || primaryArtistProfiles[0]?.appleMusicProfileUrl;

        const songPrimaryProfiles: ArtistCredit[] = trackPrimaryArtists.map((pa) => ({
          name: (pa?.name || '').trim(),
          role: 'primary' as const,
          spotifyProfileUrl: pa.spotifyProfileUrl?.trim() || undefined,
          appleMusicProfileUrl: pa.appleMusicProfileUrl?.trim() || undefined,
          spotifyProfileCreateRequested: !!pa.spotifyProfileCreateRequested,
          appleMusicProfileCreateRequested: !!pa.appleMusicProfileCreateRequested,
        }));

        const songFeaturedProfiles: ArtistCredit[] = (t.featuredArtists || [])
          .filter((fa) => (fa?.name || '').trim())
          .map((fa) => ({
            name: (fa?.name || '').trim(),
            role: 'featured' as const,
            spotifyProfileUrl: fa.spotifyProfileUrl?.trim() || undefined,
            appleMusicProfileUrl: fa.appleMusicProfileUrl?.trim() || undefined,
            spotifyProfileCreateRequested: !!fa.spotifyProfileCreateRequested,
            appleMusicProfileCreateRequested: !!fa.appleMusicProfileCreateRequested,
          }));

        const trackArtistProfiles: ArtistCredit[] = [
          ...(songPrimaryProfiles.length > 0 ? songPrimaryProfiles : [{
            name: trackPrimary,
            role: 'primary' as const,
            spotifyProfileUrl: trackSpotify || undefined,
            appleMusicProfileUrl: trackApple || undefined,
            spotifyProfileCreateRequested: !!t.primaryArtistSpotifyProfileCreateRequested,
            appleMusicProfileCreateRequested: !!t.primaryArtistAppleMusicProfileCreateRequested,
          }]),
          ...songFeaturedProfiles,
        ];

        return {
          id: t.id || `trk_${Date.now()}_${idx + 1}`,
          trackNumber: idx + 1,
          title: (t?.title || '').trim(),
          version: t.version || 'Original Mix',
          filename: t.filename || `track_${idx + 1}.mp3`,
          storedFilename: t.storedFilename,
          fileUrl: t.fileUrl!,
          fileSize: t.fileSize || 0,
          isrc: t.isrc?.trim() || '',
          explicit: !!t.explicit,
          primaryArtist: trackPrimary,
          primaryArtistSpotifyUrl: trackSpotify || undefined,
          primaryArtistAppleMusicUrl: trackApple || undefined,
          featuredArtists: (t.featuredArtists || []).map((fa) => (fa?.name || '').trim()).filter(Boolean),
          artistProfiles: trackArtistProfiles,
        };
      });

      const payload: Partial<Release> = {
        title: title.trim(),
        releaseType,
        primaryArtists: effectivePrimaryArtists.length > 0 ? effectivePrimaryArtists : [user?.name || 'Artist'],
        featuredArtists: effectiveFeaturedArtists,
        primaryArtistProfiles,
        featuredArtistProfiles,
        artistProfiles: [...primaryArtistProfiles, ...featuredArtistProfiles],
        genre,
        subGenre: subGenre.trim() || undefined,
        language: language.trim() || 'Zulu',
        composers: composers.length > 0 ? composers : composerInput.trim() ? [composerInput.trim()] : [],
        producers: producers.length > 0 ? producers : producerInput.trim() ? [producerInput.trim()] : [],
        targetReleaseDate,
        previouslyReleased,
        previousReleaseDetails: previouslyReleased ? previousReleaseDetails : undefined,
        cLine: cLine.trim(),
        pLine: pLine.trim(),
        artworkUrl: uploadedArtworkUrl!,
        artworkFilename: uploadedArtworkFilename || 'cover.jpg',
        storedArtworkFilename: storedArtworkFilename || undefined,
        artworkDimensions: artworkDimensions || { width: 1400, height: 1400 },
        tracks: finalTracks as any,
        clientNotes: clientNotes.trim(),
        allowPublicShare: true,
      };

      const res = await api.createRelease(payload);
      setSubmittedRelease(res.release);
      localStorage.removeItem(DRAFT_KEY);

      // Dispatch global custom event for immediate UI update without browser refresh
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('midama:release-submitted', { detail: res.release })
        );
      }

      onSuccess(res.release);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit release.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturnToDashboard = () => {
    resetForm();
    onClose();
  };

  const effectivePrimaryDisplay = primaryArtistsList.map((a) => (a?.name || '').trim()).filter(Boolean);
  const effectiveFeaturedDisplay = featuredArtistsList.map((a) => (a?.name || '').trim()).filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh] sm:max-h-[88vh]">
        {/* Top Header */}
        <div className="shrink-0 px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/40">
          <div>
            <h2 className="text-lg font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
              <Disc className="w-5 h-5 text-red-500" />
              <span>Submit New Music Release</span>
            </h2>
            <p className="text-xs text-neutral-400">
              Submit your music master tracks, square cover artwork, and release metadata for review.
            </p>
          </div>
          <button
            onClick={handleAttemptClose}
            className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Draft Notice Banner */}
        {hasDraftNotice && !submittedRelease && (
          <div className="shrink-0 px-6 py-2.5 bg-amber-950/40 border-b border-amber-900/60 flex items-center justify-between text-xs text-amber-300">
            <span className="flex items-center gap-1.5">
              <BookmarkCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <span>You have a saved release draft from a previous session.</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRestoreDraft}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-lg text-[11px] cursor-pointer"
              >
                Restore Draft
              </button>
              <button
                type="button"
                onClick={handleDiscardDraft}
                className="px-2 py-1 text-neutral-400 hover:text-neutral-200 text-[11px] cursor-pointer"
              >
                Discard
              </button>
            </div>
          </div>
        )}

        {/* Draft Toast Message */}
        {draftToast && (
          <div className="shrink-0 px-6 py-2 bg-emerald-950/80 border-b border-emerald-800 text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{draftToast}</span>
          </div>
        )}

        {/* Step Indicator */}
        {!submittedRelease && (
          <div className="shrink-0 px-6 py-3 bg-neutral-900/20 border-b border-neutral-900 flex items-center justify-between text-xs font-mono">
            {[
              { num: 1, label: 'Metadata & Credits' },
              { num: 2, label: 'Cover Artwork' },
              { num: 3, label: 'Audio Masters (MP3)' },
              { num: 4, label: 'Final Review & Submit' },
            ].map((s) => (
              <div
                key={s.num}
                className={`flex items-center gap-1.5 ${
                  step === s.num
                    ? 'text-red-500 font-bold'
                    : step > s.num
                    ? 'text-emerald-400'
                    : 'text-neutral-500'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                    step === s.num
                      ? 'bg-red-600 text-white'
                      : step > s.num
                      ? 'bg-emerald-950 border border-emerald-800 text-emerald-400'
                      : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  {step > s.num ? '✓' : s.num}
                </span>
                <span className="hidden sm:inline">{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
          {submitError && (
            <div className="mb-4 p-3 bg-red-950/50 border border-red-800 rounded-xl flex items-start gap-2 text-xs text-red-400">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          {/* SUCCESS CONFIRMATION */}
          {submittedRelease ? (
            <div className="text-center py-8 space-y-5">
              <div className="w-16 h-16 rounded-full bg-emerald-950/60 border border-emerald-800 flex items-center justify-center mx-auto text-emerald-400 shadow-xl">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <span className="text-xs font-mono text-emerald-400 uppercase tracking-widest font-semibold flex items-center justify-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Release submitted successfully.</span>
                </span>
                <h3 className="text-2xl font-bold text-white font-['Space_Grotesk']">
                  {submittedRelease.title}
                </h3>
                <p className="text-xs sm:text-sm text-neutral-300 max-w-md mx-auto">
                  Your music submission has been received and logged in the system. The status is now{' '}
                  <strong>Pending Review</strong>. Mid-Ama Promo administration has been notified.
                </p>
              </div>

              <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl max-w-sm mx-auto space-y-2.5 text-xs text-left">
                <div className="flex justify-between items-center text-neutral-400 pb-2 border-b border-neutral-800">
                  <span>Release ID:</span>
                  <span className="font-mono font-bold text-white text-xs select-all bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800">
                    {submittedRelease.id}
                  </span>
                </div>
                <div className="flex justify-between items-center text-neutral-400 pb-2 border-b border-neutral-800">
                  <span>Reference Number:</span>
                  <span className="font-mono font-bold text-red-400 text-sm select-all">
                    {submittedRelease.refNumber}
                  </span>
                </div>
                <div className="flex justify-between items-center text-neutral-400">
                  <span>Release Title:</span>
                  <span className="text-neutral-200 font-semibold truncate max-w-[180px]">
                    {submittedRelease.title}
                  </span>
                </div>
                <div className="flex justify-between items-center text-neutral-400">
                  <span>Initial Status:</span>
                  <span className="font-semibold text-amber-400">Pending Review</span>
                </div>
                <div className="flex justify-between items-center text-neutral-400">
                  <span>Master Audio Tracks:</span>
                  <span className="text-neutral-200">{submittedRelease.tracks.length} lossless track(s)</span>
                </div>
                <div className="flex justify-between items-center text-neutral-400">
                  <span>Target Release Date:</span>
                  <span className="text-neutral-200">{submittedRelease.targetReleaseDate}</span>
                </div>
              </div>

              <div className="pt-4 flex justify-center">
                <button
                  type="button"
                  onClick={handleReturnToDashboard}
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-red-950 cursor-pointer"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* STEP 1: METADATA & ARTIST FLOW */}
              {step === 1 && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                        Release Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Enter the official release title"
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-red-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                        Release Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={releaseType}
                        onChange={(e) => setReleaseType(e.target.value as ReleaseType)}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-neutral-100 focus:outline-none focus:border-red-600"
                      >
                        <option value="Single">Single (1 Track)</option>
                        <option value="EP">EP / Episode (2–6 Tracks)</option>
                        <option value="Album">Album (7+ Tracks)</option>
                      </select>
                    </div>
                  </div>

                  {/* Flow Banner for EP / Album */}
                  {(releaseType === 'EP' || releaseType === 'Album') && (
                    <div className="p-3 bg-red-950/20 border border-red-900/40 rounded-xl flex items-start gap-2.5 text-xs text-neutral-300">
                      <Info className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-white block font-semibold">
                          {releaseType === 'EP' ? 'Episode / EP' : 'Album'} Artist Workflow:
                        </strong>
                        <span>
                          Step 1: Enter the release title, rights information, primary/secondary artists, composers and producers. For EPs and Albums, Step 3 lets you assign artists and their DSP profiles per track.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Primary Artist(s) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-neutral-300">
                        Primary Artist <span className="text-red-500">*</span>
                      </label>
                      <button
                          type="button"
                          onClick={handleAddPrimaryArtist}
                          className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 font-semibold cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Artist</span>
                        </button>
                    </div>

                    <datalist id="midama-saved-primary-artists">
                      {rememberedPrimaryArtists.filter(name => name.toLocaleLowerCase() !== (user?.name || '').trim().toLocaleLowerCase()).map(name => <option key={name} value={name} />)}
                    </datalist>
                    {primaryArtistsList.map((artist, idx) => (
                      <div
                        key={artist.id}
                        className="p-3.5 bg-neutral-900/60 border border-neutral-800 rounded-xl space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-neutral-300 font-mono">
                            Primary Artist {primaryArtistsList.length > 1 ? `#${idx + 1}` : ''}
                          </span>
                          {primaryArtistsList.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemovePrimaryArtist(idx)}
                              className="text-neutral-500 hover:text-red-400 text-xs flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remove</span>
                            </button>
                          )}
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                            Artist Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={artist.name}
                            onChange={(e) => handleUpdatePrimaryArtist(idx, 'name', e.target.value)}
                            placeholder="Enter primary artist name"
                            list="midama-saved-primary-artists"
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-red-600"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <ArtistProfileField
                            platform="spotify"
                            url={artist.spotifyProfileUrl}
                            createRequested={artist.spotifyProfileCreateRequested}
                            onUrlChange={(value) => handleUpdatePrimaryArtist(idx, 'spotifyProfileUrl', value)}
                            onCreateRequested={() => {
                              setPrimaryArtistsList((current) => current.map((item, itemIdx) =>
                                itemIdx === idx ? { ...item, spotifyProfileUrl: '', spotifyProfileCreateRequested: true } : item
                              ));
                            }}
                            onUseExisting={() => handleUpdatePrimaryArtist(idx, 'spotifyProfileCreateRequested' as any, false)}
                          />

                          <ArtistProfileField
                            platform="apple"
                            url={artist.appleMusicProfileUrl}
                            createRequested={artist.appleMusicProfileCreateRequested}
                            onUrlChange={(value) => handleUpdatePrimaryArtist(idx, 'appleMusicProfileUrl', value)}
                            onCreateRequested={() => {
                              setPrimaryArtistsList((current) => current.map((item, itemIdx) =>
                                itemIdx === idx ? { ...item, appleMusicProfileUrl: '', appleMusicProfileCreateRequested: true } : item
                              ));
                            }}
                            onUseExisting={() => handleUpdatePrimaryArtist(idx, 'appleMusicProfileCreateRequested' as any, false)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Featured / Additional Artists Section */}
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-xs font-semibold text-neutral-300">
                          Featured / Additional Artist(s) (Optional)
                        </label>
                        <p className="text-[11px] text-neutral-500">
                          Each featured artist has their own Spotify & Apple Music profile links.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddFeaturedArtist}
                        className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 hover:text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-red-500" />
                        <span>Add Artist</span>
                      </button>
                    </div>

                    {featuredArtistsList.length > 0 && (
                      <div className="space-y-3">
                        {featuredArtistsList.map((artist, idx) => (
                          <div
                            key={artist.id}
                            className="p-3.5 bg-neutral-900/40 border border-neutral-800 rounded-xl space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-neutral-400 font-mono">
                                Featured Artist #{idx + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveFeaturedArtist(idx)}
                                className="text-neutral-500 hover:text-red-400 text-xs flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Remove</span>
                              </button>
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                                Featured Artist Name <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                required
                                value={artist.name}
                                onChange={(e) => handleUpdateFeaturedArtist(idx, 'name', e.target.value)}
                                placeholder="Enter featured artist name"
                                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-red-600"
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <ArtistProfileField
                                platform="spotify"
                                url={artist.spotifyProfileUrl}
                                createRequested={artist.spotifyProfileCreateRequested}
                                onUrlChange={(value) => handleUpdateFeaturedArtist(idx, 'spotifyProfileUrl', value)}
                                onCreateRequested={() => {
                                  setFeaturedArtistsList((current) => current.map((item, itemIdx) =>
                                    itemIdx === idx ? { ...item, spotifyProfileUrl: '', spotifyProfileCreateRequested: true } : item
                                  ));
                                }}
                                onUseExisting={() => handleUpdateFeaturedArtist(idx, 'spotifyProfileCreateRequested' as any, false)}
                              />

                              <ArtistProfileField
                                platform="apple"
                                url={artist.appleMusicProfileUrl}
                                createRequested={artist.appleMusicProfileCreateRequested}
                                onUrlChange={(value) => handleUpdateFeaturedArtist(idx, 'appleMusicProfileUrl', value)}
                                onCreateRequested={() => {
                                  setFeaturedArtistsList((current) => current.map((item, itemIdx) =>
                                    itemIdx === idx ? { ...item, appleMusicProfileUrl: '', appleMusicProfileCreateRequested: true } : item
                                  ));
                                }}
                                onUseExisting={() => handleUpdateFeaturedArtist(idx, 'appleMusicProfileCreateRequested' as any, false)}
                              />
                              </div>
                            </div>
                        ))}

                        <button
                          type="button"
                          onClick={handleAddFeaturedArtist}
                          className="w-full py-2 bg-neutral-900/40 hover:bg-neutral-900 border border-dashed border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 text-red-500" />
                          <span>Add Artist</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Genre, Language, Target Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-neutral-900">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                        Genre <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={genre}
                        onChange={(e) => setGenre(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-neutral-100 focus:outline-none focus:border-red-600"
                      >
                        <option value="Amapiano">Amapiano</option>
                        <option value="Afro Tech">Afro Tech</option>
                        <option value="Deep House">Deep House</option>
                        <option value="Afro House">Afro House</option>
                        <option value="Gqom">Gqom</option>
                        <option value="Afrobeat">Afrobeat</option>
                        <option value="Afro Pop">Afro Pop</option>
                        <option value="Kwaito">Kwaito</option>
                        <option value="Electronic">Electronic</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                        Release Language <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        placeholder="e.g. Zulu / English / Sotho"
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-neutral-100 focus:outline-none focus:border-red-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                        Target Release Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        min={minTargetDate}
                        value={targetReleaseDate}
                        onChange={(e) => setTargetReleaseDate(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-neutral-100 focus:outline-none focus:border-red-600"
                      />
                      <span className="block text-[10px] text-neutral-500 mt-1 font-mono">
                        At least 7 days in advance (Earliest: {minTargetDate})
                      </span>
                    </div>
                  </div>

                  {/* Composers & Producers */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                        Composer(s) / Songwriter(s) — your real name and surname are compulsory
                      </label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={composerInput}
                          onChange={(e) => setComposerInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddComposer();
                            }
                          }}
                          placeholder="Add another composer / songwriter (optional)..."
                          className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-neutral-100 focus:outline-none focus:border-red-600"
                        />
                        <button
                          type="button"
                          onClick={handleAddComposer}
                          className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs rounded-xl cursor-pointer"
                        >
                          Add
                        </button>
                      </div>
                      {composers.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {composers.map((c, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-neutral-900 border border-neutral-800 text-neutral-300 text-[11px] rounded"
                            >
                              <span>{c}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveComposer(i)}
                                disabled={c.trim() === (user?.name || '').trim()}
                                className="text-neutral-500 hover:text-red-400"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                        Producer(s) — your real name and surname are compulsory
                      </label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={producerInput}
                          onChange={(e) => setProducerInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddProducer();
                            }
                          }}
                          placeholder="Add another producer (optional)..."
                          className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-neutral-100 focus:outline-none focus:border-red-600"
                        />
                        <button
                          type="button"
                          onClick={handleAddProducer}
                          className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs rounded-xl cursor-pointer"
                        >
                          Add
                        </button>
                      </div>
                      {producers.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {producers.map((p, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-neutral-900 border border-neutral-800 text-neutral-300 text-[11px] rounded"
                            >
                              <span>{p}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveProducer(i)}
                                disabled={p.trim() === (user?.name || '').trim()}
                                className="text-neutral-500 hover:text-red-400"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Copyright Notices */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-neutral-900">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-400 mb-1">
                        C-Line (Copyright Notice — fixed)
                      </label>
                      <input
                        type="text"
                        value={cLine}
                        readOnly
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-300 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-400 mb-1">
                        P-Line (Sound Recording Notice — fixed)
                      </label>
                      <input
                        type="text"
                        value={pLine}
                        readOnly
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-300 font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: COVER ART UPLOAD & FULLY FUNCTIONAL PREVIEW */}
              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1 font-['Space_Grotesk']">
                      Cover Artwork Upload (Square JPG/JPEG or PNG)
                    </h3>
                    <p className="text-xs text-neutral-400">
                      Must be an actual square image between 3000×3000 and 4000×4000 pixels.
                    </p>
                  </div>

                  {artworkValidationError && (
                    <div className="p-3.5 bg-red-950/50 border border-red-800 rounded-xl flex items-start gap-2.5 text-xs text-red-400">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{artworkValidationError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                    {/* Dropzone */}
                    <div>
                      <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-neutral-800 hover:border-red-600/70 rounded-2xl cursor-pointer bg-neutral-900/40 transition-all text-center">
                        <Upload className="w-8 h-8 text-neutral-400 mb-2" />
                        <span className="text-xs font-bold text-white mb-1">
                          {artworkPreviewUrl ? 'Replace Cover Artwork' : 'Upload Cover Artwork'}
                        </span>
                        <span className="text-[11px] text-neutral-500 font-mono">
                          JPG/JPEG or PNG · 1:1 Square
                        </span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/jpg"
                          onChange={handleArtworkChange}
                          className="hidden"
                        />
                      </label>

                      {artworkUploading && (
                        <p className="text-xs text-amber-400 mt-2 font-mono text-center animate-pulse">
                          Uploading and validating artwork on server...
                        </p>
                      )}
                    </div>

                    {/* Functional Cover Art Preview Box */}
                    <div className="flex flex-col items-center justify-center bg-neutral-900/30 border border-neutral-800 rounded-2xl p-4 min-h-[220px]">
                      {artworkPreviewUrl ? (
                        <div className="space-y-3 text-center">
                          <img
                            src={artworkPreviewUrl}
                            alt="Cover Artwork Preview"
                            className="w-44 h-44 object-cover rounded-xl shadow-lg border border-neutral-700 mx-auto"
                            onError={() =>
                              setArtworkValidationError('Unable to display selected image preview.')
                            }
                          />
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs font-semibold rounded-lg">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Cover artwork ready</span>
                            </span>
                            {artworkDimensions && (
                              <span className="block text-[11px] font-mono text-neutral-400">
                                {artworkDimensions.width} × {artworkDimensions.height} px (1:1 Square)
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={handleRemoveArtwork}
                            className="text-xs text-red-400 hover:text-red-300 transition-colors inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remove and replace artwork</span>
                          </button>
                        </div>
                      ) : (
                        <div className="text-center text-neutral-500 space-y-1">
                          <Disc className="w-10 h-10 mx-auto text-neutral-700" />
                          <span className="text-xs block">No cover artwork uploaded</span>
                          <span className="text-[11px] text-neutral-600">
                            The actual uploaded file will display here
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: AUDIO TRACKS & PER-SONG ARTIST INFORMATION */}
              {step === 3 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white mb-0.5 font-['Space_Grotesk']">
                        Master Audio Track Upload (MP3 Only)
                      </h3>
                      <p className="text-xs text-neutral-400">
                        {releaseType === 'EP' || releaseType === 'Album'
                          ? 'For Episode / Album releases, specify artist information and a lossless audio master for every song.'
                          : 'Upload your MP3 audio master file.'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddTrack}
                      className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-red-500" />
                      <span>Add Track</span>
                    </button>
                  </div>

                  <div className="space-y-5">
                    {tracks.map((track, idx) => (
                      <div
                        key={track.id}
                        className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 space-y-3.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-neutral-800 text-neutral-300 text-xs font-mono font-bold flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="text-xs font-bold text-white">Track #{idx + 1}</span>
                          </div>

                          <div className="flex items-center gap-1">
                            {tracks.length > 1 && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleMoveTrack(idx, 'up')}
                                  disabled={idx === 0}
                                  className="p-1 text-neutral-400 hover:text-white disabled:opacity-30 cursor-pointer"
                                  title="Move Up"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveTrack(idx, 'down')}
                                  disabled={idx === tracks.length - 1}
                                  className="p-1 text-neutral-400 hover:text-white disabled:opacity-30 cursor-pointer"
                                  title="Move Down"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTrack(idx)}
                                  className="p-1 text-neutral-400 hover:text-red-400 ml-1 cursor-pointer"
                                  title="Remove Track"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {track.uploadError && (
                          <div className="p-2.5 bg-red-950/40 border border-red-800 rounded-lg text-xs text-red-400 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <span>{track.uploadError}</span>
                          </div>
                        )}

                        {/* Title and Mix Version */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                          <div className="sm:col-span-7">
                            <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                              Track Title <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={track.title}
                              onChange={(e) => {
                                const copy = [...tracks];
                                copy[idx].title = e.target.value;
                                setTracks(copy);
                              }}
                              placeholder="e.g. Midnight Rhythm"
                              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-red-600"
                            />
                          </div>

                          <div className="sm:col-span-5">
                            <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                              Version / Mix
                            </label>
                            <input
                              type="text"
                              value={track.version}
                              onChange={(e) => {
                                const copy = [...tracks];
                                copy[idx].version = e.target.value;
                                setTracks(copy);
                              }}
                              placeholder="e.g. Original Mix"
                              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-red-600"
                            />
                          </div>
                        </div>

                        {(releaseType === 'EP' || releaseType === 'Album') && (<>
                        {/* Per-Song Artist Metadata (Required for EP & Album releases, customizable for all) */}
                        <div className="p-3 bg-neutral-950/60 border border-neutral-800/80 rounded-xl space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-neutral-300 font-mono flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-red-500" />
                              <span>
                                Song Artist Metadata{' '}
                                {(releaseType === 'EP' || releaseType === 'Album') && (
                                  <span className="text-red-500">*</span>
                                )}
                              </span>
                            </span>

                            <div className="flex items-center gap-3">
                              <button type="button" onClick={() => handleAddTrackPrimaryArtist(idx)} className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1 font-semibold cursor-pointer">
                                <Plus className="w-3 h-3 text-red-500" />
                                <span>Add Primary Artist</span>
                              </button>
                              <button type="button" onClick={() => handleAddTrackFeaturedArtist(idx)} className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1 font-semibold cursor-pointer">
                                <Plus className="w-3 h-3 text-red-500" />
                                <span>Add Featured Artist</span>
                              </button>
                            </div>
                          </div>

                          {/* Per-Song Primary Artists */}
                           <div className="space-y-2">
                             {getTrackPrimaryArtists(track).map((pa, paIdx) => (
                               <div key={`primary-${paIdx}`} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end bg-neutral-900/50 p-2 rounded-lg border border-neutral-800/60">
                                 <div className="sm:col-span-4">
                                   <label className="block text-[10px] font-mono text-neutral-400 mb-1">Primary Artist {paIdx + 1} {releaseType === 'EP' || releaseType === 'Album' ? '*' : ''}</label>
                                   <input type="text" value={pa.name} onChange={(e) => handleUpdateTrackPrimaryArtist(idx, paIdx, 'name', e.target.value)} placeholder="Primary artist name" className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-100 focus:outline-none focus:border-red-600" />
                                 </div>
                                 <div className="sm:col-span-3">
                                   <ArtistProfileField platform="spotify" compact url={pa.spotifyProfileUrl || ''} createRequested={pa.spotifyProfileCreateRequested} onUrlChange={(value) => handleUpdateTrackPrimaryArtist(idx, paIdx, 'spotifyProfileUrl', value)} onCreateRequested={() => { const copy = [...tracks]; const cur = getTrackPrimaryArtists(copy[idx]); cur[paIdx] = { ...cur[paIdx], spotifyProfileUrl: '', spotifyProfileCreateRequested: true }; copy[idx].primaryArtists = cur; setTracks(copy); }} onUseExisting={() => handleUpdateTrackPrimaryArtist(idx, paIdx, 'spotifyProfileCreateRequested', false)} />
                                 </div>
                                 <div className="sm:col-span-3">
                                   <ArtistProfileField platform="apple" compact url={pa.appleMusicProfileUrl || ''} createRequested={pa.appleMusicProfileCreateRequested} onUrlChange={(value) => handleUpdateTrackPrimaryArtist(idx, paIdx, 'appleMusicProfileUrl', value)} onCreateRequested={() => { const copy = [...tracks]; const cur = getTrackPrimaryArtists(copy[idx]); cur[paIdx] = { ...cur[paIdx], appleMusicProfileUrl: '', appleMusicProfileCreateRequested: true }; copy[idx].primaryArtists = cur; setTracks(copy); }} onUseExisting={() => handleUpdateTrackPrimaryArtist(idx, paIdx, 'appleMusicProfileCreateRequested', false)} />
                                 </div>
                                 <div className="sm:col-span-2 flex justify-end gap-1">
                                   {paIdx > 0 && <button type="button" onClick={() => handleRemoveTrackPrimaryArtist(idx, paIdx)} className="text-neutral-500 hover:text-red-400 p-1 cursor-pointer" title="Remove primary artist"><Trash2 className="w-3 h-3" /></button>}
                                 </div>
                               </div>
                             ))}
                           </div>

                           {/* Per-Song Featured Artists via "+ Add Artist" */}
                          {track.featuredArtists && track.featuredArtists.length > 0 && (
                            <div className="space-y-2 pt-2 border-t border-neutral-900">
                              <span className="text-[10px] font-mono text-neutral-400 block uppercase">
                                Song Featured Artist(s):
                              </span>
                              {track.featuredArtists.map((fa, faIdx) => (
                                <div
                                  key={faIdx}
                                  className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-neutral-900/50 p-2 rounded-lg border border-neutral-800/60"
                                >
                                  <div className="sm:col-span-4">
                                    <input
                                      type="text"
                                      value={fa.name}
                                      onChange={(e) =>
                                        handleUpdateTrackFeaturedArtist(
                                          idx,
                                          faIdx,
                                          'name',
                                          e.target.value
                                        )
                                      }
                                      placeholder="Featured artist name"
                                      className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-xs text-neutral-100 focus:outline-none focus:border-red-600"
                                    />
                                  </div>
                                  <div className="sm:col-span-4">
                                    <ArtistProfileField
                                      platform="spotify"
                                      compact
                                      url={fa.spotifyProfileUrl || ''}
                                      createRequested={fa.spotifyProfileCreateRequested}
                                      onUrlChange={(value) => handleUpdateTrackFeaturedArtist(idx, faIdx, 'spotifyProfileUrl', value)}
                                      onCreateRequested={() => {
                                        const copy = [...tracks];
                                        copy[idx].featuredArtists![faIdx].spotifyProfileUrl = '';
                                        copy[idx].featuredArtists![faIdx].spotifyProfileCreateRequested = true;
                                        setTracks(copy);
                                      }}
                                      onUseExisting={() => {
                                        const copy = [...tracks];
                                        copy[idx].featuredArtists![faIdx].spotifyProfileCreateRequested = false;
                                        setTracks(copy);
                                      }}
                                    />
                                  </div>
                                  <div className="sm:col-span-3">
                                    <ArtistProfileField
                                      platform="apple"
                                      compact
                                      url={fa.appleMusicProfileUrl || ''}
                                      createRequested={fa.appleMusicProfileCreateRequested}
                                      onUrlChange={(value) => handleUpdateTrackFeaturedArtist(idx, faIdx, 'appleMusicProfileUrl', value)}
                                      onCreateRequested={() => {
                                        const copy = [...tracks];
                                        copy[idx].featuredArtists![faIdx].appleMusicProfileUrl = '';
                                        copy[idx].featuredArtists![faIdx].appleMusicProfileCreateRequested = true;
                                        setTracks(copy);
                                      }}
                                      onUseExisting={() => {
                                        const copy = [...tracks];
                                        copy[idx].featuredArtists![faIdx].appleMusicProfileCreateRequested = false;
                                        setTracks(copy);
                                      }}
                                    />
                                  </div>
                                  <div className="sm:col-span-1 text-right">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveTrackFeaturedArtist(idx, faIdx)}
                                      className="text-neutral-500 hover:text-red-400 p-1 cursor-pointer"
                                      title="Remove artist"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                          </>)}

                        {/* Dedicated Master Audio Upload Area */}
                        <div>
                          <label className="block text-[11px] font-semibold text-neutral-300 mb-1.5 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <Music className="w-3.5 h-3.5 text-red-500" />
                              <span>Master Audio Track (.mp3 only)</span>
                              <span className="text-red-500">*</span>
                            </span>
                            <span className="text-[10px] font-mono text-neutral-500">
                              MP3 · Max 100MB
                            </span>
                          </label>

                          {!track.fileUrl ? (
                            <label className="flex items-center justify-center gap-3 p-4 border-2 border-dashed border-neutral-800 hover:border-red-500/60 bg-neutral-950/80 rounded-xl cursor-pointer transition-all group">
                              <div className="w-8 h-8 rounded-full bg-red-950/60 border border-red-800/80 flex items-center justify-center text-red-400 group-hover:scale-105 transition-transform shrink-0">
                                <Upload className="w-4 h-4" />
                              </div>
                              <div className="text-left flex-1 min-w-0">
                                <span className="text-xs font-bold text-white block group-hover:text-red-400 transition-colors">
                                  {track.filename
                                    ? `Selected: ${track.filename}`
                                    : 'Click to select or drop MP3 audio file'}
                                </span>
                                <span className="text-[11px] text-neutral-400 block mt-0.5">
                                  Only .mp3 master audio files are accepted.
                                </span>
                              </div>
                              <input
                                type="file"
                                accept=".mp3,audio/mpeg,audio/mp3"
                                onChange={(e) => handleTrackFileChange(idx, e)}
                                className="hidden"
                              />
                            </label>
                          ) : (
                            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 space-y-2.5">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs font-semibold rounded-md shrink-0">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>MP3 Audio Ready</span>
                                  </span>
                                  <span className="text-xs font-mono text-neutral-200 truncate">
                                    {track.filename}
                                  </span>
                                </div>
                                <label className="text-xs text-neutral-400 hover:text-white px-2 py-1 bg-neutral-900 border border-neutral-800 rounded-lg cursor-pointer transition-colors shrink-0">
                                  <span>Replace</span>
                                  <input
                                    type="file"
                                    accept=".mp3,audio/mpeg,audio/mp3"
                                    onChange={(e) => handleTrackFileChange(idx, e)}
                                    className="hidden"
                                  />
                                </label>
                              </div>

                              <AudioPlayer
                                src={track.fileUrl}
                                title={track.title || track.filename || 'Track Preview'}
                                version={track.version}
                                compact={true}
                              />
                            </div>
                          )}
                        </div>

                        {/* Upload Status & Preview Player */}
                        <div className="space-y-2 pt-1">
                          {track.uploading && (
                            <div className="text-xs text-amber-400 font-mono flex items-center gap-2 animate-pulse">
                              <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                              <span>Uploading lossless audio file to server...</span>
                            </div>
                          )}

                          {track.uploadedSuccess && track.fileUrl && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Lossless audio master uploaded successfully</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTrackFile(idx)}
                                  className="text-[11px] text-neutral-400 hover:text-red-400 transition-colors cursor-pointer"
                                >
                                  Replace file
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Explicit toggle */}
                        <div className="pt-1">
                          <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-400">
                            <input
                              type="checkbox"
                              checked={track.explicit}
                              onChange={(e) => {
                                const copy = [...tracks];
                                copy[idx].explicit = e.target.checked;
                                setTracks(copy);
                              }}
                              className="rounded border-neutral-800 text-red-600"
                            />
                            <span>Explicit Content (Parental Advisory)</span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 4: FINAL REVIEW & SUBMIT */}
              {step === 4 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-white mb-0.5 font-['Space_Grotesk']">
                      Final Release Confirmation
                    </h3>
                    <p className="text-xs text-neutral-400">
                      Carefully review your release metadata, cover artwork, and audio files before clicking{' '}
                      <strong>SUBMIT RELEASE</strong>.
                    </p>
                  </div>

                  {/* Summary Card */}
                  <div className="bg-neutral-900/70 border border-neutral-800 rounded-xl p-5 grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div className="flex flex-col items-center text-center">
                      <img
                        src={uploadedArtworkUrl || artworkPreviewUrl!}
                        alt={title}
                        className="w-36 h-36 object-cover rounded-xl border border-neutral-700 shadow"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <span className="text-[11px] font-mono text-neutral-400 mt-2">
                        {artworkDimensions
                          ? `${artworkDimensions.width}×${artworkDimensions.height}px`
                          : '1:1 Square'}
                      </span>
                    </div>

                    <div className="sm:col-span-2 space-y-2.5 text-xs">
                      <div>
                        <span className="text-[10px] font-mono text-neutral-500 uppercase block">
                          Release Title & Type
                        </span>
                        <h4 className="text-base font-bold text-white font-['Space_Grotesk']">{title}</h4>
                        <span className="text-xs text-red-400 font-semibold">
                          {releaseType} · {genre} {subGenre && `(${subGenre})`}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-mono text-neutral-500 uppercase block">
                          Artist(s)
                        </span>
                        <p className="text-neutral-200 font-medium">
                          {effectivePrimaryDisplay.join(', ')}
                          {effectiveFeaturedDisplay.length > 0 &&
                            ` (feat. ${effectiveFeaturedDisplay.join(', ')})`}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-neutral-300">
                        <div>
                          <span className="text-[10px] font-mono text-neutral-500 uppercase block">
                            Language
                          </span>
                          <span>{language}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-mono text-neutral-500 uppercase block">
                            Target Date
                          </span>
                          <span className="font-mono">{targetReleaseDate}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-mono text-neutral-500 uppercase block">
                          Tracklist ({tracks.length} lossless audio master(s))
                        </span>
                        <ul className="text-neutral-300 space-y-1 pt-1 max-h-36 overflow-y-auto">
                          {tracks.map((t, idx) => (
                            <li
                              key={t.id}
                              className="flex items-center justify-between bg-neutral-950/60 px-2.5 py-1 rounded border border-neutral-800 text-[11px]"
                            >
                              <span className="truncate">
                                <strong className="font-mono mr-1.5">{idx + 1}.</strong> {t.title} (
                                {t.version})
                                {t.primaryArtist && (
                                  <span className="text-neutral-400 ml-1">· {t.primaryArtist}</span>
                                )}
                              </span>
                              <span className="text-[10px] font-mono text-neutral-500 shrink-0 ml-2">
                                {t.filename}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Client Notes / Instructions */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Notes / Instructions for Mid-Ama Promo Administrator (Optional)
                    </label>
                    <textarea
                      rows={3}
                      value={clientNotes}
                      onChange={(e) => setClientNotes(e.target.value)}
                      placeholder="Add any additional notes for the administrator regarding this release..."
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-red-600 resize-none"
                    />
                  </div>

                  {/* Final Review Confirmation Checklist */}
                  <div className="p-4 bg-red-950/20 border border-red-900/50 rounded-xl space-y-3">
                    <div className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        id="confirmAccuracy"
                        checked={confirmedAccuracy}
                        onChange={(e) => setConfirmedAccuracy(e.target.checked)}
                        className="mt-0.5 rounded border-neutral-800 text-red-600 cursor-pointer"
                      />
                      <label htmlFor="confirmAccuracy" className="text-xs text-neutral-200 cursor-pointer">
                        <strong>I hereby certify and confirm:</strong> All audio files are finalized MP3 masters
                        masters, cover artwork is square 1:1 original art, artist links are accurate, and I own
                        or control 100% of the distribution and master rights.
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        {!submittedRelease && (
          <div className="shrink-0 px-6 py-4 border-t border-neutral-800 flex items-center justify-between bg-neutral-900/40">
            <div>
              {step === 1 ? (
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5 text-amber-400" />
                  <span>Save Draft</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {step < 4 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-red-950 cursor-pointer"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={!confirmedAccuracy || isSubmitting}
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:hover:bg-red-600 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-red-950 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Submitting Release...</span>
                    </>
                  ) : (
                    <>
                      <Disc className="w-4 h-4" />
                      <span>SUBMIT RELEASE</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Exit confirmation modal warning */}
        {showExitWarning && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95">
              <div className="flex items-center gap-2.5 text-amber-400">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <h3 className="text-sm font-bold text-white font-['Space_Grotesk']">
                  Discard Unsaved Release?
                </h3>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">
                You have unsaved form progress. You can save your draft to resume later, or discard and exit.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowExitWarning(false)}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs rounded-lg cursor-pointer"
                >
                  Stay
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSaveDraft();
                    setShowExitWarning(false);
                    onClose();
                  }}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-lg cursor-pointer"
                >
                  Save Draft & Exit
                </button>
                <button
                  type="button"
                  onClick={handleConfirmClose}
                  className="px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-white font-bold text-xs rounded-lg cursor-pointer"
                >
                  Discard & Exit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
