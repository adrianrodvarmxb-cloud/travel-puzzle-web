import type React from 'react';
import type { PriceView } from '@/ficha/lib/panel-view';
import { LocalPrice } from './LocalPrice';

/**
 * REQ-10852 · Panel de reserva de la ficha única (plan §3 y §5): precio en la moneda del visitante con la moneda del
 * cargo a la vista (decisión 32) y la cancelación resumida junto al precio (decisión 34). El control de reserva, el
 * texto de pago, «Agregar a mi viaje» y la ayuda llegan como `children` (OCP). Recibe solo su porción (ISP); no lee
 * base, banderas ni proveedor (DIP). Sin precio no pinta la fila; nunca «N/D». REQ-10874: con `price.localUrl` el
 * texto lo actualiza `LocalPrice` en el navegador con la moneda del visitante (el HTML en caché es igual para todos).
 */
export function PricePanel({ price, cancellation, children }: { price: PriceView | null; cancellation: string | null; children?: React.ReactNode }) {
    return (
        <aside data-panel="reserva" className="rounded-xl border border-white/10 bg-white/5 p-6">
            {price && (
                <p data-precio className="font-display text-2xl font-bold text-white">
                    {price.localUrl ? <LocalPrice text={price.text} localUrl={price.localUrl} /> : price.text}
                </p>
            )}
            {cancellation && <p data-cancelacion className="mt-1 text-sm text-[#E3E9F7]">{cancellation}</p>}
            {children && <div className="mt-5 space-y-4">{children}</div>}
        </aside>
    );
}
