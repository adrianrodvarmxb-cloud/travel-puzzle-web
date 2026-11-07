'use client';

import { useCallback, useRef, useState } from 'react';
import type { ExperienceCardModel } from '@/tours/lib/experience-card';
import type { HomeCarouselId } from '@/home/lib/carousel-pages';

/**
 * REQ-851: páginas siguientes de un carrusel del inicio. Empieza vacío (el servidor ya pintó la primera página) y pide
 * /api/home/carrusel?c=&p=&lang= al acercarse al final. Una petición a la vez; si falla, deja de pedir (queda «Ver todas»).
 */
export function useCarouselPages(c: HomeCarouselId, lang: string, initialHasMore: boolean) {
    const [cards, setCards] = useState<ExperienceCardModel[]>([]);
    const [hasMore, setHasMore] = useState(initialHasMore);
    const busy = useRef(false);
    const next = useRef(2);
    const loadMore = useCallback(() => {
        if (busy.current || !hasMore) return;
        busy.current = true;
        fetch(`/api/home/carrusel?c=${c}&p=${next.current}&lang=${lang}`)
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
            .then((body: { cards: ExperienceCardModel[]; hasMore: boolean }) => {
                next.current += 1;
                setCards((prev) => {
                    const seen = new Set(prev.map((x) => x.key));
                    return [...prev, ...body.cards.filter((x) => !seen.has(x.key))];
                });
                setHasMore(body.hasMore);
            })
            .catch(() => setHasMore(false))
            .finally(() => { busy.current = false; });
    }, [c, lang, hasMore]);
    return { cards, hasMore, loadMore };
}
