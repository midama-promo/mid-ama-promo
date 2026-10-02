import React, { useState } from 'react';
import { Music, Image as ImageIcon, FileText, CheckCircle2, AlertTriangle, Upload } from 'lucide-react';

export const Requirements: React.FC = () => {
  const [testArtworkResult, setTestArtworkResult] = useState<{
    width: number;
    height: number;
    isSquare: boolean;
    validSize: boolean;
    validFormat: boolean;
    filename: string;
  } | null>(null);

  const handleTestArtwork = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validFormat = ['image/jpeg', 'image/png', 'image/jpg'].includes(file.type);
    const img = new Image();
    img.onload = () => {
      const isSquare = img.width === img.height;
      const validSize = img.width >= 1000 && img.width <= 2500;
      setTestArtworkResult({
        width: img.width,
        height: img.height,
        isSquare,
        validSize,
        validFormat,
        filename: file.name,
      });
    };
    img.src = URL.createObjectURL(file);
  };

  return (
    <section id="requirements" className="py-20 bg-neutral-950 border-b border-neutral-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <span className="text-xs uppercase tracking-[0.25em] font-mono text-red-500 font-bold">
            Technical Compliance
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-['Space_Grotesk'] tracking-tight">
            Submission Technical Requirements
          </h2>
          <p className="text-neutral-400 text-sm sm:text-base">
            To prevent streaming ingestion rejections and ensure the highest audio-visual playback quality worldwide, all submissions must meet these specifications.
          </p>
        </div>

        {/* Requirements Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          
          {/* Card 1: Audio */}
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 relative overflow-hidden">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-950/40 border border-red-900/40 flex items-center justify-center text-red-500">
                <Music className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                  Audio Masters
                </h3>
                <span className="text-xs font-mono text-red-500">Strict MP3 Format</span>
              </div>
            </div>

            <ul className="space-y-3 text-xs sm:text-sm text-neutral-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>MP3 audio format only</strong> (.mp3 file extension).</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>320 kbps constant bitrate</strong> strongly preferred for pristine acoustic clarity.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Stereo 44.1kHz sample rate, uncorrupted master headers.</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>WAV, AIFF, FLAC, and M4A are rejected at upload; convert to 320kbps MP3 before uploading.</span>
              </li>
            </ul>
          </div>

          {/* Card 2: Artwork */}
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 relative overflow-hidden">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-950/40 border border-red-900/40 flex items-center justify-center text-red-500">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                  Cover Artwork
                </h3>
                <span className="text-xs font-mono text-red-500">Square 1:1 Aspect Ratio</span>
              </div>
            </div>

            <ul className="space-y-3 text-xs sm:text-sm text-neutral-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Perfect 1:1 Square</strong> (Width must equal Height).</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Between 1000×1000 and 2500×2500 pixels</strong>.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>File types: <strong>JPG or PNG</strong> (RGB color profile).</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>No pixelated images, barcode stickers, social media handles, or URL watermarks.</span>
              </li>
            </ul>
          </div>

          {/* Card 3: Metadata */}
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 relative overflow-hidden">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-950/40 border border-red-900/40 flex items-center justify-center text-red-500">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                  Release Metadata
                </h3>
                <span className="text-xs font-mono text-red-500">Accurate Tagging</span>
              </div>
            </div>

            <ul className="space-y-3 text-xs sm:text-sm text-neutral-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Primary & Featured Artists separated accurately.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Genre classification (Amapiano, Afro Tech, Deep House, etc.).</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Target release date (minimum 10-14 days recommended for editorial playlist pitching).</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>C-Line (Copyright) & P-Line (Sound Recording Phonogram) credits.</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Live Artwork Pre-Check Widget */}
        <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-6 max-w-2xl mx-auto shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Interactive Live Artwork Validator</span>
                <span className="text-[10px] bg-red-950/60 border border-red-800 text-red-400 font-mono px-2 py-0.5 rounded">
                  Instant Test
                </span>
              </h4>
              <p className="text-xs text-neutral-400">
                Upload your cover artwork file right now to test if it complies with our 1000–2500px square specifications.
              </p>
            </div>
          </div>

          <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-neutral-700 hover:border-red-600/70 rounded-xl cursor-pointer bg-neutral-950/50 transition-colors">
            <Upload className="w-6 h-6 text-neutral-400 mb-2" />
            <span className="text-xs font-semibold text-neutral-200">
              Click to choose an image file (JPG or PNG)
            </span>
            <span className="text-[11px] text-neutral-500 mt-0.5">
              Tested purely client-side before submission
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/jpg"
              onChange={handleTestArtwork}
              className="hidden"
            />
          </label>

          {testArtworkResult && (
            <div className="mt-4 p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-xs space-y-2">
              <div className="flex items-center justify-between font-mono">
                <span className="text-neutral-400 truncate max-w-xs">{testArtworkResult.filename}</span>
                <span className="text-white font-bold">{testArtworkResult.width} × {testArtworkResult.height} px</span>
              </div>
              
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-neutral-800/80">
                <div className="flex items-center gap-1.5">
                  {testArtworkResult.isSquare ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  )}
                  <span className={testArtworkResult.isSquare ? 'text-emerald-400' : 'text-red-400'}>
                    {testArtworkResult.isSquare ? 'Perfect Square' : 'Not Square'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {testArtworkResult.validSize ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  )}
                  <span className={testArtworkResult.validSize ? 'text-emerald-400' : 'text-red-400'}>
                    {testArtworkResult.validSize ? '1000–2500px OK' : 'Size Invalid'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {testArtworkResult.validFormat ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  )}
                  <span className={testArtworkResult.validFormat ? 'text-emerald-400' : 'text-red-400'}>
                    {testArtworkResult.validFormat ? 'JPG/PNG OK' : 'Format Invalid'}
                  </span>
                </div>
              </div>

              {testArtworkResult.isSquare && testArtworkResult.validSize && testArtworkResult.validFormat ? (
                <p className="text-emerald-400 font-medium pt-1">
                  ✓ Excellent! Your artwork passes all Mid-Ama Promo technical distribution standards.
                </p>
              ) : (
                <p className="text-red-400 font-medium pt-1">
                  ✗ Needs adjustment: Please export your artwork as a square JPG or PNG between 1000×1000 and 2500×2500 pixels.
                </p>
              )}
            </div>
          )}
        </div>

      </div>
    </section>
  );
};
