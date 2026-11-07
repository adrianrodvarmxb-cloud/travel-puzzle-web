'use client';

import { useEffect, useState } from 'react';
import Link from '@/components/i18n/LocalizedLink';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/language-context';
import { useLocalizedHref } from '@/components/i18n/useLocalizedHref';
import { homeCopy } from '@/home/lib/copy';
import { nameIn, type DestinationCard } from '@/home/lib/destinations';
import type { HeroSlide } from '@/home/lib/hero';

/** Respaldo si ninguna ciudad del carrusel tiene tours: una foto sin enlace. */
const FALLBACK: HeroSlide = { image: '/home/hero/venecia.webp', focus: '66% 50%', href: '/tours', tours: 0, names: {} };

/** Hero: titular fijo, buscador, accesos a ciudades y la ciudad de la foto con sus tours reales. */
/** Línea amarilla sobre el titular: el logo ya trae el lema (decisión del PO, 3 nov 2026). */
const SHOW_HERO_EYEBROW = false;

export function HeroSearch({ slides, quickCities }: { slides: HeroSlide[]; quickCities: DestinationCard[] }) {
  const { language } = useLanguage();
  const localize = useLocalizedHref();
  const c = homeCopy(language);
  const router = useRouter();
  const [q, setQ] = useState('');
  const [i, setI] = useState(0);
  const list = slides.length ? slides : [FALLBACK];
  const n = i % list.length;
  const current = list[n];
  const city = nameIn(current.names, language);

  useEffect(() => {
    if (list.length < 2) return;
    const id = setInterval(() => setI((x) => (x + 1) % list.length), 6000);
    return () => clearInterval(id);
  }, [list.length]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = q.trim();
    router.push(localize(v ? `/tours?search=${encodeURIComponent(v)}` : '/tours')); // REQ-655
  };

  return (
    <section className="relative flex min-h-[640px] items-end overflow-hidden md:min-h-[720px]">
      {list.map((s, k) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={s.image}
          src={s.image}
          alt={nameIn(s.names, language) || 'Travel Puzzle'}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${k === n ? 'opacity-100' : 'opacity-0'}`}
          style={{ objectPosition: s.focus }}
          fetchPriority={k === 0 ? 'high' : 'low'}
        />
      ))}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,19,48,0.25)_0%,rgba(10,19,48,0.6)_55%,#0A1330_100%)]" />

      <div className="relative mx-auto grid w-full max-w-[1280px] grid-cols-1 items-end gap-8 px-4 pb-14 pt-32 md:px-8 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-8">
          {SHOW_HERO_EYEBROW && <p className="font-data mb-4 text-[11px] uppercase tracking-[0.3em] text-[#EAF54F] md:text-xs">{c.heroEyebrow}</p>}
          <h1 className="font-display mb-7 text-[42px] font-bold leading-[1.02] text-white md:text-7xl">{c.heroHeadline}</h1>
          <form onSubmit={submit} role="search" className="flex max-w-2xl flex-col gap-2 rounded-2xl border border-white/20 bg-white/10 p-2 backdrop-blur-xl sm:flex-row">
            <label htmlFor="home-search" className="sr-only">{c.searchPlaceholder}</label>
            <div className="relative flex min-w-0 flex-1 items-center gap-3 rounded-xl bg-white px-4">
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#304A9F" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              <input id="home-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={c.searchPlaceholder} className="peer min-w-0 flex-1 bg-transparent py-4 text-base text-[#0A1330] outline-none placeholder:text-transparent sm:placeholder:text-gray-500" />
              {/* REQ-173: en celular, frase corta para que no se corte; solo CSS, mismo HTML en servidor y navegador (INC-001). */}
              <span aria-hidden="true" data-testid="home-search-short" className="pointer-events-none absolute left-[48px] hidden text-base text-gray-500 peer-placeholder-shown:block sm:peer-placeholder-shown:hidden">{c.searchPlaceholderShort}</span>
            </div>
            <button type="submit" className="rounded-xl bg-[#C12909] px-7 py-4 font-semibold text-white transition-opacity hover:opacity-90">{c.searchCta} →</button>
          </form>
          {quickCities.length > 0 && (
            <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
              {quickCities.map((d) => (
                <Link key={d.cityId} href={`/tours?countryId=${d.countryId}&cityId=${d.cityId}`} className="shrink-0 whitespace-nowrap rounded-full border border-white/25 px-3.5 py-2 text-sm text-[#DCE4F5] transition-colors hover:border-[#008DFF] hover:text-white">
                  {nameIn(d.names, language)}
                </Link>
              ))}
            </div>
          )}
        </div>

        {current.tours > 0 && (
          <div className="flex flex-col gap-3 lg:col-span-4">
            <div className="rounded-2xl border border-white/20 bg-[#0A1330]/55 px-5 py-4 backdrop-blur-xl">
              <p className="font-data text-[11px] uppercase tracking-[0.2em] text-[#A9B6D6]">{c.onScreen(n + 1, list.length)}</p>
              <p className="font-display mt-2 text-2xl font-semibold text-white">{city}</p>
              <p className="mb-3 text-sm text-[#A9B6D6]">{c.tours(current.toursText ?? String(current.tours))}</p>
              <Link href={current.href} className="text-sm font-semibold text-[#EAF54F] hover:text-white">{c.seeToursIn(city)}</Link>
            </div>
            {list.length > 1 && (
              <div className="flex gap-1.5">
                {list.map((s, k) => (
                  <button key={s.image} type="button" onClick={() => setI(k)} aria-label={nameIn(s.names, language)} className="flex h-6 flex-1 items-center" style={{ flexGrow: k === n ? 2 : 1 }}>
                    <span className={`block h-[3px] w-full rounded ${k === n ? 'bg-white' : 'bg-white/30'}`} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
