import React from 'react';

export const Policies: React.FC = () => (
  <section id="policies" className="py-20 border-t border-neutral-900 bg-neutral-950">
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-10">
        <p className="text-xs font-mono uppercase tracking-widest text-red-500">Mid-Ama Promo Terms</p>
        <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-white font-['Space_Grotesk']">Royalty, ownership, payouts & takedowns</h2>
        <p className="mt-3 text-sm text-neutral-400 max-w-3xl">The following public terms explain the current distribution arrangement. Release submissions are also subject to the release agreement and platform requirements.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <article className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/40">
          <h3 className="font-bold text-white">Royalty split</h3>
          <p className="mt-2 text-sm text-neutral-400">Free: 80% of applicable royalties to the artist/client and 20% to Mid-Ama Promo. Premium: 100% of applicable royalties to the artist/client and 0% to Mid-Ama Promo. These royalty shares are separate from master ownership.</p>
        </article>
        <article className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/40">
          <h3 className="font-bold text-white">Master ownership</h3>
          <p className="mt-2 text-sm text-neutral-400">Free and Premium: 100% of the master recording is owned by the artist/client. Publishing rights are not included in this master-ownership split. The applicable release agreement should record the agreed ownership terms.</p>
        </article>
        <article className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/40">
          <h3 className="font-bold text-white">Takedowns</h3>
          <p className="mt-2 text-sm text-neutral-400">Takedown requests are permitted. A takedown requested within 30 days of the release date carries a $2.50 processing fee. Requests after 30 days do not carry this Mid-Ama processing fee. Platform removal timing depends on the relevant platforms.</p>
        </article>
        <article className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/40">
          <h3 className="font-bold text-white">Payout policy</h3>
          <p className="mt-2 text-sm text-neutral-400">Minimum payout is R500 ZAR. Approved payouts are made by South African bank/EFT to a verified bank account and are normally processed within 5–10 business days. Payout history is recorded in the client account.</p>
        </article>
      </div>
    </div>
  </section>
);
