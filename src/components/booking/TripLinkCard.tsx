/**
 * REQ-182: invitación a «Arma tu viaje» en la pantalla de confirmación y en /reserva/{token}.
 * Solo llega `href` con ARMA_TU_VIAJE_ENABLED y la reserva activa. Ofrece complementos, nunca tours (regla B3).
 */
export function TripLinkCard({ href, className = '' }: { href: string | null | undefined; className?: string }) {
    if (!href || !href.startsWith('/arma-tu-viaje?')) return null;
    return (
        <div className={`rounded-xl border border-[#E6EBF5] bg-[#F4F7FD] px-4 py-4 ${className}`}>
            <p className="text-base font-bold text-[#0A1330]">Arma el resto de tu viaje</p>
            <p className="mt-1 text-sm text-gray-600">Traslado del aeropuerto, eSIM y transporte, con tu fecha ya escrita. Cada pieza dice quién la cobra.</p>
            <a href={href} className="mt-3 block rounded-xl bg-[#C12909] px-5 py-3 text-center text-sm font-bold text-white hover:opacity-90">Armar mi viaje &nbsp;→</a>
        </div>
    );
}
