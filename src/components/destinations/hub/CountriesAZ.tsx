'use client';

import { useState } from 'react';
import Link from '@/components/i18n/LocalizedLink';
import { destinosHubCopy } from '@/destinations/lib/destinos-hub-copy';
import type { HubGroup } from '@/destinations/lib/destinos-hub';
import { formatCount } from '@/home/lib/format';

/**
 * REQ-3477: todos los países de la A a la Z por continente. En escritorio, columnas abiertas; en celular, acordeón
 * (las listas siguen en el HTML servido: el acordeón solo las oculta con CSS).
 */
export function CountriesAZ({ lang, groups }: { lang: string; groups: HubGroup[] }) {
    const c = destinosHubCopy(lang);
    const [open, setOpen] = useState<string | null>(null);
    if (!groups.length) return null;
    return (
        <section aria-labelledby="a-z" className="mt-14">
            <h2 id="a-z" className="font-display text-2xl font-bold text-white md:text-3xl">{c.azTitle}</h2>
            <p className="mt-1 text-sm text-[#A9B6D6]">{c.azSub}</p>
            <div className="mt-5 grid grid-cols-1 gap-x-8 md:grid-cols-2 lg:grid-cols-3">
                {groups.map((g) => {
                    const on = open === g.continent;
                    return (
                        <div key={g.continent} className="border-b border-white/10 md:border-0 md:pb-6">
                            <button type="button" aria-expanded={on} aria-controls={`az-${g.continent}`} onClick={() => setOpen(on ? null : g.continent)}
                                className="flex min-h-12 w-full items-center justify-between py-3 text-left font-display text-lg font-semibold text-white md:pointer-events-none md:min-h-0 md:py-2">
                                <span>{c.continents[g.continent]} <span className="font-data text-xs text-[#7CC4FF]">{g.countries.length}</span></span>
                                <span aria-hidden="true" className={`text-[#7CC4FF] transition-transform md:hidden ${on ? 'rotate-180' : ''}`}>⌄</span>
                            </button>
                            <ul id={`az-${g.continent}`} className={`${on ? 'block' : 'hidden'} pb-4 md:block md:pb-0`}>
                                {g.countries.map((x) => (
                                    <li key={x.href}>
                                        <Link href={x.href} className="flex items-baseline justify-between gap-3 py-1.5 text-[15px] text-[#DCE4F5] hover:text-white">
                                            <span>{x.name}</span>
                                            <span className="font-data text-[11px] text-[#7C8DBA]">{formatCount(x.tours, lang)}</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
