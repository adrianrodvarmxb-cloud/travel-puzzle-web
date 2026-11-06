'use client';
import { useState } from 'react';
import type { HubGroup } from '@/companions/lib/registry';
import { TransferPanel } from './TransferPanel';

/**
 * REQ-121: sección independiente de complementos (p. ej. «Transporte»), armada desde el registro.
 * Mismas tarjetas que el carrusel; el buscador de traslados solo se abre en un panel al tocar el botón.
 */
export function ComplementsHub({ groups, transferWidgetSrc }: { groups: HubGroup[]; transferWidgetSrc: string }) {
    const [panel, setPanel] = useState<string | null>(null);
    return (
        <>
            {groups.map((g) => (
                <section key={g.group} aria-labelledby={`grupo-${g.group}`} className="mt-10">
                    <h2 id={`grupo-${g.group}`} className="text-xl font-bold text-white md:text-2xl">{g.title}</h2>
                    <ul className="mt-5 grid gap-4 md:grid-cols-2">
                        {g.cards.map((c) => (
                            <li key={c.id} className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-4">
                                <p className="text-base font-semibold text-white">{c.title}</p>
                                <p className="mt-1 text-sm text-slate-300">{c.description}</p>
                                <p className="mt-2 text-sm text-slate-300">{c.chargedByLabel}</p>
                                {c.price ? <p className="mt-1 text-sm font-semibold text-sky-300">{c.price}</p> : null}
                                {c.cities.length > 0 ? (
                                    <p className="mt-2 text-xs text-slate-400">Disponible en: {c.cities.join(' · ')}</p>
                                ) : null}
                                {c.cta.kind === 'widget' ? (
                                    <button
                                        type="button"
                                        onClick={() => setPanel(c.chargedByLabel)}
                                        className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-sky-500 px-4 text-sm font-semibold text-white hover:bg-sky-400"
                                    >
                                        {c.cta.label}
                                    </button>
                                ) : (
                                    <a
                                        href={c.cta.url}
                                        target="_blank"
                                        rel={c.cta.kind === 'deeplink' ? 'sponsored noopener noreferrer' : 'noopener noreferrer'}
                                        className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-sky-500 px-4 text-sm font-semibold text-white hover:bg-sky-400"
                                    >
                                        {c.cta.label}
                                    </a>
                                )}
                            </li>
                        ))}
                    </ul>
                </section>
            ))}
            {panel ? <TransferPanel src={transferWidgetSrc} chargedBy={panel} onClose={() => setPanel(null)} /> : null}
        </>
    );
}
