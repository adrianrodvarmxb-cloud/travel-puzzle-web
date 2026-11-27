import type React from 'react';
import type { FichaLang } from '@/ficha/lib/model';
import type { PanelControl, PanelPlan } from '@/ficha/lib/panel-plan';

/** REQ-10853 · Interfaz común de los cuatro controles de reserva (LSP): calendario, caja de compra, formulario y asesor. */
export interface BookingControlSlotProps { plan: PanelPlan; lang: FichaLang }
export type BookingControls = Partial<Record<PanelControl, React.ComponentType<BookingControlSlotProps>>>;

/**
 * REQ-10853 · Monta el control que pide el plan (`panel-plan.ts`). Los controles llegan registrados por props (OCP,
 * DIP): este componente no conoce calendarios, cajas de compra ni formularios, ni lee banderas o proveedor. Si el
 * control pedido no está registrado, cae al asesor (`fallback`), nunca al control de otro proveedor (INC-020).
 */
export function BookingControl({ plan, lang, controls, fallback }: { plan: PanelPlan; lang: FichaLang; controls: BookingControls; fallback: React.ReactNode }) {
    const Control = plan.control === 'advisor' ? undefined : controls[plan.control];
    return (
        <div data-control={Control ? plan.control : 'advisor'}>
            {Control ? <Control plan={plan} lang={lang} /> : fallback}
        </div>
    );
}
