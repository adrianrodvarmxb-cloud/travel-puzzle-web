'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/language-context';
import { homeCopy } from '@/home/lib/copy';
import { formatCount } from '@/home/lib/format';
import { nameIn } from '@/home/lib/destinations';
import type { HeroSlide } from '@/home/lib/hero';
import type { HomeStats } from '@/home/load';

/** Respaldo si ninguna ciudad del carrusel tiene tours: una foto sin enlace. */
const FALLBACK: HeroSlide = { image: '/home/hero/venecia.webp', href: '/tours', tours: 0, names: {} };

export function HeroSearch({ stats, slides }: { stats: HomeStats; slides: HeroSlide[] }) {
  const { language } = useLanguage();
  const c = homeCopy(language);
  const router = useRouter();
  const [q, setQ] = useState('');
  const [i, setI] = useState(0);
  const list = slides.length ? slides : [FALLBACK];
  const current = list[i % list.length];

  useEffect(() => {
    if (list.length < 2) return;
    const id = setInterval(() => setI((n) => (n + 1) % list.length), 5000);
    return () => clearInterval(id);
  }, [list.length]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = q.trim();
    router.push(v ? `/tours?search=${encodeURIComponent(v)}` : '/tours');
  };

  return (
    <section className="relative h-[560px] overflow-hidden bg-[#0A1330] md:h-[680px]">
      {list.map((s, n) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={s.image}
          src={s.image}
          alt={nameIn(s.names, language) || 'Travel Puzzle'}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${n === i % list.length ? 'opacity-100' : 'opacity-0'}`}
          fetchPriority={n === 0 ? 'high' : 'low'}
        />
      ))}
      <div className="absolute inset-0 bg-[#0A1330]/45" />

      <div className="relative z-10 flex h-full items-center justify-center px-4">
        <div className="w-full max-w-3xl text-center">
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
      </div>

      {/* Ciudad de la foto actual → sus tours reales */}
      {current.tours > 0 && (
        <Link
          href={current.href}
          className="absolute bottom-14 left-1/2 z-10 -translate-x-1/2 rounded-full border border-white/30 bg-[#0A1330]/60 px-4 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-[#0A1330]/80"
        >
          📍 {nameIn(current.names, language)} · {c.tours(formatCount(current.tours, language))} →
        </Link>
      )}
      {list.length > 1 && (
        <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-2">
          {list.map((s, n) => (
            <button
              key={s.image}
              type="button"
              aria-label={nameIn(s.names, language)}
              onClick={() => setI(n)}
              className={`h-2 rounded-full transition-all ${n === i % list.length ? 'w-8 bg-white' : 'w-2 bg-white/50'}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
