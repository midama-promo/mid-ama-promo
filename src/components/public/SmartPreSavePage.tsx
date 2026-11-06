import React, { useEffect, useState } from 'react';
import { ExternalLink, Music2, Loader2, Sparkles } from 'lucide-react';

type DspLink = { label: string; url: string };
type SmartPage = { title: string; artist: string; artworkUrl?: string; dspLinks: DspLink[] };

// Simple Icons CDN marks are used where an official brand glyph is available.
// The coloured letter fallback keeps every DSP identifiable if a logo cannot load.
const DSP_LOGOS: Record<string, string> = {
  'spotify': 'spotify',
  'apple music': 'applemusic',
  'itunes': 'applemusic',
  'youtube music': 'youtubemusic',
  'youtube': 'youtube',
  'deezer': 'deezer',
  'tidal': 'tidal',
  'amazon music': 'amazonmusic',
  'soundcloud': 'soundcloud',
  'tiktok': 'tiktok',
  'pandora': 'pandora',
  'napster': 'napster',
  'qobuz': 'qobuz',
  'anghami': 'anghami',
};
const DSP_TINTS: Record<string, string> = {
  'spotify': 'text-[#1ed760]', 'apple music': 'text-[#fc3c5c]', 'itunes': 'text-[#fc3c5c]',
  'youtube music': 'text-[#ff0033]', 'youtube': 'text-[#ff0033]', 'deezer': 'text-[#c77dff]',
  'tidal': 'text-white', 'amazon music': 'text-[#25d1da]', 'soundcloud': 'text-[#ff7700]',
  'tiktok': 'text-white', 'pandora': 'text-[#00a0ee]', 'napster': 'text-[#f5c400]',
  'qobuz': 'text-[#00b7a8]', 'anghami': 'text-[#ff4e86]',
};

const DspBrand: React.FC<{ label: string }> = ({ label }) => {
  const key = label.toLowerCase();
  const slug = DSP_LOGOS[key];
  const [failed, setFailed] = useState(false);
  const tint = DSP_TINTS[key] || 'text-white';
  return <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.07]">
    {slug && !failed ? <img src={`https://cdn.simpleicons.org/${slug}/FFFFFF`} alt={`${label} logo`} className="h-6 w-6 object-contain" onError={() => setFailed(true)}/> : <span className={`text-lg font-black ${tint}`}>{label.trim().slice(0, 1).toUpperCase()}</span>}
  </span>;
};

