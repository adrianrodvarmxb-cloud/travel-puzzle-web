import Link from 'next/link';
import type { TourCardModel } from '@/destinations/lib/catalog';
import { formatRating } from '@/home/lib/format';
import { isTravelerFavorite, operatedBy } from '@/tours/lib/favorite';
import { operatedByFor } from '@/taxonomy/lib/copy';
import { primeraPiezaBadge } from '@/tours/lib/badge';
import { cardPrice } from '@/tours/lib/price-label';
import type { FxRates } from '@/trips/lib/money';
import { ExperienceCard } from '@/components/tours/ExperienceCard';
import { fromDestinationTour } from '@/tours/lib/card-sources';
import { tourPriceLabel } from '@/tours/lib/price-label';

/** Oculto desde REQ-170 (la tarjeta usa cardPrice, con MXN aproximado). Se conserva por la regla de no borrar código. */
export const price = (t: TourCardModel) =>
    t.kind === 'own' ? t.priceLabel ?? 'A cotizar' : t.isFreeTour ? 'Gratis' : `Desde ${t.currency} ${Number.isInteger(t.price) ? t.price : t.price.toFixed(2)}`;

/**
 * Sin uso desde REQ-520 (TourGrid pinta ExperienceCard); se conserva por la regla de no borrar código.
 * Tarjeta de tour en /destinos y /la-primera-pieza. Nada se sobrepone a la foto (REQ-098, C5):
 * la insignia y «Favorito» van debajo. El proveedor se nombra; FREETOUR nunca.
 * Componente de servidor: el precio (REQ-170) se formatea aquí con idioma fijo (INC-001).
 */
/** T5 (REQ-416): con `guideCopy`, «guía local» solo si el tour tiene guía en persona. */
export function DestinationTourCard({ tour, rates = null, guideCopy = false }: { tour: TourCardModel; rates?: FxRates | null; guideCopy?: boolean }) {
    const p = cardPrice(tour, rates);
    const rating = formatRating(tour.rating);
    const favorite = isTravelerFavorite({ rating: tour.rating, reviews: tour.reviews });
    // REQ-614 (D2): la insignia de propina solo por primeraPiezaBadge (oculta si fullPricePerGroup > 0). Sin evento elegido, como la ficha.
    const badge = primeraPiezaBadge({ isFreeTour: tour.isFreeTour, fullPricePerGroup: {}, groupSize: 1 });
    return (
        <Link href={tour.href} className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#121D45] text-white transition-colors hover:border-[#008DFF]/60">
            <div className="aspect-[16/10] bg-[#1B2A5E]">
                {tour.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={tour.image} alt={tour.title} loading="lazy" className="h-full w-full object-cover" />
                ) : (
                    <span className="flex h-full items-center justify-center text-4xl opacity-50" aria-hidden>🌍</span>
                )}
            </div>
            <div className="flex flex-1 flex-col gap-2 p-4">
                {(badge || favorite) && (
                    <div className="flex flex-wrap gap-1.5">
                        {badge && <span className="rounded-md border border-[#7CC4FF]/60 px-2 py-0.5 text-[11px] font-semibold text-[#7CC4FF]">{badge}</span>}
                        {favorite && <span className="rounded-md bg-[#EAF54F] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#0A1330]">★ Favorito de los viajeros</span>}
                    </div>
                )}
                <h3 className="font-display line-clamp-2 text-base font-semibold leading-snug">{tour.title}</h3>
                {tour.kind !== 'own' && <p className="line-clamp-1 text-xs text-[#A9B6D6]">{guideCopy ? operatedByFor(tour.provider, tour.guiaEnPersona !== false, operatedBy(tour.provider, 'es')) : operatedBy(tour.provider, 'es')}</p>}
                <div className="mt-auto flex items-center justify-between gap-2 border-t border-white/10 pt-3 text-sm">
                    <span className="text-[#C9D6F5]">
                        {rating ? <><span className="text-[#F5B301]">★</span> <b>{rating}</b> <span className="text-[#A9B6D6]">· {tour.reviews.toLocaleString('es-MX')}</span></> : tour.duration ? `${tour.duration} h` : ''}
                    </span>
                    <span className="text-right">
                        <span className="block font-semibold text-[#EAF54F]">{p.main}</span>
                        {p.approx && <span className="block text-[11px] text-[#A9B6D6]">{p.approx}</span>}
                    </span>
                </div>
            </div>
        </Link>
    );
}

export function TourGrid({ tours, rates = null }: { tours: TourCardModel[]; rates?: FxRates | null; /** T5 (REQ-416): la tarjeta única no dice «guía local»; se acepta para no romper ToursByFormat. */ guideCopy?: boolean }) {
    return (
        <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* REQ-520: tarjeta única (guideCopy de T5 no aplica: la tarjeta nombra al operador sin «guía local»); el precio de pago (REQ-170, D4) se arma aquí en el servidor con idioma fijo. */}
            {tours.map((t) => {
                const label = t.kind === 'own' || t.isFreeTour ? null : tourPriceLabel(t.price, t.currency, rates, 'es');
                return <li key={t.id}><ExperienceCard card={fromDestinationTour(t, { price: label ? { main: label.main, approx: label.approx } : null })} /></li>;
            })}
        </ul>
    );
}
