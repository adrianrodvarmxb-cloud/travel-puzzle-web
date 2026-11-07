'use client';

import { useState } from 'react';
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
}

/** Galería en mosaico + título, etiquetas, resumen de reseñas y datos clave del tour. */
export function TourHeroSection({ tour, primeraPieza = null, events = [] }: TourHeroSectionProps) {
    const { t } = useLanguage();
    const images = tour.images.filter((img) => img && img.trim() !== '');
    const [showAll, setShowAll] = useState(false);
    const [main, ...rest] = images;
    const side = rest.slice(0, 4);
    // REQ-578: con la ficha de /destinos, la duración legible y el idioma del guía vienen calculados del servidor.
    const facts: [string, string | null | undefined][] = [
        [t('tours.duration'), primeraPieza?.facts?.duration ?? tour.duration],
        [t('tours.destination'), tour.destination],
        [t('tours.meetingPoint'), tour.meetingPoint?.title],
        [t('tours.provider'), tour.provider],
        ...(primeraPieza?.facts?.extra ?? []).map((f): [string, string] => [f.label, f.value]),
    ];
    const shown = facts.filter(([, v]) => v);

    return (
        <section className="mb-10" {...(primeraPieza ? { 'data-enriquecimiento': String(primeraPieza.enrichment ?? false) } : {})}>
            {main ? (
                <div className="grid grid-cols-1 gap-2.5 overflow-hidden rounded-3xl md:grid-cols-4 md:grid-rows-[220px_220px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={main} alt={tour.title} className="h-72 w-full object-cover md:col-span-2 md:row-span-2 md:h-full" />
                    {side.map((src, k) => (
                        <div key={src} className="relative hidden md:block">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
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
                        <img key={src} src={src} alt="" loading="lazy" className="h-40 w-full rounded-xl object-cover" />
                    ))}
                </div>
            )}

            <div className="mt-8 flex flex-wrap gap-2">
                {!primeraPieza && <TravelerFavoriteBadge rating={tour.rating} reviews={tour.reviewsNumber} />}
                {tour.price === 0 && (
                    <span className="font-data rounded-md border border-[#7CC4FF] px-2 py-0.5 text-[11px] uppercase tracking-[0.15em] text-[#7CC4FF]">{t('tours.freeBadge', 'Free tour')}</span>
                )}
            </div>
            <h1 className="font-display mb-4 mt-3 text-4xl font-bold leading-[1.05] text-white md:text-5xl">{tour.title}</h1>
            <ReviewSummary rating={tour.rating} reviews={tour.reviewsNumber} dark withBadge={false} />
            {/* REQ-577 / REQ-581: «En breve» bajo el H1 solo si el proveedor permite enriquecimiento (nunca FREETOUR). */}
            {primeraPieza?.enrichment && <FichaEnBreve text={primeraPieza.enBreve ?? null} tipo={primeraPieza.facets?.tipo} etiquetas={primeraPieza.facets?.etiquetas} />}
            {primeraPieza && <PrimeraPiezaInfo view={primeraPieza} events={events} />}
            {tour.brief && <p className="mt-5 max-w-3xl text-lg leading-relaxed text-[#C9D6F5]">{tour.brief}</p>}

            <dl className={`mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 ${shown.length > 4 ? 'md:grid-cols-3 lg:grid-cols-5' : 'md:grid-cols-4'}`}>
                {shown.map(([label, value]) => (
                    <div key={label} className="bg-[#0A1330] p-4 md:p-5">
                        <dt className="font-data text-[10px] uppercase tracking-[0.2em] text-[#A9B6D6]">{label}</dt>
                        <dd className="font-display mt-1.5 line-clamp-2 text-lg font-semibold text-white">{value}</dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}
