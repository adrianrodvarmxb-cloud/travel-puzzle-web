'use client';
import { imgLoading, transformedSrc, transformedSrcSet } from '@/perf/lib/image';

import { useEffect, useState } from 'react';
import { heroFacts, heroFactsLayout } from '@/tours/lib/hero-facts';
import type { PracticalFact } from '@/tours/lib/practical-info';
import { useLanguage } from '@/lib/language-context';
import { Tour } from '@/types';
import { ReviewSummary } from './ReviewSummary';
import { TravelerFavoriteBadge } from '@/components/tours/TravelerFavoriteBadge';
import type { TourEvent } from '@/lib/api/freetour-client';
import { PrimeraPiezaInfo, type PrimeraPiezaView } from './PrimeraPiezaInfo';
import { FichaEnBreve } from '@/components/seo/FichaEnBreve';

interface TourHeroSectionProps {
    tour: Tour;
    /** Ficha bajo /destinos (PRIMERA_PIEZA_ENABLED): insignia, «Operado por…» y aviso por evento. Sin esto, igual que hoy. */
    primeraPieza?: PrimeraPiezaView | null;
    events?: TourEvent[];
    /** REQ-10538 / REQ-10539: horario de salida, punto de término, edades e idiomas del guía (del servidor). */
    practicalFacts?: readonly PracticalFact[];
}

/** Galería en mosaico + título, etiquetas, resumen de reseñas y datos clave del tour. */
export function TourHeroSection({ tour, primeraPieza = null, events = [], practicalFacts = [] }: TourHeroSectionProps) {
    const { t, language } = useLanguage();
    const images = tour.images.filter((img) => img && img.trim() !== '');
    const [showAll, setShowAll] = useState(false);
    const [main, ...rest] = images;
    const side = rest.slice(0, 4);
    // REQ-578 / REQ-588: la tira de datos sale de una función pura; en FREETOUR el idioma del guía se pinta al montar.
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const shown = heroFacts({
        labels: { duration: t('tours.duration'), destination: t('tours.destination'), meetingPoint: t('tours.meetingPoint'), provider: t('tours.provider') },
        tour: { duration: tour.duration, destination: tour.destination, meetingPoint: tour.meetingPoint?.title, provider: tour.provider },
        view: primeraPieza, mounted, lang: language, practical: practicalFacts,
    });
    // REQ-10541: sin columnas fijas; cada casilla llena su fila (nunca queda una casilla gris vacía).
    const layout = heroFactsLayout();

    return (
        <section className="mb-10" {...(primeraPieza ? { 'data-enriquecimiento': String(primeraPieza.enrichment ?? false) } : {})}>
            {main ? (
                <div className="grid grid-cols-1 gap-2.5 overflow-hidden rounded-3xl md:grid-cols-4 md:grid-rows-[220px_220px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={transformedSrc(main, 1200)} srcSet={transformedSrcSet(main, [640, 960, 1200])} sizes="(max-width: 768px) 100vw, 50vw" alt={tour.title} {...imgLoading(true)} className="h-72 w-full object-cover md:col-span-2 md:row-span-2 md:h-full" />
                    {side.map((src, k) => (
                        <div key={src} className="relative hidden md:block">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={transformedSrc(src, 640)} alt="" {...imgLoading(false)} className="h-full w-full object-cover" />
                            {k === side.length - 1 && images.length > 5 && (
                                <button type="button" onClick={() => setShowAll(true)} className="absolute inset-0 flex items-center justify-center bg-[#0A1330]/55 text-sm font-semibold text-white hover:bg-[#0A1330]/40">
                                    +{images.length - 5}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex h-72 items-center justify-center rounded-3xl bg-[#121D45] text-6xl" aria-hidden>🌍</div>
            )}

            {showAll && (
                <div className="mt-2.5 grid grid-cols-2 gap-2.5 md:grid-cols-4">
                    {images.slice(5).map((src) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={src} src={transformedSrc(src, 640)} alt="" {...imgLoading(false)} className="h-40 w-full rounded-xl object-cover" />
                    ))}
                </div>
            )}

            <div className="mt-8 flex flex-wrap gap-2">
                {!primeraPieza && <TravelerFavoriteBadge rating={tour.rating} reviews={tour.reviewsNumber} />}
                {tour.price === 0 && (
                    <span className="font-data rounded-md border border-free px-2 py-0.5 text-[11px] uppercase tracking-[0.15em] text-free">{t('tours.freeBadge', 'Free tour')}</span>
                )}
            </div>
            <h1 className="font-display mb-4 mt-3 text-4xl font-bold leading-[1.05] text-white md:text-5xl">{tour.title}</h1>
            <ReviewSummary rating={tour.rating} reviews={tour.reviewsNumber} dark withBadge={false} />
            {/* REQ-577 / REQ-581: «En breve» bajo el H1 solo si el proveedor permite enriquecimiento (nunca FREETOUR). */}
            {primeraPieza?.enrichment && <FichaEnBreve text={primeraPieza.enBreve ?? null} tipo={primeraPieza.facets?.tipo} etiquetas={primeraPieza.facets?.etiquetas} />}
            {primeraPieza && <PrimeraPiezaInfo view={primeraPieza} events={events} />}
            {tour.brief && <p className="mt-5 max-w-3xl text-lg leading-relaxed text-[#C9D6F5]">{tour.brief}</p>}

            <dl className={layout.list}>
                {shown.map((f) => (
                    // REQ-588: data-nosnippet en FREETOUR (punto de encuentro e idioma del guía): se ven, pero no van a fragmentos.
                    <div key={f.key} data-hecho={f.key} {...(f.nosnippet ? { 'data-nosnippet': '' } : {})} className={layout.item}>
                        <dt className="font-data text-[10px] uppercase tracking-[0.2em] text-[#A9B6D6]">{f.label}</dt>
                        <dd className="font-display mt-1.5 line-clamp-2 text-lg font-semibold text-white">{f.value}</dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}
