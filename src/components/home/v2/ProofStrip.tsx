'use client';

import { useLanguage } from '@/lib/language-context';
import { homeCopy } from '@/home/lib/copy';
import type { PublicStats } from '@/about/lib/public-stats';
// REQ-3315: la franja ya no pinta cifras (PO, 11 nov 2026); conserva sus props para revertir sin tocar la página.

/** Cifras ya formateadas en el servidor con idioma fijo (REQ-173, INC-001). */
export interface ProofCounts { tours: string; cities: string; countries: string }

/** Franja de las tres piezas de Travel Puzzle: aliados, Mila y respaldo en México. */
// REQ-3315, REQ-3316
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ProofStrip(_props: { stats: PublicStats; counts: ProofCounts }) {
  const { language } = useLanguage();
  const c = homeCopy(language);

  return (
    <section aria-label={c.pillars[0][0]} className="border-y border-white/10">
      <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-px bg-white/10 md:grid-cols-3">
        {c.pillars.map(([title, body]) => (
          <div key={title} className="bg-[#0A1330] px-4 py-6 md:px-8 md:py-7">
            <p className="font-display text-lg font-semibold text-white md:text-xl">{title}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-[#A9B6D6]">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
