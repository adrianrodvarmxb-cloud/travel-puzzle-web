'use client';
import { useEffect } from 'react';
import type { CarouselCard } from '@/companions/lib/carousel';
import type { CarouselEventName } from '@/companions/lib/events';

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
 * Recibe hasta 4 tarjetas ya ordenadas en el servidor; en celular solo se ven las 3 primeras.
 * Nada viene preseleccionado: cada acción es un toque del cliente. Cada tarjeta dice quién cobra.
 */
export function CompanionCarousel({ cards, cityCode }: { cards: CarouselCard[]; cityCode: string }) {
    useEffect(() => {
        const visible = window.matchMedia('(min-width: 768px)').matches ? 4 : 3;
        cards.slice(0, visible).forEach((c) => track('card_viewed', c, cityCode));
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
                        <li key={`${card.category}-${i}`} className={`${i >= 3 ? 'hidden md:flex' : 'flex'} flex-col rounded-2xl border border-white/10 bg-white/5 p-4`}>
                            <p className="text-base font-semibold text-white">{card.title}</p>
                            <p className="mt-1 text-sm text-slate-300">{card.chargedByLabel}</p>
                            <a
                                href={a.url}
                                target="_blank"
                                rel={a.kind === 'deeplink' ? 'sponsored noopener noreferrer' : 'noopener noreferrer'}
                                onClick={() => track(a.kind === 'whatsapp' ? 'whatsapp_quote' : 'card_added', card, cityCode)}
                                className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-sky-500 px-4 text-sm font-semibold text-white hover:bg-sky-400"
                            >
                                {a.label}
                            </a>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
