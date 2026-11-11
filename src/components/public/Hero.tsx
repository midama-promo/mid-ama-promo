import React, { useState } from 'react';
import { LogIn, Mail, ArrowRight, Search, Shield, Music, Disc } from 'lucide-react';

interface HeroProps {
  onOpenSignIn: () => void;
  onOpenContact: () => void;
  onLookupRef: (ref: string) => void;
}

export const Hero: React.FC<HeroProps> = ({
  onOpenSignIn,
  onOpenContact,
  onLookupRef,
}) => {
  const [refInput, setRefInput] = useState('');

  const handleRefSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (refInput.trim()) {
      onLookupRef(refInput.trim().toUpperCase());
    }
  };

  return (
    <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 border-b border-neutral-900">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-red-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 right-10 w-72 h-72 bg-neutral-800/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Brand Tagline Badge */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900/90 border border-neutral-800 text-xs font-mono text-neutral-300">
            <span className="w-2 h-2 rounded-full bg-red-600" />
            <span className="text-red-500 font-semibold tracking-wide uppercase">MID-AMA PROMO™</span>
            <span className="text-neutral-500">/</span>
            <span>Worldwide Music Distribution & Promotion</span>
          </div>
        </div>

        {/* Main Headline */}
        <div className="text-center max-w-4xl mx-auto space-y-6">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white font-['Space_Grotesk'] leading-[1.08]">
            Distribution Service for{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-red-400 to-amber-400">
              Amapiano & Afro Music
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-neutral-300 max-w-2xl mx-auto font-normal leading-relaxed">
            Mid-Ama Promo continues to manage your existing released catalogue as your record label. All new music distribution is now handled through our new Artist Portal.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <a
              href="https://user.midamapromo.co.za/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2.5 px-7 py-3.5 bg-red-600 hover:bg-red-500 active:scale-98 text-white font-bold text-sm sm:text-base rounded-xl shadow-lg shadow-red-600/20 transition-all"
            >
              <span>Go to New Artist Portal</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </a>

            <button
              onClick={onOpenSignIn}
              className="flex items-center gap-2.5 px-6 py-3.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-100 font-semibold text-sm sm:text-base rounded-xl transition-all"
            >
              <LogIn className="w-5 h-5 text-neutral-400" />
              <span>Sign In</span>
            </button>

            <button
              onClick={onOpenContact}
              className="flex items-center gap-2 px-5 py-3.5 text-neutral-400 hover:text-white text-sm sm:text-base font-medium transition-colors"
            >
              <Mail className="w-4 h-4 text-red-500" />
              <span>Contact</span>
            </button>
          </div>

          {/* Public Reference Lookup */}
          <div className="pt-8 max-w-lg mx-auto">
            <form onSubmit={handleRefSubmit} className="relative flex items-center">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="text"
                placeholder="Track release by reference number (e.g. MAP-2026-XXXX)..."
                value={refInput}
                onChange={(e) => setRefInput(e.target.value)}
                className="w-full bg-neutral-900/80 border border-neutral-800 rounded-xl pl-10 pr-24 py-2.5 text-xs sm:text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-red-600/70"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-lg transition-colors"
              >
                Track
              </button>
            </form>
          </div>
        </div>

        {/* Feature Highlights Banner */}
        <div className="mt-16 pt-10 border-t border-neutral-900/80">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto text-center">
            <div className="p-4 bg-neutral-900/40 border border-neutral-800/80 rounded-xl">
              <Shield className="w-5 h-5 text-red-500 mx-auto mb-2" />
              <h4 className="text-xs font-bold text-white font-['Space_Grotesk'] uppercase tracking-wider">Private Client Accounts</h4>
              <p className="text-[11px] text-neutral-400 mt-1">Direct administrator onboarding with private access credentials</p>
            </div>
            <div className="p-4 bg-neutral-900/40 border border-neutral-800/80 rounded-xl">
              <Music className="w-5 h-5 text-red-500 mx-auto mb-2" />
              <h4 className="text-xs font-bold text-white font-['Space_Grotesk'] uppercase tracking-wider">Lossless Masters & Square Artwork</h4>
              <p className="text-[11px] text-neutral-400 mt-1">Strict audio master validation and high-resolution cover preview</p>
            </div>
            <div className="p-4 bg-neutral-900/40 border border-neutral-800/80 rounded-xl">
              <Disc className="w-5 h-5 text-red-500 mx-auto mb-2" />
              <h4 className="text-xs font-bold text-white font-['Space_Grotesk'] uppercase tracking-wider">Quality Review Desk</h4>
              <p className="text-[11px] text-neutral-400 mt-1">Dedicated administrator approval, denial, and corrections tracking</p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
