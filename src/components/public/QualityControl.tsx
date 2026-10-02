import React from 'react';
import { ShieldCheck, Sliders, CheckCheck, FileSearch, Headphones, Sparkles } from 'lucide-react';

export const QualityControl: React.FC = () => {
  const qcPoints = [
    {
      icon: Headphones,
      title: 'Acoustic Fidelity & Log-Drum Auditing',
      description:
        'Amapiano and Afro music heavily rely on sub-bass log drums and detailed percussive layers. We verify that masters are properly encoded at 320kbps without phase cancellation, clipping, or degraded low frequencies.',
    },
    {
      icon: FileSearch,
      title: 'Release Metadata Harmonization',
      description:
        'Industry style guidelines are strict on capitalization, featuring tags, and track sequence numbers. We correct discrepancies before release processing.',
    },
    {
      icon: Sliders,
      title: 'Cover Art & Typography Compliance',
      description:
        'We reject artwork with barcodes, social handles (@), URLs, or blurry elements. Our team audits your cover visual to ensure swift approval for worldwide distribution.',
    },
    {
      icon: ShieldCheck,
      title: 'Duplicate & Rights Pre-Clearance',
      description:
        'We prevent automated takedowns by confirming original or properly licensed stems, correct ISRC assignments, and valid C-Line / P-Line legal notices.',
    },
  ];

  return (
    <section id="quality-control" className="py-20 bg-neutral-950/70 border-b border-neutral-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Explanatory Context */}
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/40 border border-red-900/50 text-xs font-mono text-red-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Human Quality Control</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-['Space_Grotesk'] tracking-tight leading-tight">
              Why We Review Every Submission Before Global Distribution
            </h2>

            <p className="text-neutral-300 text-sm sm:text-base leading-relaxed">
              Unlike generic automated aggregate portals where corrupt audio files or rejected artwork bounce back after weeks of silence, Mid-Ama Promo operates an active quality control desk.
            </p>

            <p className="text-neutral-400 text-sm sm:text-base leading-relaxed">
              If an issue is found (e.g. missing featured artist credit, non-square cover art, or track master errors), our team immediately flags the release as <strong>Corrections Required</strong> with actionable feedback, allowing artists to update their files directly in the portal.
            </p>

            <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 font-semibold">
                <CheckCheck className="w-4 h-4" />
                <span>Zero Ingestion Bounce-Back Guarantee</span>
              </div>
              <p className="text-xs text-neutral-400">
                Once Mid-Ama Promo approves your release, your music enters the DSP delivery pipeline with guaranteed compliance.
              </p>
            </div>
          </div>

          {/* Right Column: Key Inspection Pillars */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {qcPoints.map((point) => {
              const Icon = point.icon;
              return (
                <div
                  key={point.title}
                  className="bg-neutral-900/60 border border-neutral-800/80 rounded-xl p-5 hover:border-neutral-700 transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-center text-red-500 mb-3.5">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-2 font-['Space_Grotesk']">
                    {point.title}
                  </h3>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    {point.description}
                  </p>
                </div>
              );
            })}
          </div>

        </div>

      </div>
    </section>
  );
};
