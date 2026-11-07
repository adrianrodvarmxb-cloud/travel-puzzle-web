/* eslint-disable @next/next/no-img-element */
import Link from '@/components/i18n/LocalizedLink';
import type { ExperienceCardModel } from '@/tours/lib/experience-card';

/**
 * REQ-583: es un <a href> real con título, ciudad · duración, precio y operador en texto (se lee sin JS).
 * REQ-520…527: la única tarjeta de experiencia del sitio (/tours, inicio, /destinos, La Primera Pieza, viajes de agencias).
 * Presentacional: recibe el modelo ya resuelto (src/tours/lib/experience-card.ts) y solo pinta. Sin hooks ni Intl,
 * así sirve igual en componentes de servidor y de cliente (INC-001).
 * Look and feel (REQ-527): esquinas de 20 px y foto con zoom suave como los mosaicos de ciudades del inicio,
 * insignias en píldora (Airbnb, GetYourGuide), calificación con estrella y conteo (Civitatis, Klook), sombra suave.
 */
export function ExperienceCard({ card }: { card: ExperienceCardModel }) {
    return (
        <Link
            href={card.href}
            data-testid="experience-card"
            className="group flex h-full flex-col overflow-hidden rounded-[20px] bg-[#121D45] text-white shadow-[0_12px_32px_-16px_rgba(0,0,0,0.75)] ring-1 ring-white/[0.06] transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-14px_rgba(0,141,255,0.35)] hover:ring-[#008DFF]/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7CC4FF]"
        >
            <div className="relative aspect-[4/3] overflow-hidden bg-[#1B2A5E]">
                {card.image ? (
                    <img src={card.image} alt={card.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                    <span className="flex h-full items-center justify-center text-4xl opacity-50" aria-hidden>🌍</span>
                )}
                {/* REQ-526: solo dos insignias sobre la foto; el degradado no lleva texto ni logo. */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-[linear-gradient(180deg,rgba(10,19,48,0.55),transparent)]" aria-hidden />
                {card.favorite && (
                    <span data-testid="card-favorite" className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#EAF54F] px-2.5 py-1 text-[11px] font-bold leading-none text-[#0A1330] shadow-sm">
                        <span aria-hidden>★</span> {card.favorite}
                    </span>
                )}
                <span data-testid="card-category" className="absolute right-3 top-3 max-w-[60%] truncate rounded-full bg-[#0A1330]/75 px-2.5 py-1 text-[11px] font-semibold leading-none text-white backdrop-blur-sm">
                    {card.category}
                </span>
            </div>
            <div className="flex flex-1 flex-col gap-1.5 px-4 pb-4 pt-3.5">
                {card.meta && <p data-testid="card-meta" className="font-data line-clamp-1 text-[11px] uppercase tracking-[0.16em] text-[#A9B6D6]">{card.meta}</p>}
                <h3 className="font-display line-clamp-2 text-lg font-semibold leading-snug">{card.title}</h3>
                {card.description && <p data-testid="card-description" className="line-clamp-2 text-sm leading-relaxed text-[#A9B6D6]">{card.description}</p>}
                <div className="mt-auto pt-2">
                    {card.price && (
                        <p data-testid="card-price" className={`text-sm font-semibold ${card.price.free ? 'text-[#EAF54F]' : 'text-white'}`}>{card.price.text}</p>
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
