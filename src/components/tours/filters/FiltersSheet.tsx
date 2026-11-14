'use client';
import { useEffect, type ReactNode } from 'react';
import { filtersCopy } from '@/tours/lib/filters-copy';
import { FILTERS_DESKTOP_CLASS } from '@/tours/lib/filters-layout';

/**
 * REQ-056: en celular los filtros abren a pantalla completa (como Civitatis), con "Quitar filtros"
 * y "Ver N experiencias" abajo (REQ-3509); en escritorio el contenido queda en la columna lateral de siempre.
 * REQ-530: en escritorio esa columna es sticky bajo el header y tiene su propio scroll (antes, `lg:top-6` sin alto
 * máximo: la columna quedaba bajo el header y no se podía recorrer hasta que pasaba toda la cuadrícula).
 */
export function FiltersSheet({ open, onClose, onClear, count, lang, children }: { open: boolean; onClose: () => void; onClear: () => void; count: number; lang: string; children: ReactNode }) {
    const c = filtersCopy(lang);
    useEffect(() => {
        if (!open) return;
        const mq = window.matchMedia('(max-width: 1023px)');
        if (mq.matches) document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, [open]);
    return (
        <div className={open ? 'fixed inset-0 z-[60] flex flex-col bg-[#0A1330] lg:static lg:z-auto lg:block lg:bg-transparent' : FILTERS_DESKTOP_CLASS} role={open ? 'dialog' : undefined} aria-modal={open || undefined} aria-label={c.title}>
            <div className="flex items-center gap-3 border-b border-white/10 px-4 py-4 lg:hidden">
                <button type="button" onClick={onClose} aria-label={c.back} className="rounded-full px-2 py-1 text-2xl text-white">←</button>
                <p className="flex-1 text-center font-display text-xl font-bold text-white">{c.title}</p>
                <span className="w-8" />
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 lg:overflow-y-visible lg:p-0">{children}</div>
            <div className="flex items-center gap-3 border-t border-white/10 bg-[#0A1330] px-4 py-3 lg:hidden">
                <button type="button" onClick={onClear} className="flex-1 py-3 font-semibold text-white underline-offset-4 hover:underline">{c.clear}</button>
                <button type="button" onClick={onClose} className="flex-1 rounded-full bg-[#EAF54F] px-5 py-3.5 font-bold text-[#0A1330]">{c.see(count)}</button>
            </div>
        </div>
    );
}
