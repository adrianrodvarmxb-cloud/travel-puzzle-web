/**
 * REQ-104: banderas de «Arma tu viaje». Todo apagado salvo "true" exacto.
 * ARMA_TU_VIAJE_ENABLED: página /arma-tu-viaje y carrusel (apagada = 404, no se pinta nada).
 * CART_PAYMENTS_ENABLED: cobros por adaptador (candado Stripe/pagos, solo con OK del PO).
 * VISA_ENABLED / ETIAS_ENABLED: tarjetas de asesoría de visa y ETIAS (REQ-109).
 */
export interface CartFlags { enabled: boolean; payments: boolean; visa: boolean; etias: boolean }

export function cartFlags(env: Record<string, string | undefined>): CartFlags {
  return {
    enabled: env.ARMA_TU_VIAJE_ENABLED === "true",
    payments: env.CART_PAYMENTS_ENABLED === "true",
    visa: env.VISA_ENABLED === "true",
    etias: env.ETIAS_ENABLED === "true",
  };
}
