import Link from '@/components/i18n/LocalizedLink';
import { destinosHubCopy } from '@/destinations/lib/destinos-hub-copy';
import type { HubCity } from '@/destinations/lib/destinos-hub';
import { experiencesCount } from '@/tours/lib/catalog-name';
import { formatCount } from '@/home/lib/format';

/** REQ-3475 (gate B): las 8 ciudades del inicio, en mosaico con foto; la primera grande. */
export function TopDestinations({ lang, cities }: { lang: string; cities: HubCity[] }) {
    const c = destinosHubCopy(lang);
    if (!cities.length) return null;
    return (
        <section aria-labelledby="mas-buscados" className="mt-12">
            <h2 id="mas-buscados" className="font-display text-2xl font-bold text-white md:text-3xl">{c.topTitle}</h2>
            <p className="mt-1 text-sm text-[#A9B6D6]">{c.topSub}</p>
            <ul className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4 md:grid-rows-[220px_220px] md:gap-4">
                {cities.map((d, k) => {
                    const big = k === 0;
                    return (
                        <li key={d.href} className={big ? 'col-span-2 md:row-span-2' : ''}>
                            <Link href={d.href} className={`group relative block h-full overflow-hidden rounded-2xl bg-[#121D45] ${big ? 'aspect-[4/3] md:aspect-auto' : 'aspect-square md:aspect-auto'}`}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={d.image} alt={d.name} loading={k < 2 ? 'eager' : 'lazy'} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,rgba(10,19,48,0.92))]" />
                                <div className="absolute inset-x-4 bottom-4">
                                    <p className="font-data text-[10px] uppercase tracking-[0.2em] text-[#EAF54F]">{d.country}</p>
                                    <p className={`font-display font-bold text-white ${big ? 'text-3xl md:text-4xl' : 'text-lg md:text-xl'}`}>{d.name}</p>
                                    <p className="font-data mt-0.5 text-[11px] uppercase tracking-widest text-[#DCE4F5]">{experiencesCount(formatCount(d.tours, lang), lang)}</p>
                                </div>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
