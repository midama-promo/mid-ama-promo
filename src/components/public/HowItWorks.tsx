import React from 'react';
import { MailCheck, UploadCloud, ShieldCheck, ArrowRight } from 'lucide-react';

interface HowItWorksProps {
  onOpenGetStarted: () => void;
}

export const HowItWorks: React.FC<HowItWorksProps> = ({ onOpenGetStarted }) => {
  const steps = [
    {
      number: '01',
      icon: MailCheck,
      title: 'Email Registration',
      subtitle: 'Verified Artist Onboarding',
      description:
        'Clients receive a direct invitation or register their artist/record label profile. Email OTP verification provides secure, passwordless access to your releases and catalogue.',
      highlight: 'Private Client Account',
    },
    {
      number: '02',
      icon: UploadCloud,
      title: 'Upload & Submit',
      subtitle: 'Strict Industry Standards',
      description:
        'Submit full metadata, primary and featured artists, high-definition square artwork (3000×3000 to 4000×4000px), and lossless WAV or FLAC audio masters.',
      highlight: 'Real-time Validation Checks',
    },
    {
      number: '03',
      icon: ShieldCheck,
      title: 'Review & Distribution',
      subtitle: 'Human Quality Control',
      description:
        'Mid-Ama Promo carefully reviews audio masters, artwork fidelity, and copyright metadata. Track live updates in your dashboard.',
      highlight: 'Worldwide Distribution',
    },
  ];

  return (
    <section id="how-it-works" className="py-20 bg-neutral-950/60 border-b border-neutral-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <span className="text-xs uppercase tracking-[0.25em] font-mono text-red-500 font-bold">
            Workflow Architecture
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-['Space_Grotesk'] tracking-tight">
            How Mid-Ama Promo™ Works
          </h2>
          <p className="text-neutral-400 text-sm sm:text-base leading-relaxed">
            A frictionless, transparent distribution pipeline built specifically for independent creators, producers, and Afro music record labels worldwide.
          </p>
        </div>

        {/* Step Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="relative bg-neutral-900/70 border border-neutral-800/90 rounded-2xl p-7 flex flex-col justify-between hover:border-neutral-700 transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-12 h-12 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-center text-red-500 group-hover:bg-red-950/30 group-hover:border-red-900/50 transition-colors">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="font-['Space_Grotesk'] text-3xl font-extrabold text-neutral-800 group-hover:text-neutral-700 transition-colors">
                      {step.number}
                    </span>
                  </div>

                  <span className="text-xs font-mono text-red-500 font-semibold uppercase tracking-wider block mb-1">
                    {step.subtitle}
                  </span>
                  <h3 className="text-xl font-bold text-white mb-3 font-['Space_Grotesk']">
                    {step.title}
                  </h3>
                  <p className="text-sm text-neutral-400 leading-relaxed">
                    {step.description}
                  </p>
                </div>

                <div className="pt-6 mt-6 border-t border-neutral-800/80 flex items-center justify-between">
                  <span className="text-xs font-mono text-neutral-500">
                    {step.highlight}
                  </span>
                  <div className="w-2 h-2 rounded-full bg-red-600/60" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Prompt */}
        <div className="mt-12 text-center">
          <button
            onClick={onOpenGetStarted}
            className="inline-flex items-center gap-2 px-6 py-3 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-white rounded-xl text-sm font-semibold transition-all hover:border-red-600/50"
          >
            <span>Ready to submit your release?</span>
            <ArrowRight className="w-4 h-4 text-red-500" />
          </button>
        </div>

      </div>
    </section>
  );
};
