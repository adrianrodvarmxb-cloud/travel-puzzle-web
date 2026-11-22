'use client';
import type { AddToTripView } from '@/ficha/lib/panel-view';

/**
 * REQ-10855 · «Agregar a mi viaje» en toda ficha (decisión 23); la pieza sin cobro en línea entra «por cotizar», sin
 * monto. El carrito llega por `onAdd` (hook del carrito, fuera del HTML en caché; DIP): sin `onAdd` el botón no hace
 * nada por su cuenta. En celular va en el cuerpo de la ficha y la barra fija no cambia (decisión 25): eso lo decide
 * dónde lo monta `FichaView`.
 */
export function AddToTripButton({ view, onAdd }: { view: AddToTripView | null; onAdd?: (ref: string, quote: boolean) => void }) {
    if (!view) return null;
    return (
        <div data-agregar={view.quote ? 'por-cotizar' : 'con-precio'}>
            <button type="button" data-ref={view.ref} onClick={() => onAdd?.(view.ref, view.quote)} className="inline-flex w-full items-center justify-center rounded-xl border border-[#008DFF] px-5 py-3 font-semibold text-white hover:bg-[#008DFF]/20">
                {view.label}
            </button>
            {view.note && <p className="mt-1 text-center text-xs text-white/60">{view.note}</p>}
        </div>
    );
}
