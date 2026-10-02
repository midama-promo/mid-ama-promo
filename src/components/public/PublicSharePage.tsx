import React, { useState, useEffect } from 'react';
import {
  Share2,
  Copy,
  Check,
  Disc,
  Calendar,
  Layers,
  ArrowLeft,
  ExternalLink,
  MessageCircle,
  Radio,
  Sparkles,
  ShieldCheck,
  Music
} from 'lucide-react';
import { api } from '../../services/api';
import { AudioPlayer } from '../common/AudioPlayer';
import { Logo } from '../common/Logo';

interface PublicSharePageProps {
  refNumber: string;
  onBack: () => void;
}

export const PublicSharePage: React.FC<PublicSharePageProps> = ({ refNumber, onBack }) => {
  const [release, setRelease] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTrackIndex, setActiveTrackIndex] = useState(0);

  useEffect(() => {
    const fetchPublicRelease = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.getPublicShareRelease(refNumber);
        setRelease(res.release);
      } catch (err: any) {
        setError(err.message || 'Unable to access release showcase.');
      } finally {
        setLoading(false);
      }
    };

    if (refNumber) {
      fetchPublicRelease();
    }
  }, [refNumber]);

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}?ref=${refNumber}` : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `Check out "${release?.title}" by ${release?.primaryArtists?.join(', ')} on Mid-Ama Promo™ Distribution:\n${shareUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: `${release?.title} - Mid-Ama Promo™`,
          text: `Check out "${release?.title}" by ${release?.primaryArtists?.join(', ')}`,
          url: shareUrl,
        })
        .catch(() => {});
    } else {
      handleCopyLink();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono text-neutral-400">Retrieving official master showcase...</span>
      </div>
    );
  }

  if (error || !release) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-6 space-y-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-red-500 mx-auto">
          <Disc className="w-8 h-8" />
        </div>
        <div className="space-y-2 max-w-md">
          <h2 className="text-2xl font-bold font-['Space_Grotesk']">Release Unavailable</h2>
          <p className="text-xs sm:text-sm text-neutral-400">
            {error || 'This release reference does not exist or has been kept private by the rights holder.'}
          </p>
        </div>
        <button
          onClick={onBack}
          className="px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-xl text-xs font-semibold inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Homepage</span>
        </button>
      </div>
    );
  }

  const activeTrack = release.tracks?.[activeTrackIndex] || release.tracks?.[0];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 pb-20 relative overflow-hidden">
      
      {/* Background ambient glow matching music aesthetic */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-red-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-900 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between h-20">
          <Logo size="md" onClick={onBack} />
          
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-neutral-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 space-y-10 relative z-10">
        
        {/* Verification Banner */}
        <div className="flex items-center justify-between p-3 bg-neutral-900/60 border border-neutral-800 rounded-xl text-xs">
          <div className="flex items-center gap-2 text-neutral-300">
            <ShieldCheck className="w-4 h-4 text-red-500 shrink-0" />
            <span className="font-mono">Official Master Showcase · Mid-Ama Promo™</span>
          </div>
          <span className="font-mono font-bold text-red-400">{release.refNumber}</span>
        </div>

        {/* Release Showcase Hero Card */}
        <div className="bg-neutral-900/70 border border-neutral-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            
            {/* Vinyl artwork representation */}
            <div className="md:col-span-5 flex justify-center">
              <div className="relative group w-64 h-64 sm:w-72 sm:h-72">
                {/* Vinyl disc peeking effect */}
                <div className="absolute top-1 right-[-14px] w-full h-full rounded-full bg-neutral-950 border border-neutral-800 flex items-center justify-center shadow-2xl animate-spin" style={{ animationDuration: '24s' }}>
                  <div className="w-20 h-20 rounded-full border border-neutral-800 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-red-600/60" />
                  </div>
                </div>

                {/* Cover artwork sleeve */}
                <img
                  src={release.artworkUrl}
                  alt={release.title}
                  className="relative z-10 w-full h-full object-cover rounded-2xl border border-neutral-700 shadow-2xl"
                />
              </div>
            </div>

            {/* Metadata & Details */}
            <div className="md:col-span-7 space-y-4">
              <div>
                <span className="text-xs font-mono uppercase tracking-widest text-red-500 font-bold block mb-1">
                  {release.releaseType} · {release.genre} {release.subGenre && `(${release.subGenre})`}
                </span>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-white font-['Space_Grotesk'] leading-tight">
                  {release.title}
                </h1>
                <p className="text-lg text-neutral-300 font-semibold mt-1">
                  {release.primaryArtists?.join(', ')}
                  {release.featuredArtists?.length > 0 && (
                    <span className="text-neutral-400 font-normal"> (feat. {release.featuredArtists?.join(', ')})</span>
                  )}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 py-3 border-y border-neutral-800/80 text-xs">
                <div>
                  <span className="text-[10px] font-mono text-neutral-500 uppercase block">Label / Artist</span>
                  <span className="font-semibold text-neutral-200">{release.artistLabelName}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-neutral-500 uppercase block">Target Release Date</span>
                  <span className="font-mono text-neutral-200">{release.targetReleaseDate}</span>
                </div>
              </div>

              {/* Share Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold rounded-xl transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-xs font-semibold rounded-xl transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                  <span>WhatsApp Share</span>
                </button>

                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-colors shadow-md shadow-red-950"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share</span>
                </button>
              </div>
            </div>

          </div>

        </div>

        {/* Audio Player for Tracks */}
        {release.tracks && release.tracks.length > 0 && (
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
                <Music className="w-5 h-5 text-red-500" />
                <span>Audio Stream Preview</span>
              </h3>
              <span className="text-xs font-mono text-neutral-400">
                {release.tracks.length} Master Track(s)
              </span>
            </div>

            {activeTrack && (
              <AudioPlayer
                src={activeTrack.fileUrl}
                title={activeTrack.title}
                artist={release.primaryArtists?.join(', ')}
                version={activeTrack.version}
              />
            )}

            {/* Tracklist selection */}
            {release.tracks.length > 1 && (
              <div className="divide-y divide-neutral-800/80 bg-neutral-950/80 border border-neutral-800 rounded-xl overflow-hidden">
                {release.tracks.map((track: any, idx: number) => (
                  <div
                    key={track.trackNumber}
                    onClick={() => setActiveTrackIndex(idx)}
                    className={`flex items-center justify-between p-3.5 cursor-pointer transition-colors ${
                      activeTrackIndex === idx ? 'bg-neutral-800/80 text-white' : 'hover:bg-neutral-900 text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-400 font-mono text-xs flex items-center justify-center">
                        {track.trackNumber}
                      </span>
                      <div>
                        <span className="text-xs font-semibold block">{track.title}</span>
                        {track.version && (
                          <span className="text-[10px] text-neutral-500 block">{track.version}</span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="text-xs px-3 py-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 rounded-lg"
                    >
                      {activeTrackIndex === idx ? 'Playing' : 'Listen'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
};
