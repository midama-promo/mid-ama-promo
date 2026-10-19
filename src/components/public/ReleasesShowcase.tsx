import React, { useEffect } from 'react';
import { ArrowUpRight, Disc3, Headphones, Music2, Radio, Globe2 } from 'lucide-react';

const platforms = [
  'Spotify', 'Apple Music', 'YouTube Music', 'Audiomack', 'Deezer',
  'Amazon Music', 'TIDAL', 'Shazam', 'Boomplay', 'TikTok Music'
];

export const ReleasesShowcase: React.FC = () => {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (!('IntersectionObserver' in window)) {
      nodes.forEach((node) => node.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -35px 0px' });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  const lane = (reverse = false) => (
    <div className={`dsp-track ${reverse ? 'dsp-track-reverse' : ''}`}>
      {[...platforms, ...platforms].map((platform, i) => (
        <span className="dsp-pill" key={`${platform}-${i}`}>
          <span className="dsp-dot" />{platform}
        </span>
      ))}
    </div>
  );

  return (
    <section id="releases" className="release-showcase relative overflow-hidden border-y border-neutral-800/80 py-20 sm:py-28">
      <div className="release-glow release-glow-one" />
      <div className="release-glow release-glow-two" />
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center" data-reveal="up">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-red-500/25 bg-red-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[.18em] text-red-300">
            <Disc3 size={14} /> The Mid-Ama catalogue
          </div>
          <h2 className="font-['Space_Grotesk'] text-3xl font-bold tracking-tight text-white sm:text-5xl">
            Our artists. <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-300">Everywhere.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-neutral-400 sm:text-lg">
            Discover music released through Mid-Ama Promo. One growing catalogue, built for listeners across the world.
          </p>
        </div>

        <div className="dsp-marquee mt-12 space-y-3" aria-label="Digital music platforms">
          {lane(false)}
          {lane(true)}
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-[.85fr_1.15fr] lg:items-center">
          <div data-reveal="left" className="space-y-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-neutral-700 bg-neutral-900 text-red-400">
              <Headphones size={23} />
            </div>
            <h3 className="font-['Space_Grotesk'] text-2xl font-bold text-white sm:text-3xl">Press play. Find your next favourite.</h3>
            <p className="max-w-lg leading-7 text-neutral-400">
              Browse the official Mid-Ama Promo playlist on Spotify. New releases and client music can be discovered in one place.
            </p>
            <a
              href="https://open.spotify.com/playlist/4KYvlqYhvtLviT6pQZcKjj?si=Yu732LP1RLu0gfheVVB5IA"
              target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-red-950/30 transition duration-300 hover:-translate-y-1 hover:bg-red-500"
            >
              Open Spotify playlist <ArrowUpRight size={17} />
            </a>
            <div className="flex flex-wrap gap-5 pt-2 text-xs text-neutral-500">
              <span className="inline-flex items-center gap-2"><Music2 size={14} /> Independent artists</span>
              <span className="inline-flex items-center gap-2"><Globe2 size={14} /> Worldwide discovery</span>
              <span className="inline-flex items-center gap-2"><Radio size={14} /> Streaming platforms</span>
            </div>
          </div>
          <div data-reveal="right" className="spotify-frame-wrap">
            <div className="spotify-frame-top"><span /><span /><span /><p>MID-AMA PROMO / SPOTIFY</p></div>
            <iframe
              title="Mid-Ama Promo releases on Spotify"
              src="https://open.spotify.com/embed/playlist/4KYvlqYhvtLviT6pQZcKjj?utm_source=generator&theme=0"
              width="100%" height="420" style={{ border: 0, borderRadius: 12 }}
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
