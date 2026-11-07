'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * REQ-527: carrusel de tarjetas. En celular la siguiente tarjeta se asoma (84 % de ancho, como Airbnb y Klook);
 * en tablet 2 y en escritorio 3 visibles, con flechas redondas arriba a la derecha (Airbnb, GetYourGuide, Viator).
 * Sin flechas cuando todo cabe. Solo desplaza con scrollBy: sin estado que cambie el HTML del servidor (INC-001).
 */
/** REQ-855: anchos por look; `featureFirst` = la primera tarjeta mide dos en escritorio (variante A). */
const WIDTHS = {
    standard: '[&>*]:w-[84%] sm:[&>*]:w-[calc((100%-1rem)/2)] md:[&>*]:w-[calc((100%-1.25rem)/2)] lg:[&>*]:w-[calc((100%-2.5rem)/3)]',
    showcase: '[&>*]:w-[80%] sm:[&>*]:w-[calc((100%-1rem)/1.85)] md:[&>*]:w-[calc((100%-1.25rem)/2.3)] lg:[&>*]:w-[calc((100%-3.75rem)/3.3)]',
} as const;
const FEATURE_FIRST = 'md:[&>*:first-child]:w-[calc(2*(100%-1.25rem)/2.3+1.25rem)] lg:[&>*:first-child]:w-[calc(2*(100%-3.75rem)/3.3+1.25rem)]';

export function CardRail({ children, label, look = 'standard', featureFirst = false, onNearEnd }: { children: React.ReactNode; label: string; look?: keyof typeof WIDTHS; featureFirst?: boolean; /** REQ-851: se acerca al final (carga la página siguiente). */ onNearEnd?: () => void }) {
    const ref = useRef<HTMLDivElement>(null);
    const [edges, setEdges] = useState({ start: true, end: false });

    const measure = useCallback(() => {
        const el = ref.current;
        if (!el) return;
        setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
        if (onNearEnd && el.scrollLeft + el.clientWidth >= el.scrollWidth - el.clientWidth * 1.5) onNearEnd();
    }, [onNearEnd]);

    useEffect(() => {
        measure();
        const el = ref.current;
        el?.addEventListener('scroll', measure, { passive: true });
        window.addEventListener('resize', measure);
        return () => { el?.removeEventListener('scroll', measure); window.removeEventListener('resize', measure); };
    }, [measure]);

    const go = (dir: 1 | -1) => {
        const el = ref.current;
        if (el) el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: 'smooth' });
    };
    const arrow = 'flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-[#121D45] text-lg text-white shadow-md transition-colors hover:border-[#7CC4FF] hover:text-[#7CC4FF] disabled:cursor-default disabled:opacity-30 disabled:hover:border-white/20 disabled:hover:text-white';

    return (
        <div className="relative">
            <div className="mb-3 hidden justify-end gap-2 md:flex" data-testid="rail-arrows">
                <button type="button" className={arrow} onClick={() => go(-1)} disabled={edges.start} aria-label={`${label}: anterior`}>‹</button>
                <button type="button" className={arrow} onClick={() => go(1)} disabled={edges.end} aria-label={`${label}: siguiente`}>›</button>
            </div>
            <div
                ref={ref}
                role="region"
                aria-label={label}
                data-testid="card-rail"
                className={`-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-3 [scrollbar-width:none] md:mx-0 md:gap-5 md:scroll-px-0 md:px-0 [&::-webkit-scrollbar]:hidden [&>*]:shrink-0 [&>*]:snap-start ${WIDTHS[look]} ${featureFirst ? FEATURE_FIRST : ''}`}
            >
                {children}
            </div>
        </div>
    );
}
