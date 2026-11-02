import React from 'react';
import { Flame, Disc, Globe2, Radio, MapPin, Award } from 'lucide-react';

export const AmapianoFocus: React.FC = () => {
  const subgenres = [
    { name: 'Private School Piano', desc: 'Soulful chords, live saxophone, jazzy Rhodes & introspective basslines.' },
    { name: 'Bacardi & Pretoria Groove', desc: 'Punchy snares, infectious street bounce, high-tempo dance floor anthems.' },
    { name: 'Sgija & Quantum', desc: 'Heavy underground percussive kicks, raw street energy and hypnotic vocal chops.' },
    { name: 'Afro Tech & 3-Step', desc: 'Dark synth progressions, driving African percussion and rolling electronic rhythms.' },
    { name: 'Afro House & Gqom', desc: 'Durban broken beat, raw minimalist bass loops, and high-energy club cuts.' },
    { name: 'Afrobeat & Afro Pop', desc: 'Melodic West & East African hooks, infectious grooves, and worldwide crossover appeal.' },
  ];

  return (
    <section id="amapiano-focus" className="py-20 bg-neutral-950 border-b border-neutral-900 relative overflow-hidden">
      
      {/* Decorative dark glow */}
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-red-900/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-xs font-mono text-neutral-300">
            <MapPin className="w-3.5 h-3.5 text-red-500" />
            <span>Rooted in Mzansi · Distributed Worldwide</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white font-['Space_Grotesk'] tracking-tight">
            Championing South African & Afro Independent Artists
          </h2>
          <p className="text-neutral-400 text-sm sm:text-base leading-relaxed">
            From township bedroom studios in Pretoria, Soweto, Soshanguve, Katlehong, and Durban to global dancefloors in London, Lagos, New York, and Ibiza.
          </p>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-center text-red-500 mb-4">
                <Flame className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2 font-['Space_Grotesk']">
                Amapiano Culture-First Ingestion
              </h3>
              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                We understand the nuances of the Yanos movement: log drum sonic balance, extended club mixes vs. radio cuts, and the vital importance of street mixtapes turning into official DSP releases.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-neutral-800/80 text-xs font-mono text-neutral-500 flex items-center gap-2">
              <Award className="w-4 h-4 text-red-500" />
              <span>Independent Artist Centric</span>
            </div>
          </div>

          <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-center text-red-500 mb-4">
                <Globe2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2 font-['Space_Grotesk']">
                Global Release Reach
              </h3>
              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                Seamless digital release delivery and promotional management tailored for independent artists and producers.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-neutral-800/80 text-xs font-mono text-neutral-500 flex items-center gap-2">
              <Disc className="w-4 h-4 text-red-500" />
              <span>Worldwide Royalty Collection</span>
            </div>
          </div>

          <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-center text-red-500 mb-4">
                <Radio className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2 font-['Space_Grotesk']">
                Artist Master Ownership
              </h3>
              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                Master ownership: Free and Premium plans provide 100% artist ownership. Publishing rights are separate from master ownership.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-neutral-800/80 text-xs font-mono text-neutral-500 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Plan-Based Master Ownership</span>
            </div>
          </div>

        </div>

        {/* Subgenres Matrix */}
        <div className="bg-neutral-900/50 border border-neutral-800/90 rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h4 className="text-base sm:text-lg font-bold text-white font-['Space_Grotesk']">
                Specialized Genres We Power
              </h4>
              <p className="text-xs text-neutral-400">
                Precision genre taxonomy configured for DSP algorithms and playlist curation.
              </p>
            </div>
            <span className="text-xs font-mono text-red-500 self-start sm:self-center">
              MID-AMA™ AUDIO STANDARDS
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subgenres.map(sg => (
              <div key={sg.name} className="p-3.5 bg-neutral-950/80 rounded-xl border border-neutral-800/80">
                <span className="text-xs font-bold text-neutral-200 block mb-1">
                  {sg.name}
                </span>
                <p className="text-[11px] text-neutral-400 leading-normal">
                  {sg.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};
