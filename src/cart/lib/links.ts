/**
 * REQ-182: enlace a «Arma tu viaje» desde la confirmación, /reserva/{token} y el correo de confirmación.
 * Solo con ARMA_TU_VIAJE_ENABLED y la reserva activa; el país y el viajero ya no van en la URL (REQ-181). Puro.
 */
const TOKEN = /^[A-Za-z0-9_-]{8,200}$/;

// REQ-182
export function tripUrl(o: { site: string; token: string | null | undefined; enabled: boolean; status: string }): string | null {
  if (!o.enabled || o.status !== "active" || !o.token || !TOKEN.test(o.token)) return null;
  return `${o.site.replace(/\/+$/, "")}/arma-tu-viaje?reserva=${encodeURIComponent(o.token)}`;
}
