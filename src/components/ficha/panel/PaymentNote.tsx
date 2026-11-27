import type { PaymentNoteView } from '@/ficha/lib/panel-view';

/**
 * REQ-10854 · Texto de pago del panel: uno por clave del plan (`panel-plan.ts`), nunca el de otro proveedor (INC-020).
 * Recibe solo su vista (ISP); null no pinta nada.
 */
export function PaymentNote({ view }: { view: PaymentNoteView | null }) {
    if (!view) return null;
    return <p data-pago={view.key} className="text-sm text-[#E3E9F7]">{view.text}</p>;
}
