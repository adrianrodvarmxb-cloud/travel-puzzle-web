import Link from 'next/link';
import type { TourCardModel } from '@/destinations/lib/catalog';
import { formatRating } from '@/home/lib/format';
import { isTravelerFavorite, operatedBy } from '@/tours/lib/favorite';
import { PRIMERA_PIEZA_BADGE } from '@/tours/lib/badge';

const price = (t: TourCardModel) =>
    t.kind === 'own' ? t.priceLabel ?? 'A cotizar' : t.isFreeTour ? 'Gratis' : `Desde ${t.currency} ${Number.isInteger(t.price) ? t.price : t.price.toFixed(2)}`;

/**
 * Tarjeta de tour en /destinos y /la-primera-pieza. Nada se sobrepone a la foto (REQ-098, C5):
 * la insignia y «Favorito» van debajo. El proveedor se nombra; FREETOUR nunca.
 */
export function DestinationTourCard({ tour }: { tour: TourCardModel }) {
    const rating = formatRating(tour.rating);
    const favorite = isTravelerFavorite({ rating: tour.rating, reviews: tour.reviews });
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
                {(tour.isFreeTour || favorite) && (
                    <div className="flex flex-wrap gap-1.5">
                        {tour.isFreeTour && <span className="rounded-md border border-[#7CC4FF]/60 px-2 py-0.5 text-[11px] font-semibold text-[#7CC4FF]">{PRIMERA_PIEZA_BADGE}</span>}
                        {favorite && <span className="rounded-md bg-[#EAF54F] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#0A1330]">★ Favorito de los viajeros</span>}
                    </div>
                )}
                <h3 className="font-display line-clamp-2 text-base font-semibold leading-snug">{tour.title}</h3>
                {tour.kind !== 'own' && <p className="line-clamp-1 text-xs text-[#A9B6D6]">{operatedBy(tour.provider, 'es')}</p>}
                <div className="mt-auto flex items-center justify-between gap-2 border-t border-white/10 pt-3 text-sm">
                    <span className="text-[#C9D6F5]">
                        {rating ? <><span className="text-[#F5B301]">★</span> <b>{rating}</b> <span className="text-[#A9B6D6]">· {tour.reviews.toLocaleString('es-MX')}</span></> : tour.duration ? `${tour.duration} h` : ''}
                    </span>
                    <span className="font-semibold text-[#EAF54F]">{price(tour)}</span>
                </div>
            </div>
        </Link>
    );
}

export function TourGrid({ tours }: { tours: TourCardModel[] }) {
    return (
        <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tours.map((t) => <li key={t.id}><DestinationTourCard tour={t} /></li>)}
        </ul>
    );
}
