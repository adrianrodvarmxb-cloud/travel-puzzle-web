'use client';

import Link from 'next/link';
import { CardRail } from '@/components/tours/CardRail';
import { ExperienceCard } from '@/components/tours/ExperienceCard';
import type { ExperienceCardModel } from '@/tours/lib/experience-card';
import { SEE_ALL_HREF, type HomeCarouselId } from '@/home/lib/carousel-pages';
import { SectionHeading } from './SectionHeading';
import { useCarouselPages } from './useCarouselPages';

/**
 * REQ-855: variante elegida para los carruseles del inicio (ver la descripción del PR):
 * A = primera tarjeta destacada (doble de ancho en escritorio) + resto en formato vertical 4:5.
 * B = todas iguales en 4:5 (se describe en el PR; se activa cambiando esta constante).
 */
export const HOME_RAIL_VARIANT: 'A' | 'B' = 'A';

/** REQ-854: tarjeta final «Ver todas las experiencias →». */
function SeeAllCard({ href, label }: { href: string; label: string }) {
    return (
        <Link href={href} data-testid="see-all-card"
            className="group flex min-h-[280px] self-stretch flex-col items-start justify-end rounded-[20px] bg-[linear-gradient(160deg,#1B2A5E,#0A1330)] p-6 text-white ring-1 ring-white/10 transition-colors hover:ring-[#EAF54F]/60">
            <span className="font-data text-[11px] uppercase tracking-[0.22em] text-[#EAF54F]">Travel Puzzle</span>
            <span className="font-display mt-2 text-2xl font-bold leading-tight">{label} <span aria-hidden className="inline-block transition-transform group-hover:translate-x-1">→</span></span>
        </Link>
    );
}

/** REQ-850…615: carrusel completo del inicio (va dentro de la <section> de cada carrusel): primera página del servidor + páginas siguientes + «Ver todas». */
export function HomeCarousel(props: {
    id: HomeCarouselId; eyebrow: string; title: string; subtitle?: string; action?: React.ReactNode;
    cards: ExperienceCardModel[]; hasMore: boolean; lang: string; seeAllLabel: string;
}) {
    const more = useCarouselPages(props.id, props.lang, props.hasMore);
    const all = [...props.cards, ...more.cards.filter((x) => !props.cards.some((c) => c.key === x.key))];
    return (
        <>
            <SectionHeading eyebrow={props.eyebrow} title={props.title} subtitle={props.subtitle} action={props.action} />
            <CardRail label={props.title} look="showcase" featureFirst={HOME_RAIL_VARIANT === 'A'} onNearEnd={more.hasMore ? more.loadMore : undefined}>
                {all.map((c, i) => <ExperienceCard key={c.key} card={c} look="showcase" featured={HOME_RAIL_VARIANT === 'A' && i === 0} />)}
                <SeeAllCard href={SEE_ALL_HREF[props.id]} label={props.seeAllLabel} />
            </CardRail>
        </>
    );
}
