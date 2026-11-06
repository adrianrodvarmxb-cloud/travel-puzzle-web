/**
 * REQ-120: qué muestra /traslados. Con ARMA_TU_VIAJE_ENABLED encendida, la página es entrada al carrito
 * (el traslado es complemento de una pieza) y el cuadro suelto de Kiwitaxi se oculta de forma reversible.
 * Apagada, se queda como hoy (REQ-028: widget tras TRANSFERS_ENABLED). Puro.
 */
import { isTransfersVisible } from "./widget";

export type TrasladosMode = "widget" | "cart-entry" | "hidden";

export function trasladosMode(env: Record<string, string | undefined>): TrasladosMode {
  if (env.ARMA_TU_VIAJE_ENABLED === "true") return "cart-entry";
  return isTransfersVisible(env.TRANSFERS_ENABLED) ? "widget" : "hidden";
}

export interface TrasladosView { mode: TrasladosMode; transport: boolean; found: boolean }

/**
 * REQ-172: además del modo, la sección «Transporte turístico» (viajes de tipo transporte publicados) sale con
 * TRANSPORT_ENABLED="true", sin depender de ARMA_TU_VIAJE_ENABLED. La página existe si hay algo que mostrar.
 */
// REQ-172
export function trasladosView(env: Record<string, string | undefined>): TrasladosView {
  const mode = trasladosMode(env);
  const transport = env.TRANSPORT_ENABLED === "true";
  return { mode, transport, found: mode !== "hidden" || transport };
}
