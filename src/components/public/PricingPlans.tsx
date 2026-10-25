import React from 'react';
import { Check, Crown, Music2, Sparkles } from 'lucide-react';

interface PricingPlansProps { onChoosePlan: () => void; }

const plans = [
  { name: 'Free', price: 'R0', subtitle: 'For new independent artists', icon: Music2, popular: false, features: ['50 release submissions per month', 'Artist receives 100% of applicable royalties', 'Artist owns 100% of the master recording', 'Up to 10 artist profiles', 'Private client dashboard and release tracking'] },
  { name: 'Starter', price: 'R99', subtitle: 'For independent artists', icon: Sparkles, popular: true, features: ['Unlimited release submissions', 'Artist receives 100% of applicable royalties', 'Artist owns 100% of the master recording', 'Up to 20 artist profiles', 'Priority processing and metadata support'] },
  { name: 'Pro', price: 'R449', subtitle: 'For high-volume independent artists', icon: Crown, popular: false, features: ['Unlimited release submissions', 'Artist receives 100% of applicable royalties', 'Artist owns 100% of the master recording', 'Unlimited artist profiles', 'Priority support and advanced catalogue tools'] },
];

export const PricingPlans: React.FC<PricingPlansProps> = ({ onChoosePlan }) => (
  <section id="pricing" className="py-20 bg-neutral-950 border-y border-neutral-900">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto text-center mb-10">
        <p className="text-xs uppercase tracking-[0.25em] font-bold text-red-400">Simple, transparent pricing</p>
        <h2 className="text-3xl sm:text-4xl font-black text-white mt-3">Your music. Your catalogue. Your plan.</h2>
        <p className="text-sm sm:text-base text-neutral-400 mt-4">Affordable tools and hands-on release submission support for independent artists.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {plans.map((plan) => {
          const Icon = plan.icon;
          return <article key={plan.name} className={`rounded-2xl border ${plan.popular ? 'border-red-600 shadow-xl shadow-red-950/20' : 'border-neutral-800'} bg-neutral-900/70 p-6 flex flex-col`}>
            <div className="flex items-center justify-between"><div className="w-11 h-11 rounded-xl bg-neutral-800 flex items-center justify-center"><Icon className={`w-5 h-5 ${plan.popular ? 'text-red-400' : 'text-neutral-200'}`} /></div>{plan.popular && <span className="text-[10px] font-bold uppercase tracking-widest bg-red-950 text-red-300 border border-red-800 rounded-full px-3 py-1">Popular</span>}</div>
            <h3 className="text-xl font-extrabold text-white mt-5">{plan.name}</h3>
            <p className="text-xs text-neutral-400 mt-1">{plan.subtitle}</p>
            <div className="mt-5"><span className="text-4xl font-black text-white">{plan.price}</span><span className="text-sm text-neutral-500"> / month</span></div>
            <ul className="mt-6 mb-7 space-y-3 flex-1">{plan.features.map((feature) => <li key={feature} className="flex items-start gap-2 text-sm text-neutral-300"><Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />{feature}</li>)}</ul>
            {plan.name === 'Free' ? <button onClick={onChoosePlan} className="w-full rounded-xl px-4 py-3 text-sm font-bold transition-colors bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white">Create free account</button> : <button type="button" disabled aria-disabled="true" className="w-full rounded-xl px-4 py-3 text-sm font-bold border border-neutral-700 bg-neutral-800/60 text-neutral-400 cursor-not-allowed">Coming soon</button>}
          </article>;
        })}
      </div>
      <p className="text-center text-sm font-semibold text-amber-300 mt-6">Starter and Pro subscriptions are coming soon while Paystack completes business verification. Paid-plan checkout is temporarily unavailable. Free accounts remain available.</p>
      <p className="text-center text-xs text-neutral-500 mt-2">When paid plans launch, each successful payment will provide 30 days of access and manual renewal will be required. Distribution acceptance and release dates remain subject to review and platform requirements.</p>
    </div>
  </section>
);
