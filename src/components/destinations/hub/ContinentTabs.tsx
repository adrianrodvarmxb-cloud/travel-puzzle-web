'use client';

import { useState } from 'react';
import Link from '@/components/i18n/LocalizedLink';
import { destinosHubCopy, continentAnchor } from '@/destinations/lib/destinos-hub-copy';
import type { HubGroup } from '@/destinations/lib/destinos-hub';
import { hubCopy } from '@/destinations/lib/hub-copy';
import { experiencesCount } from '@/tours/lib/catalog-name';
import { formatCount } from '@/home/lib/format';

/**
 * REQ-3476 (gate C): pestañas por continente con foto por país. Todas las pestañas van en el HTML servido
 * (las inactivas con `hidden`), así Google ve todos los enlaces aunque el visitante vea una a la vez.
 */
export function ContinentTabs({ lang, groups }: { lang: string; groups: HubGroup[] }) {
    const c = destinosHubCopy(lang);
    const k = hubCopy(lang === 'es' ? 'es' : 'en');
    const [active, setActive] = useState(groups[0]?.continent);
    if (!groups.length) return null;
    return (
        <section aria-labelledby="por-continente" className="mt-14">
            <h2 id="por-continente" className="font-display text-2xl font-bold text-white md:text-3xl">{c.contTitle}</h2>
            <p className="mt-1 text-sm text-[#A9B6D6]">{c.contSub}</p>
            <div role="tablist" aria-label={c.contTitle} className="-mx-4 mt-5 flex gap-1 overflow-x-auto border-b border-white/10 px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
                {groups.map((g) => {
                    const on = g.continent === active;
                    return (
                        <button key={g.continent} type="button" role="tab" id={`tab-${g.continent}`} aria-selected={on} aria-controls={`panel-${g.continent}`} onClick={() => setActive(g.continent)}
                            className={`shrink-0 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${on ? 'border-[#EAF54F] text-white' : 'border-transparent text-[#A9B6D6] hover:text-white'}`}>
                            {c.continents[g.continent]}
                        </button>
                    );
                })}
            </div>
            {groups.map((g) => (
                <div key={g.continent} role="tabpanel" id={`panel-${g.continent}`} aria-labelledby={`tab-${g.continent}`} hidden={g.continent !== active} className="pt-6">
                    <span id={continentAnchor(g.continent)} className="block scroll-mt-28" />
                    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        {g.countries.slice(0, 12).map((x) => (
                            <li key={x.href}>
                                <Link href={x.href} className="group block overflow-hidden rounded-2xl border border-white/10 bg-[#121D45] transition-colors hover:border-[#008DFF]/60">
                                    <div className="relative aspect-[4/3] overflow-hidden bg-[linear-gradient(135deg,#16245A,#0E1A40)]">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        {x.image && <img src={x.image} alt={x.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />}
                                    </div>
                                    <div className="px-4 py-3">
                                        <p className="font-display text-base font-semibold text-white">{x.name}</p>
                                        <p className="mt-0.5 text-xs text-[#A9B6D6]">{k.cityCount(x.cities)} · {experiencesCount(formatCount(x.tours, lang), lang)}</p>
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </section>
    );
}
