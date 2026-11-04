/** Qué tipos de viaje se ven en el sitio según los interruptores (puro). */
import type { TripKind } from "./trip";

export interface Visibility { own: boolean; transport: boolean }

/** El transporte tiene su propio interruptor; el resto depende de los viajes propios. */
export function isKindVisible(kind: TripKind | string, f: Visibility): boolean {
  return kind === "transporte" ? f.transport : f.own;
}

export function anyVisible(f: Visibility): boolean {
  return f.own || f.transport;
}

export function visibilityFromEnv(env: { OWN_TOURS_ENABLED?: string; TRANSPORT_ENABLED?: string }): Visibility {
  return { own: env.OWN_TOURS_ENABLED === "true", transport: env.TRANSPORT_ENABLED === "true" };
}