export const SmartPreSavePage: React.FC<{ slug: string }> = ({ slug }) => {
  const [page, setPage] = useState<SmartPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    let live = true;
    fetch(`/api/public/presave/${encodeURIComponent(slug)}`, { cache: 'no-store' })
      .then(async r => { if (!r.ok) throw new Error('not-found'); return r.json(); })
      .then(data => { if (live) setPage(data.page); })
      .catch(() => { if (live) setMissing(true); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [slug]);

  return <main className="ma-presave-page relative isolate min-h-screen overflow-hidden bg-[#08090d] px-4 py-7 text-white sm:px-6 sm:py-12">
    {page?.artworkUrl && <div aria-hidden="true" className="fixed inset-0 -z-20 scale-110 bg-cover bg-center opacity-35 blur-3xl" style={{ backgroundImage: `url("${page.artworkUrl.replace(/"/g, '')}")` }}/>}
    <div aria-hidden="true" className="ma-presave-overlay fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_0%,rgba(125,30,52,0.28),transparent_55%),linear-gradient(180deg,rgba(5,7,12,0.76),rgba(5,7,12,0.94))]"/>
    <div className="mx-auto w-full max-w-2xl">
      {loading ? <div className="flex justify-center py-40 text-white/70"><Loader2 className="animate-spin"/></div> : missing || !page ? <div className="mt-16 rounded-[2rem] border border-white/10 bg-black/45 p-10 text-center shadow-2xl backdrop-blur-2xl"><Music2 size={38} className="mx-auto mb-4 text-white/40"/><h1 className="text-2xl font-extrabold tracking-tight">Pre-save page unavailable</h1><p className="mt-2 text-sm text-white/70">This link may have been removed or deactivated.</p></div> : <>
        <section className="ma-presave-panel relative mt-8 overflow-hidden rounded-[2rem] border border-white/15 bg-[#101116]/75 px-5 pb-7 pt-8 shadow-[0_30px_100px_rgba(0,0,0,0.55)] backdrop-blur-2xl sm:mt-12 sm:px-12 sm:pb-10 sm:pt-11">
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-red-500/10 to-transparent"/>
          <div className="relative text-center">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-red-300/20 bg-red-500/10 px-4 py-2 text-[10px] font-extrabold uppercase tracking-[0.24em] text-red-200"><Sparkles size={12}/> Mid-Ama Promo Pre-Save</div>
            <div className="mx-auto h-52 w-52 overflow-hidden rounded-[2.1rem] border border-white/20 bg-white/5 shadow-[0_18px_65px_rgba(0,0,0,0.6)] sm:h-64 sm:w-64 sm:rounded-[2.5rem]">
              {page.artworkUrl ? <img src={page.artworkUrl} alt={`${page.title} cover art`} className="h-full w-full object-cover"/> : <div className="flex h-full w-full items-center justify-center"><Music2 size={60} className="text-white/35"/></div>}
            </div>
            <p className="mt-8 text-[10px] font-bold uppercase tracking-[0.32em] text-red-200/80">A new release</p>
            <h1 className="mt-3 break-words font-[Space_Grotesk,Plus_Jakarta_Sans,sans-serif] text-3xl font-extrabold leading-tight tracking-[-0.045em] text-white drop-shadow-lg sm:text-5xl">{page.title}</h1>
            {page.artist && <p className="mt-3 text-base font-semibold text-white/85 sm:text-lg">{page.artist}</p>}
            <p className="mx-auto mt-7 max-w-md text-sm leading-6 text-white/80">Choose your favourite music platform below and pre-save this release.</p>
          </div>
          <div className="relative mt-7 grid gap-3 sm:mt-8">
            {page.dspLinks.map((dsp, i) => <a key={`${dsp.label}-${i}`} href={dsp.url} target="_blank" rel="noopener noreferrer" className="ma-presave-dsp group flex min-h-[76px] items-center gap-4 rounded-2xl border border-white/12 bg-white/[0.075] px-4 py-3.5 text-left shadow-lg shadow-black/10 transition duration-200 hover:-translate-y-0.5 hover:border-red-300/40 hover:bg-white/[0.13] focus:outline-none focus:ring-2 focus:ring-red-300/70 sm:px-5">
              <DspBrand label={dsp.label}/>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-extrabold text-white sm:text-base">{dsp.label}</span><span className="mt-1 block text-[11px] font-medium text-white/65">Pre-save on {dsp.label}</span></span>
              <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-red-200/20 bg-red-500/15 px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-red-100 transition group-hover:bg-red-500/25">Pre-save <ExternalLink size={12}/></span>
            </a>)}
          </div>
          <div className="relative mt-8 flex items-center justify-center gap-2 text-[10px] font-semibold tracking-[0.16em] text-white/45"><span className="h-px w-7 bg-white/15"/> POWERED BY MID-AMA PROMO™ <span className="h-px w-7 bg-white/15"/></div>
        </section>
      </>}
    </div>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap');
      /* The public pre-save page has its own contrast system and is not affected by app-wide text overrides. */
      html:not([data-theme=\"light\"]) .ma-presave-page { color:#f8fafc !important; color-scheme:dark; }
      html:not([data-theme=\"light\"]) .ma-presave-page [class*=\"text-white\"],
      html:not([data-theme=\"light\"]) .ma-presave-page [class*=\"text-neutral-\"] { color:#f1f5f9 !important; }
      html:not([data-theme=\"light\"]) .ma-presave-page .ma-presave-panel { background:rgba(13,15,22,.88) !important; border-color:rgba(255,255,255,.19) !important; }
      html:not([data-theme=\"light\"]) .ma-presave-page .ma-presave-dsp { background:rgba(255,255,255,.09) !important; border-color:rgba(255,255,255,.17) !important; }
      html:not([data-theme=\"light\"]) .ma-presave-page .ma-presave-overlay { background:linear-gradient(180deg,rgba(3,5,10,.60),rgba(3,5,10,.92)) !important; }
      html[data-theme=\"light\"] .ma-presave-page { color:#171923 !important; color-scheme:light; background:#f4f4f7 !important; }
      html[data-theme=\"light\"] .ma-presave-page [class*=\"text-white\"],
      html[data-theme=\"light\"] .ma-presave-page [class*=\"text-neutral-\"] { color:#20212a !important; }
      html[data-theme=\"light\"] .ma-presave-page .ma-presave-panel { background:rgba(250,250,252,.93) !important; border-color:rgba(20,22,30,.16) !important; box-shadow:0 30px 90px rgba(20,20,30,.16) !important; }
      html[data-theme=\"light\"] .ma-presave-page .ma-presave-dsp { background:rgba(255,255,255,.92) !important; border-color:rgba(20,22,30,.15) !important; box-shadow:0 8px 24px rgba(20,20,30,.07) !important; }
      html[data-theme=\"light\"] .ma-presave-page .ma-presave-overlay { background:linear-gradient(180deg,rgba(248,248,252,.76),rgba(248,248,252,.94)) !important; }
      html[data-theme=\"light\"] .ma-presave-page [class*=\"text-red-\"] { color:#a51f35 !important; }
      html[data-theme=\"light\"] .ma-presave-page .ma-presave-dsp [class*=\"bg-red-\"] { background:rgba(190,35,55,.10) !important; border-color:rgba(165,31,53,.20) !important; }
      html[data-theme=\"light\"] .ma-presave-page a[href=\"/\"] { color:#20212a !important; background:rgba(255,255,255,.82) !important; border-color:rgba(20,22,30,.16) !important; }
    `}</style>
  </main>;
};
