import type React from 'react';
import type { FichaLang } from '@/ficha/lib/model';
import type { PanelView } from '@/ficha/lib/panel-view';
import { PricePanel } from './panel/PricePanel';
import { BookingControl, type BookingControls } from './panel/BookingControl';
import { PaymentNote } from './panel/PaymentNote';
import { AddToTripButton } from './panel/AddToTripButton';
import { AdvisorLink } from './panel/AdvisorLink';

/**
 * REQ-10859 · Panel de reserva compuesto (plan §3: precio, control de reserva, texto de pago, «Agregar a mi viaje» y
 * ayuda). Solo compone las cinco piezas de `panel/` con la vista que arma `panelView` (REQ-10851): no lee base,
 * banderas ni proveedor (DIP). Los controles llegan registrados por props (OCP); sin el pedido, el asesor (INC-020).
 * «Agregar» sin `onAdd` no pinta nada (el carrito en servidor llega con la ola 10, REQ-10602).
 */
export function FichaPanel({ panel, lang, controls, onAdd }: { panel: PanelView; lang: FichaLang; controls: BookingControls; onAdd?: (ref: string, quote: boolean) => void }) {
    const advisor = <AdvisorLink view={panel.advisor} />;
    return (
        <PricePanel price={panel.price} cancellation={panel.cancellation}>
            <BookingControl plan={panel.plan} lang={lang} controls={controls} fallback={advisor} />
            <PaymentNote view={panel.payment} />
            {onAdd && <AddToTripButton view={panel.addToTrip} onAdd={onAdd} />}
            {panel.plan.control !== 'advisor' && controls[panel.plan.control] && <AdvisorLink view={panel.advisor} compact />}
        </PricePanel>
    );
}

/** «Agregar a mi viaje» en el cuerpo en celular (decisión 25); null mientras no haya carrito. */
// REQ-10859
export function FichaMobileAdd({ panel, onAdd }: { panel: PanelView; onAdd?: (ref: string, quote: boolean) => void }): React.ReactElement | null {
    if (!onAdd || !panel.addToTrip) return null;
    return <AddToTripButton view={panel.addToTrip} onAdd={onAdd} />;
}
