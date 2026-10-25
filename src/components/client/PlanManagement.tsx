import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, CreditCard, Crown, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import { api, PlanUsageResponse } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const planCards = [
  { id: 'free' as const, name: 'Free', price: 0, artists: 'Up to 50 artist profiles', releases: '50 releases / month', accent: 'neutral', features: ['Client dashboard and release tracking', 'Upload audio, artwork and metadata', '80% artist / 20% Mid-Ama Promo royalty split', '100% artist master ownership', 'Manual submission review'] },
  { id: 'starter' as const, name: 'Starter', price: 99, artists: 'Unlimited artist profiles', releases: 'Unlimited releases', accent: 'red', features: ['100% of applicable royalties to artist', '100% artist master ownership', 'Priority processing for complete submissions', 'Release corrections and metadata support'] },
  { id: 'pro' as const, name: 'Pro', price: 449, artists: 'Unlimited artist profiles', releases: 'Unlimited releases', accent: 'purple', features: ['100% of applicable royalties to artist', '100% artist master ownership', 'Priority support and processing', 'Advanced artist catalogue tools'] },
];

export const PlanManagement: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [plan, setPlan] = useState<PlanUsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutPlan, setCheckoutPlan] = useState<'starter' | 'pro' | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const handledReference = useRef<string | null>(null);

  const loadPlan = useCallback(async () => {
    try { setPlan(await api.getPlanUsage()); }
    catch (e: any) { setError(e?.message || 'Could not load your plan usage.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadPlan(); }, [loadPlan]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') !== 'paystack') return;
    const reference = params.get('reference');
    if (!reference || handledReference.current === reference) return;
    handledReference.current = reference;
    setNotice('Checking your Paystack payment…');
    setError('');
    api.verifyPlanPayment(reference).then(async (result) => {
      setNotice(result.message || 'Payment verified. Your plan is active.');
      await refreshUser();
      await loadPlan();
    }).catch((e: any) => {
      setError(e?.message || 'We could not verify the payment yet. If Paystack charged you, please wait a moment and retry from this page.');
      setNotice('');
    }).finally(() => {
      params.delete('payment'); params.delete('reference');
      const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}${window.location.hash}`;
      window.history.replaceState({}, '', next);
    });
  }, [user?.id, refreshUser, loadPlan]);

  const startCheckout = async (id: 'starter' | 'pro') => {
    setCheckoutPlan(id); setError(''); setNotice('');
    try {
      const result = await api.initializePlanPayment(id);
      window.location.assign(result.authorizationUrl);
    } catch (e: any) {
      setError(e?.message || 'Could not open Paystack checkout.');
      setCheckoutPlan(null);
    }
  };

  const releasePercent = plan?.limits.releasesPerMonth ? Math.min(100, (plan.usage.releasesThisMonth / plan.limits.releasesPerMonth) * 100) : 0;
  const artistPercent = plan?.limits.artists ? Math.min(100, (plan.usage.artists / plan.limits.artists) * 100) : 0;
  const expiresLabel = plan?.planExpiresAt ? new Date(plan.planExpiresAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : null;

  return (
    <section id="plans" className="rounded-2xl border border-neutral-800 bg-neutral-950/70 p-5 sm:p-7 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-red-400"><CreditCard className="w-4 h-4" /> Plans & billing</div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-2">Choose the plan that fits your catalogue</h2>
          <p className="text-sm text-neutral-400 mt-1">Starter and Pro checkout are temporarily unavailable while Paystack reviews the business account. Paid plans will be enabled after approval.</p>
        </div>
        {plan && <div className="shrink-0 rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 min-w-36">
          <p className="text-[10px] uppercase tracking-widest text-neutral-500">Current plan</p>
          <p className="text-lg font-bold text-white">{plan.planName}</p>
          {expiresLabel && <p className="text-xs text-neutral-400">Valid until {expiresLabel}</p>}
        </div>}
      </div>

      {notice && <div role="status" className="rounded-xl border border-emerald-800 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">{notice}</div>}
      {error && <div role="alert" className="rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-200">{error}</div>}

      {plan && <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl bg-neutral-900 border border-neutral-800 p-4">
          <div className="flex items-center justify-between text-sm"><span className="text-neutral-300">Releases submitted in the last 30 days</span><strong className="text-white">{plan.usage.releasesThisMonth} / {plan.limits.releasesPerMonth ?? '∞'}</strong></div>
          {plan.limits.releasesPerMonth !== null && <div className="h-2 rounded-full bg-neutral-800 mt-3 overflow-hidden"><div className="h-full bg-red-500 rounded-full" style={{ width: `${releasePercent}%` }} /></div>}
        </div>
        <div className="rounded-xl bg-neutral-900 border border-neutral-800 p-4">
          <div className="flex items-center justify-between text-sm"><span className="text-neutral-300">Unique artist profiles</span><strong className="text-white">{plan.usage.artists} / {plan.limits.artists ?? '∞'}</strong></div>
          {plan.limits.artists !== null && <div className="h-2 rounded-full bg-neutral-800 mt-3 overflow-hidden"><div className="h-full bg-purple-500 rounded-full" style={{ width: `${artistPercent}%` }} /></div>}
        </div>
      </div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {planCards.map((card) => {
          const isCurrent = plan?.planId === card.id;
          const accent = card.accent === 'red' ? 'border-red-700/70 shadow-red-950/20' : card.accent === 'purple' ? 'border-purple-700/70 shadow-purple-950/20' : 'border-neutral-800';
          return <article key={card.id} className={`rounded-2xl border ${accent} bg-neutral-900/80 p-5 flex flex-col gap-4 ${card.id === 'starter' ? 'shadow-xl' : ''}`}>
            <div className="flex items-center justify-between gap-2"><h3 className="text-lg font-extrabold text-white">{card.name}</h3>{card.id === 'pro' ? <Crown className="w-5 h-5 text-purple-300" /> : card.id === 'starter' ? <Sparkles className="w-5 h-5 text-red-300" /> : <ShieldCheck className="w-5 h-5 text-neutral-400" />}</div>
            <div><span className="text-3xl font-black text-white">R{card.price}</span><span className="text-sm text-neutral-500"> / month</span></div>
            <div className="space-y-2 text-sm text-neutral-200"><p className="font-semibold">{card.releases}</p><p>{card.artists}</p></div>
            <ul className="space-y-2 flex-1">{card.features.map((feature) => <li key={feature} className="flex gap-2 text-xs leading-relaxed text-neutral-300"><Check className="w-4 h-4 text-emerald-400 shrink-0" />{feature}</li>)}</ul>
            {isCurrent ? <button disabled className="w-full rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-sm font-bold text-neutral-300 cursor-default">Current plan</button> : card.id === 'free' ? <p className="text-xs text-neutral-500">Free access is available to all client accounts.</p> : <button type="button" disabled aria-disabled="true" title="Paid plans will be available after Paystack approval" className="w-full rounded-xl border border-neutral-700 bg-neutral-800/60 px-4 py-3 text-sm font-bold text-neutral-400 cursor-not-allowed">Coming soon</button>}
          </article>;
        })}
      </div>
      <p className="text-xs leading-relaxed text-neutral-500">Each single, EP or album counts as one release submission, regardless of track count. Release and artist limits are enforced by the server. Corrections to an existing submission should be handled on that submission rather than creating a duplicate.</p>
      <div className="flex items-center gap-2 text-xs text-neutral-500"><RefreshCw className="w-3.5 h-3.5" />{loading ? 'Refreshing plan usage…' : 'Usage updates when you submit a release or add artist metadata.'}</div>
    </section>
  );
};
