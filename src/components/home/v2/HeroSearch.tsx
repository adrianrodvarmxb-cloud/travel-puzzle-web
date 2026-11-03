'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/language-context';
import { ImageCarousel } from '@/components/ui/ImageCarousel';
import { homeCopy } from '@/home/lib/copy';
import { formatCount } from '@/home/lib/format';
import type { HomeStats } from '@/home/load';

/** Fotos del carrusel (rescatadas del sitio anterior; Singapur y Cancún son propias de Travel Puzzle). */
export const HERO_IMAGES = [
  '/home/hero/singapur.webp',
  '/home/hero/venecia.webp',
  '/home/hero/cancun.webp',
  '/home/hero/santorini.webp',
  '/home/hero/machu-picchu.webp',
  '/home/hero/tokio.webp',
];

export function HeroSearch({ stats }: { stats: HomeStats }) {
  const { language } = useLanguage();
  const c = homeCopy(language);
  const router = useRouter();
  const [q, setQ] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = q.trim();
    router.push(v ? `/tours?search=${encodeURIComponent(v)}` : '/tours');
  };

  return (
    <section className="relative h-[560px] md:h-[680px] overflow-hidden bg-[#0A1330]">
      <ImageCarousel
        images={HERO_IMAGES}
        autoRotateInterval={5000}
        showDots
        showOverlay
        overlayOpacity="bg-[#0A1330]/45"
        className="absolute inset-0"
        altPrefix="Travel Puzzle"
        childrenClassName="container v-center"
      >
        <div className="w-full max-w-3xl px-4 text-center">
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-[#EAF54F]">Travel Puzzle México</p>
          <h1 className="mb-4 text-4xl font-bold text-white drop-shadow-lg md:text-6xl">{c.heroTitle}</h1>
          <p className="mb-8 text-lg text-white/90 drop-shadow md:text-2xl">
            {stats.tours > 0 ? c.heroSub(formatCount(stats.tours, language), formatCount(stats.cities, language)) : c.heroSubEmpty}
          </p>
          <form onSubmit={submit} role="search" className="mx-auto flex max-w-2xl flex-col gap-2 rounded-2xl bg-white/95 p-2 shadow-2xl sm:flex-row">
            <label htmlFor="home-search" className="sr-only">{c.searchPlaceholder}</label>
            <input
              id="home-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={c.searchPlaceholder}
              className="min-w-0 flex-1 rounded-xl px-4 py-3 text-base text-[#0A1330] outline-none placeholder:text-gray-400"
            />
            <button type="submit" className="rounded-xl bg-[#C12909] px-6 py-3 font-semibold text-white transition-opacity hover:opacity-90">
              {c.searchCta} →
            </button>
          </form>
        </div>
      </ImageCarousel>
    </section>
  );
}
