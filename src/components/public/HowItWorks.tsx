import React from 'react';
import { MailCheck, ExternalLink, ShieldCheck } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      number: '01',
      icon: MailCheck,
      title: 'Email Registration',
      subtitle: 'Verified Artist Onboarding',
      description:
        'Artist accounts are created by Mid-Ama Promo administration. Artists use their registered email to securely sign in to the new distribution portal.',
      highlight: 'Private Client Account',
    },
    {
      number: '02',
      icon: ExternalLink,
      title: 'New Distribution Portal',
      subtitle: 'All New Releases',
      description:
        'Use our new Artist Distribution Portal for all new music distribution submissions and release management.',
      highlight: 'New Artist Portal',
    },
    {
      number: '03',
      icon: ShieldCheck,
      title: 'Existing Catalogue Preserved',
      subtitle: 'Your Music Remains Available',
      description:
        'Your previously distributed releases remain under Mid-Ama Promo as your record label. This website transition does not remove or affect your existing catalogue.',
      highlight: 'No Catalogue Removal',
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
            A frictionless, transparent distribution pipeline built specifically for independent artists and producers worldwide.
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

        {/* New portal action */}
        <div className="mt-12 text-center">
          <a
            href="https://user.midamapromo.co.za/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-950/30 transition-all hover:-translate-y-0.5 hover:bg-red-500"
          >
            Open New Artist Portal <ExternalLink className="h-4 w-4" />
          </a>
        </div>

      </div>
    </section>
  );
};
