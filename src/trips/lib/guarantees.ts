/**
 * Garantías Travel Puzzle de la ficha de un viaje (puro). El cuadro solo promete lo que el viaje tiene
 * (decisión del PO, 6 nov 2026). Es una corrección, no va tras bandera.
 */
import type { TripCopy } from "./copy";
import { isAudioGuided } from "./trip-facts";

export interface Guarantee { key: "g1" | "g2" | "g3" | "g4"; icon: string; label: string }
export interface GuaranteeTrip { kind: string; titleEs: string; languages: readonly string[] }
export interface GuaranteeFlags { onlinePayments: boolean }

/** REQ-156: hay pagos en línea solo con CART_PAYMENTS_ENABLED o STRIPE_ENABLED en "true" exacto. */
export function onlinePaymentsFromEnv(env: Record<string, string | undefined>): boolean {
  return env.CART_PAYMENTS_ENABLED === "true" || env.STRIPE_ENABLED === "true";
}

/** REQ-154: guía en vivo en español = el viaje lista español y no es transporte ni audioguía. */
function hasSpanishGuide(t: GuaranteeTrip): boolean {
  return t.kind !== "transporte" && !isAudioGuided(t) && t.languages.some((l) => /^es(\b|[-_])/i.test(l));
}

const RULES: ReadonlyArray<{ key: Guarantee["key"]; icon: string; when: (t: GuaranteeTrip, f: GuaranteeFlags) => boolean }> = [
  { key: "g1", icon: "🗣️", when: hasSpanishGuide },                               // REQ-154
  { key: "g2", icon: "🧭", when: () => true },                                     // REQ-157: todo viaje lo atiende un asesor
  { key: "g3", icon: "🧩", when: (t) => t.kind === "personalizado" },              // REQ-157: solo el personalizado es a la medida
  { key: "g4", icon: "💳", when: (_t, f) => f.onlinePayments },                    // REQ-156
];

export function guaranteeItems(trip: GuaranteeTrip, flags: GuaranteeFlags, c: TripCopy): Guarantee[] {
  return RULES.filter((r) => r.when(trip, flags)).map((r) => ({ key: r.key, icon: r.icon, label: c[r.key] }));
}
