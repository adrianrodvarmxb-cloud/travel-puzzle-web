import type { TripCopy } from '@/trips/lib/copy';
import type { TripCard } from '@/trips/public-load';

/** Caja de precio con la llamada a cotizar (en la ola 2-D se cambia por el formulario). */
export function TripPriceBox({ price, c, whatsappUrl }: { price: TripCard['price']; c: TripCopy; whatsappUrl: string | null }) {
    return (
        <div className="rounded-2xl border border-white/10 bg-[#121D45] p-5 lg:sticky lg:top-24">
            {price && (
                <>
                    <p className="font-data text-[11px] uppercase tracking-[0.2em] text-[#A9B6D6]">{c.from}</p>
                    <p className="font-display text-3xl font-bold text-white">{price.main}</p>
                    {price.original && <p className="text-sm text-[#C9D6F5]">{price.original} · {c.perPerson}</p>}
                    {!price.original && <p className="text-sm text-[#C9D6F5]">{c.perPerson}</p>}
                    {price.rateNote && <p className="mt-1 text-xs text-[#7F8DB0]">{price.rateNote}</p>}
                </>
            )}
            {whatsappUrl && (
                <a href={whatsappUrl} target="_blank" rel="noopener" className="mt-4 block rounded-full bg-[#008DFF] px-5 py-3 text-center text-sm font-bold text-white hover:bg-[#0077DB]">{c.cta}</a>
            )}
            <p className="mt-2 text-xs text-[#A9B6D6]">{c.ctaHelp}</p>
        </div>
    );
}
