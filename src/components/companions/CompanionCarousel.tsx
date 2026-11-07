'use client';
import { useEffect, useState } from 'react';
import type { CarouselCard } from '@/companions/lib/carousel';
import type { CarouselEventName } from '@/companions/lib/events';
import { TransferPanel } from './TransferPanel';

/** REQ-184: dónde se pinta la tarjeta. Sin marca (datos viejos), las 3 primeras en celular. */
function visibility(card: CarouselCard, i: number): string {
    const mobile = card.mobile ?? i < 3;
    const desktop = card.desktop ?? true;
    if (mobile && desktop) return 'flex';
    return mobile ? 'flex md:hidden' : 'hidden md:flex';
}

/** REQ-110: manda el evento sin bloquear la navegación (sin datos personales). */
function track(name: CarouselEventName, card: CarouselCard, cityCode: string) {
    try {
        const body = JSON.stringify({ name, type: card.category === 'etias' ? 'etias' : card.type, cityCode });
        if (navigator.sendBeacon) navigator.sendBeacon('/api/arma-tu-viaje/eventos', new Blob([body], { type: 'application/json' }));
        else void fetch('/api/arma-tu-viaje/eventos', { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true });
    } catch {
        // medir nunca rompe la página
    }
}

/**
 * REQ-108: carrusel «Ya tienes tu primera pieza. ¿Armamos las demás?».
 * Recibe las tarjetas ya ordenadas en el servidor; cada una dice si se pinta en celular (máx. 3) y en
 * escritorio (máx. 4) (REQ-184).
 * Nada viene preseleccionado: cada acción es un toque del cliente. Cada tarjeta dice quién cobra.
 */
export function CompanionCarousel({ cards, cityCode, transferWidgetSrc }: { cards: CarouselCard[]; cityCode: string; transferWidgetSrc?: string }) {
    const [panel, setPanel] = useState<CarouselCard | null>(null);
    useEffect(() => {
        const desktop = window.matchMedia('(min-width: 768px)').matches;
        cards.filter((c) => (desktop ? c.desktop !== false : c.mobile !== false)).forEach((c) => track('card_viewed', c, cityCode));
    }, [cards, cityCode]);

    if (cards.length === 0) return null;
    return (
        <section aria-labelledby="carrusel-titulo" className="mt-10">
            <h2 id="carrusel-titulo" className="text-xl font-bold text-white md:text-2xl">Ya tienes tu primera pieza. ¿Armamos las demás?</h2>
            <ul className="mt-5 grid gap-4 md:grid-cols-4">
                {cards.map((card, i) => {
                    const a = card.action;
                    // REQ-105: sin inventario real no hay botón de reserva; la reserva directa se conecta en otra ola.
                    if (!a || a.kind === 'book') return null;
                    return (
                        <li key={`${card.category}-${i}`} className={`${visibility(card, i)} flex-col rounded-2xl border border-white/10 bg-white/5 p-4`}>
                            <p className="text-base font-semibold text-white">{card.title}</p>
                            <p className="mt-1 text-sm text-slate-300">{card.chargedByLabel}</p>
                            {card.priceLabel ? <p className="mt-1 text-sm font-semibold text-sky-300">{card.priceLabel}</p> : null}
                            {/* REQ-320: experiencias ya cargadas cerca (foto, nombre real, precio y su ficha). */}
                            {a.kind === 'catalog' && card.experiences?.length ? (
                                <ul className="mt-3 flex flex-col gap-3">
                                    {card.experiences.map((e) => (
                                        <li key={e.id}>
                                            <a
                                                href={e.path}
                                                onClick={() => track('card_added', card, cityCode)}
                                                className="flex items-center gap-3 rounded-xl p-1 hover:bg-white/10"
                                            >
                                                {e.image ? (
                                                    <img src={e.image} alt="" loading="lazy" className="h-14 w-20 shrink-0 rounded-lg object-cover" />
                                                ) : (
                                                    <span aria-hidden="true" className="h-14 w-20 shrink-0 rounded-lg bg-white/10" />
                                                )}
                                                <span className="min-w-0">
                                                    <span className="block text-sm font-semibold leading-snug text-white">{e.title}</span>
                                                    <span className="block text-xs text-sky-300">{e.price}</span>
                                                </span>
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                            <a
                                href={a.url}
                                target="_blank"
                                rel={a.kind === 'deeplink' ? 'sponsored noopener noreferrer' : 'noopener noreferrer'}
                                onClick={() => track(a.kind === 'deeplink' ? 'card_added' : 'whatsapp_quote', card, cityCode)}
                                className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-sky-500 px-4 text-sm font-semibold text-white hover:bg-sky-400"
                            >
                                {a.label}
                            </a>
                            )}
                            {/* REQ-120: el buscador de traslados vive dentro del carrito, en un panel; nunca como sección suelta. */}
                            {card.type === 'transfer' && a.kind === 'deeplink' && transferWidgetSrc ? (
                                <button
                                    type="button"
                                    onClick={() => { track('card_added', card, cityCode); setPanel(card); }}
                                    className="mt-2 inline-flex min-h-11 items-center justify-center rounded-full border border-white/20 px-4 text-sm font-semibold text-white hover:bg-white/10"
                                >
                                    Agregar traslado
                                </button>
                            ) : null}
                        </li>
                    );
                })}
            </ul>
            {panel && transferWidgetSrc ? <TransferPanel src={transferWidgetSrc} chargedBy={panel.chargedByLabel} onClose={() => setPanel(null)} /> : null}
        </section>
    );
}
