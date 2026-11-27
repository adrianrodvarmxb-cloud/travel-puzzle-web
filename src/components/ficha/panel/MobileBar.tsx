import type { MobileBarView } from '@/ficha/lib/mobile-bar';
import { LocalPrice } from './LocalPrice';

/**
 * REQ-10910 · Barra fija abajo en celular para la ficha única de viajes (decisión 25): precio «desde» del proveedor
 * (con `LocalPrice` cuando hay ruta, REQ-10874) y el botón que lleva al panel (`#reserva`). Recibe solo su vista (ISP);
 * sin hooks: sirve en servidor (DIP). Sin precio, solo el botón. En computadora no se pinta (`lg:hidden` lo pone FichaView).
 */
export function MobileBar({ view }: { view: MobileBarView | null }) {
    if (!view) return null;
    return (
        <div data-barra-celular className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0A1330]/95 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur">
            <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
                {view.priceText ? (
                    <p data-barra-precio className="font-display min-w-0 truncate text-lg font-bold leading-tight text-white">
                        {view.localUrl ? <LocalPrice text={view.priceText} localUrl={view.localUrl} /> : view.priceText}
                    </p>
                ) : <span />}
                <a href={view.href} className="shrink-0 rounded-xl bg-[#C12909] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#A32207]">{view.cta}</a>
            </div>
        </div>
    );
}
