import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Music } from 'lucide-react';

interface AudioPlayerProps {
  src: string;
  title: string;
  artist?: string;
  version?: string;
  compact?: boolean;
  autoPlay?: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  src,
  title,
  artist,
  version,
  compact = false,
  autoPlay = false,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setError(null);
  }, [src]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.warn('Audio playback prevented or failed:', err);
        setError('Preview playback paused. Click to play.');
      });
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
      audioRef.current.volume = volume;
      if (autoPlay) {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = target;
      setCurrentTime(target);
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    audioRef.current.muted = nextMute;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
      audioRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3 bg-neutral-900/80 border border-neutral-800 rounded-lg p-2.5">
        <audio
          ref={audioRef}
          src={src}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
          onError={() => setError('Audio source unreachable')}
        />
        <button
          type="button"
          onClick={togglePlay}
          className="w-8 h-8 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shrink-0 shadow-md transition-colors"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-neutral-200 truncate">{title}</span>
            {version && (
              <span className="text-[10px] text-neutral-400 font-medium shrink-0">({version})</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-red-600"
            />
            <span className="text-[10px] font-mono text-neutral-400 shrink-0">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 shadow-lg">
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        onError={() => setError('Audio file unavailable or format unsupported')}
      />

      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${isPlaying ? 'bg-red-950/40 border-red-800 text-red-500' : 'bg-neutral-800 border-neutral-700 text-neutral-400'}`}>
            <Music className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-neutral-100 truncate flex items-center gap-2">
              {title}
              {version && (
                <span className="text-xs font-normal text-neutral-400">· {version}</span>
              )}
            </h4>
            {artist && (
              <p className="text-xs text-neutral-400 truncate">{artist}</p>
            )}
          </div>
        </div>

        {/* Animated Waveform Visualizer simulation */}
        <div className="hidden sm:flex items-end gap-[3px] h-6 px-3 py-1 bg-neutral-950/60 rounded-md border border-neutral-800">
          {[30, 75, 45, 90, 60, 100, 40, 80, 50, 70, 35, 95].map((h, i) => (
            <span
              key={i}
              className={`w-[2px] rounded-full transition-all duration-150 ${isPlaying ? 'bg-red-600' : 'bg-neutral-700'}`}
              style={{
                height: isPlaying ? `${Math.max(20, (h * ((currentTime * 3 + i) % 10)) / 10)}%` : '20%',
              }}
            />
          ))}
        </div>
      </div>

      {/* Scrubber track */}
      <div className="space-y-1.5">
        <input
          type="range"
          min="0"
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-red-600 focus:outline-none"
        />
        <div className="flex justify-between text-[11px] font-mono text-neutral-400">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Control bar */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-neutral-800/80">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={togglePlay}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-md transition-colors shadow-sm"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Play Track</span>
              </>
            )}
          </button>
          <span className="text-[11px] text-neutral-400 font-mono ml-2">MP3</span>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMute}
            className="text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-16 sm:w-20 h-1 bg-neutral-800 rounded appearance-none cursor-pointer accent-red-600"
          />
        </div>
      </div>

      {error && (
        <div className="mt-2 text-xs text-amber-400/90 font-mono">
          {error}
        </div>
      )}
    </div>
  );
};
