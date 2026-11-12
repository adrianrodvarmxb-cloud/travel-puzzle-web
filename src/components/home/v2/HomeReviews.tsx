'use client';

import Link from '@/components/i18n/LocalizedLink';
import { useLanguage } from '@/lib/language-context';
import { homeCopy } from '@/home/lib/copy';
import { nameIn } from '@/home/lib/destinations';
import type { HomeReview } from '@/home/load';
import { MobileRail } from './MobileRail';

const LOCALES: Record<string, string> = { en: 'en-US', es: 'es-MX', pt: 'pt-BR', de: 'de-DE', fr: 'fr-FR', it: 'it-IT' };

/** Reseñas reales de 5 ★ de tours distintos; cada una lleva a su tour. */
const SHOW_SOURCE_LINE = false;

export function HomeReviews({ reviews, average }: { reviews: HomeReview[]; average: number | null }) {
  const { t, language } = useLanguage();
  const c = homeCopy(language);
  if (!reviews.length) return null;
  // REQ-3315: sin el promedio global; se quedan las reseñas de cada experiencia.
  void average;

  return (
    <section id="opiniones" className="mx-auto max-w-[1280px] scroll-mt-24 px-4 pt-24 md:px-8 md:pt-28">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <p className="font-data mb-2.5 text-xs uppercase tracking-[0.3em] text-[#008DFF]">{c.reviewsEyebrow}</p>
          <h2 className="font-display mb-4 text-4xl font-bold leading-[1.05] text-white md:text-5xl">{c.reviewsHeadline}</h2>
          <p className="mb-6 leading-relaxed text-[#A9B6D6]">{c.reviewsSub}</p>
          {/* REQ-3322: aviso de origen y selección, fuera del carrusel para que se vea siempre (también en celular) */}
          <p className="text-xs leading-relaxed text-[#A9B6D6]">{c.reviewsDisclosure}</p>
        </div>
        <MobileRail gridClass="sm:grid-cols-2 lg:col-span-8">
          {reviews.map((r) => {
            const date = new Date(r.addedAt).toLocaleDateString(LOCALES[language] ?? 'en-US', { year: 'numeric', month: 'long' });
            const body = (
              <>
                <span className="tracking-[2px] text-[#F5B301]" aria-label={`${r.rate} / 5`}>★★★★★</span>
                {r.title && <p className="font-semibold text-white">{r.title}</p>}
                <p className="line-clamp-5 leading-relaxed text-[#DCE4F5]">{r.content}</p>
                <div className="mt-auto flex flex-wrap justify-between gap-2 border-t border-white/10 pt-3 text-[13px]">
                  <span className="text-[#A9B6D6]">{r.reviewerName} · {date}</span>
                  {r.tour && <span className="font-semibold text-[#7CC4FF]">{nameIn(r.tour.titles, language)} · {nameIn(r.tour.cityNames, language)} →</span>}
                </div>
              </>
            );
            return r.tour ? (
              <Link key={r.id} href={`/tours/${r.tour.id}`} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#121D45] p-5 transition-colors hover:border-[#008DFF]">{body}</Link>
            ) : (
              <div key={r.id} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#121D45] p-5">{body}</div>
            );
          })}
          {/* La fuente ya la dice el subtítulo (punto 4, 3 nov 2026) */}
          {SHOW_SOURCE_LINE && <p className="text-xs text-[#7C8DBA] sm:col-span-2">{t('reviews.source')}</p>}
        </MobileRail>
      </div>
    </section>
  );
}
