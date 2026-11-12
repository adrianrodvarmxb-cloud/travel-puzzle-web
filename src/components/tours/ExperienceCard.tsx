/* eslint-disable @next/next/no-img-element */
import Link from '@/components/i18n/LocalizedLink';
import type { ExperienceCardModel } from '@/tours/lib/experience-card';
import { imgLoading, transformedSrc, transformedSrcSet } from '@/perf/lib/image';

/**
 * REQ-583: es un <a href> real con título, ciudad · duración, precio y operador en texto (se lee sin JS).
 * REQ-520…527: la única tarjeta de experiencia del sitio (/tours, inicio, /destinos, La Primera Pieza, viajes de agencias).
 * Presentacional: recibe el modelo ya resuelto (src/tours/lib/experience-card.ts) y solo pinta. Sin hooks ni Intl,
 * así sirve igual en componentes de servidor y de cliente (INC-001).
 * Look and feel (REQ-527): esquinas de 20 px y foto con zoom suave como los mosaicos de ciudades del inicio,
 * insignias en píldora (Airbnb, GetYourGuide), calificación con estrella y conteo (Civitatis, Klook), sombra suave.
 */
/**
 * REQ-855 (PO, 6-11 22:05): `look="showcase"` es la versión de los carruseles del inicio, de la misma familia que
 * «¿A dónde vamos?»: foto más alta (4:5) con degradado inferior sutil, ciudad en mayúsculas espaciadas y color de
 * acento, título más grande y sombra más marcada. `featured` = tarjeta destacada (más ancha; foto 8:5 desde md).
 * La estructura firmada no cambia (REQ-520…526).
 */
export type CardLook = 'standard' | 'showcase';
const LOOK: Record<CardLook, { photo: string; meta: string; title: string; shell: string }> = {
    standard: {
        photo: 'aspect-[4/3]',
        meta: 'text-[11px] tracking-[0.16em] text-[#A9B6D6]',
        title: 'text-lg font-semibold leading-snug',
        shell: 'shadow-[0_12px_32px_-16px_rgba(0,0,0,0.75)]',
    },
    showcase: {
        photo: 'aspect-[4/5]',
        meta: 'text-[11px] tracking-[0.22em] text-[#EAF54F]',
        title: 'text-xl font-bold leading-[1.15] md:text-[22px]',
        shell: 'shadow-[0_22px_48px_-20px_rgba(0,0,0,0.9)]',
    },
};

// REQ-860
// REQ-1564: `priority` = tarjeta arriba del pliegue (eager + prioridad alta); el resto es lazy.
export function ExperienceCard({ card, look = 'standard', featured = false, priority = false }: { card: ExperienceCardModel; look?: CardLook; featured?: boolean; priority?: boolean }) {
    const l = LOOK[look];
    return (
        <Link
            href={card.href}
            data-testid="experience-card"
            data-look={look}
            className={`group flex h-full flex-col overflow-hidden rounded-[20px] bg-[#121D45] text-white ${l.shell} ring-1 ring-white/[0.06] transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-14px_rgba(0,141,255,0.35)] hover:ring-[#008DFF]/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7CC4FF]`}
        >
            <div className={`relative overflow-hidden bg-[#1B2A5E] ${featured ? 'aspect-[4/5] md:aspect-[8/5]' : l.photo}`}>
                {card.image ? (
                    <img src={transformedSrc(card.image, 640)} srcSet={transformedSrcSet(card.image, [320, 480, 640])} sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 320px" alt={card.title} width={640} height={480} {...imgLoading(priority)} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                    <span className="flex h-full items-center justify-center text-4xl opacity-50" aria-hidden>🌍</span>
                )}
                {/* REQ-526 + REQ-860: sobre la foto solo la categoría; el degradado no lleva texto ni logo. */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-[linear-gradient(180deg,rgba(10,19,48,0.55),transparent)]" aria-hidden />
                {look === 'showcase' && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-[linear-gradient(180deg,transparent,rgba(18,29,69,0.85))]" aria-hidden />}
                <span data-testid="card-category" className="absolute right-3 top-3 max-w-[60%] truncate rounded-full bg-[#0A1330]/75 px-2.5 py-1 text-[11px] font-semibold leading-none text-white backdrop-blur-sm">
                    {card.category}
                </span>
            </div>
            <div className="flex flex-1 flex-col gap-1.5 px-4 pb-4 pt-3.5">
                {/* REQ-860 (PO, 6-11 22:36, C5 de FREETOUR): «★ Favorito» fuera de la foto, en la fila de ciudad · duración. */}
                {(card.meta || card.favorite) && (
                    <div className="flex min-h-[18px] items-center justify-between gap-2">
                        <p data-testid="card-meta" className={`font-data min-w-0 truncate uppercase ${l.meta}`}>{card.meta ?? ''}</p>
                        {card.favorite && (
                            <span data-testid="card-favorite" className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#EAF54F]/[0.14] px-2 py-0.5 text-[11px] font-bold leading-none text-[#EAF54F] ring-1 ring-inset ring-[#EAF54F]/40">
                                <span aria-hidden>★</span> {card.favorite}
                            </span>
                        )}
                    </div>
                )}
                <h3 className={`font-display line-clamp-2 ${l.title}`}>{card.title}</h3>
                {card.description && <p data-testid="card-description" className="line-clamp-2 text-sm leading-relaxed text-[#A9B6D6]">{card.description}</p>}
                <div className="mt-auto pt-2">
                    {card.price && (
                        <p data-testid="card-price" className={`text-sm font-semibold ${card.price.free ? 'text-free' : 'text-white'}`}>{card.price.text}</p>
                    )}
                    <div className="mt-2 flex items-center justify-between gap-3 border-t border-white/10 pt-2.5 text-sm">
                        <span data-testid="card-rating" className="shrink-0 whitespace-nowrap">
                            {card.rating && <><span className="text-[#F5B301]" aria-hidden>★</span> <b>{card.rating.value}</b> <span className="text-[#A9B6D6]">· {card.rating.count}</span></>}
                        </span>
                        <span data-testid="card-provider" className="min-w-0 truncate text-right text-xs text-[#A9B6D6]">{card.provider ?? ''}</span>
                    </div>
                </div>
            </div>
        </Link>
    );
}
