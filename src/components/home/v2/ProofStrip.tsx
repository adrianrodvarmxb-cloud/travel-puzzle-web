'use client';

import { useLanguage } from '@/lib/language-context';
import { homeCopy, type Pillar } from '@/home/lib/copy';
import type { PublicStats } from '@/about/lib/public-stats';
// REQ-3315: la franja ya no pinta cifras (PO, 11 nov 2026); conserva sus props para revertir sin tocar la página.

/** Cifras ya formateadas en el servidor con idioma fijo (REQ-173, INC-001). */
export interface ProofCounts { tours: string; cities: string; countries: string }

/** REQ-3381: íconos de trazo, en el color de acento de la marca. */
function PillarIcon({ name }: { name: Pillar['icon'] }) {
  const common = { width: 26, height: 26, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  if (name === 'aliados') {
    // Red: nodos conectados alrededor del globo.
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="3.2" />
        <circle cx="4.5" cy="6" r="1.8" /><circle cx="19.5" cy="6" r="1.8" /><circle cx="4.5" cy="18" r="1.8" /><circle cx="19.5" cy="18" r="1.8" />
        <path d="M6 7.2 9.6 10M18 7.2 14.4 10M6 16.8 9.6 14M18 16.8 14.4 14" />
      </svg>
    );
  }
  if (name === 'mila') {
    // Destellos: inteligencia artificial.
    return (
      <svg {...common}>
        <path d="M10 3.5 11.6 8.4 16.5 10 11.6 11.6 10 16.5 8.4 11.6 3.5 10 8.4 8.4Z" />
        <path d="M18 14.5 18.8 16.7 21 17.5 18.8 18.3 18 20.5 17.2 18.3 15 17.5 17.2 16.7Z" />
      </svg>
    );
  }
  // Escudo con palomita: agencia registrada en México.
  return (
    <svg {...common}>
      <path d="M12 3 19 6v5.5c0 4.4-3 7.9-7 9.5-4-1.6-7-5.1-7-9.5V6Z" />
      <path d="m8.8 12.2 2.2 2.2 4.4-4.6" />
    </svg>
  );
}

/** Franja de las tres piezas de Travel Puzzle: aliados, Mila y respaldo en México. */
// REQ-3315, REQ-3316, REQ-3381
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ProofStrip(_props: { stats: PublicStats; counts: ProofCounts }) {
  const { language } = useLanguage();
  const c = homeCopy(language);

  return (
    <section aria-label={c.pillars[0].title} className="border-y border-white/10 bg-[linear-gradient(90deg,rgba(0,141,255,0.08),transparent_45%,rgba(234,245,79,0.05))]">
      <div className="mx-auto grid max-w-[1280px] grid-cols-1 divide-y divide-white/10 md:grid-cols-3 md:divide-x md:divide-y-0">
        {c.pillars.map((p) => (
          <div key={p.icon} className="group flex items-center gap-4 px-4 py-5 md:px-8 md:py-7">
            <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-[#008DFF]/50 bg-[#0E1A40] text-[#EAF54F] shadow-[0_0_24px_rgba(0,141,255,0.25)] transition-shadow group-hover:shadow-[0_0_32px_rgba(0,141,255,0.45)]">
              <PillarIcon name={p.icon} />
            </span>
            <div className="min-w-0">
              <p className="font-display text-base font-semibold leading-tight text-white md:text-lg">{p.title}</p>
              <p className="font-data mt-1 text-[10px] uppercase tracking-[0.2em] text-[#7CC4FF] md:text-[11px]">{p.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
