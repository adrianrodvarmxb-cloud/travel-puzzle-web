/**
 * REQ-10846 y REQ-10847 · Ficha única, ola 7, bloques 19 «Completa tu viaje» y 20 «Otras experiencias en la ciudad»
 * (plan §3). Puro: sin I/O, sin banderas y sin reloj. Las tarjetas llegan ya elegidas por quien llama (el «cerca» único
 * `src/geo/lib/near.ts` para el transporte y la tarjeta de Kiwitaxi de `src/trips/lib/transfer-card.ts` tras su
 * bandera); aquí solo se aplican las reglas firmadas que no pueden fallar aunque el llamador se equivoque:
 * - 19 (decisión 29, REQ-10607; firma REQ-10764): transporte por ubicación en toda ficha; ningún producto de FREETOUR
 *   como «cerca»; Kiwitaxi (afiliado) nunca en una ficha de FREETOUR. La tarjeta de Kiwitaxi lleva el texto §L de
 *   afiliado del dictamen (19-11-2026, punto 20), literal y en español (versión vinculante, §J).
 * - 20: regla 60/40 (de pago / gratis; `mixRecommendations`, la misma del mapa y los correos) y tope por proveedor: en
 *   la primera vuelta ningún proveedor pasa de `OTHERS_PROVIDER_CAP`; si no alcanza para llenar, se completa con lo que
 *   quede (la regla de la página del home, REQ-10516). Nunca la propia ficha.
 */
import { mixRecommendations } from "@/booking/lib/recommendations";
import { NEAR_EXCLUDED_PROVIDERS, NEAR_MAX, transportAllowedFor } from "@/geo/lib/near";
import type { TransferCardView } from "@/trips/lib/transfer-card";
import { GUARANTEE_L } from "./guarantees";
import type { FichaLang, FichaModel } from "./model";

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

const COPY = {
  es: { completa: "Completa tu viaje", otras: (city: string) => `Otras experiencias en ${city}` },
  en: { completa: "Complete your trip", otras: (city: string) => `More experiences in ${city}` },
};
const copy = (lang: FichaLang) => (lang === "es" ? COPY.es : COPY.en);

/** Tarjeta de transporte propio o de agencia (ya elegida por `nearUnified`). */
export interface TransportCard { id: string; title: string; href: string; provider: string | null; imageUrl?: string | null }
export interface AffiliateCard extends TransferCardView { note: string }

export interface CompleteTripBlockView { heading: string; transport: TransportCard[]; affiliate: AffiliateCard | null }

/** Bloque 19: transporte por ubicación y, fuera de FREETOUR, la tarjeta de Kiwitaxi con su nota §L; null si no hay nada. */
// REQ-10846
export function completeTripBlockView(f: Pick<FichaModel, "id" | "provider" | "lang">, transport: TransportCard[], kiwitaxi: TransferCardView | null): CompleteTripBlockView | null {
  const cards = transport
    .filter((t) => t.id !== f.id && !NEAR_EXCLUDED_PROVIDERS.includes(norm(t.provider)))
    .slice(0, NEAR_MAX);
  const affiliate = kiwitaxi && transportAllowedFor(f.provider, { affiliate: true }) ? { ...kiwitaxi, note: GUARANTEE_L.afiliado } : null;
  if (!cards.length && !affiliate) return null;
  return { heading: copy(f.lang).completa, transport: cards, affiliate };
}

/** Tarjeta de otra experiencia de la ciudad. `paid`: con precio (va en el 60 %). */
export interface OtherCard {
  id: string; title: string; href: string; provider: string | null; imageUrl?: string | null; priceText?: string | null;
  /** REQ-10893: ruta de `/api/precio-local` para que el navegador pinte «Desde» en la moneda del visitante; null = no se pide. */
  localUrl?: string | null;
}

export const OTHERS_MAX = 3;
/** Tope por proveedor en la primera vuelta (con 3 tarjetas, a lo más 2 del mismo proveedor). */
export const OTHERS_PROVIDER_CAP = 2;

function capByProvider<T extends { provider: string | null }>(items: T[], cap: number, n: number): T[] {
  const count = new Map<string, number>();
  const first: T[] = [];
  const rest: T[] = [];
  for (const it of items) {
    const k = norm(it.provider);
    const c = count.get(k) ?? 0;
    if (c < cap) { first.push(it); count.set(k, c + 1); } else rest.push(it);
  }
  return [...first, ...rest].slice(0, Math.max(n, 0));
}

export interface OtherExperiencesBlockView { heading: string; items: OtherCard[] }

/** Bloque 20: 60/40 de pago y gratis, tope por proveedor, sin la propia ficha; null si no queda ninguna. */
// REQ-10847
export function otherExperiencesBlockView(
  f: Pick<FichaModel, "id" | "lang" | "city">,
  paid: OtherCard[],
  free: OtherCard[],
  opts: { includePaid: boolean; max?: number },
): OtherExperiencesBlockView | null {
  const n = opts.max ?? OTHERS_MAX;
  const seen = new Set<string>([f.id]);
  const uniq = (list: OtherCard[]) => list.filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));
  const p = uniq(paid);
  const fr = uniq(free);
  const mixed = mixRecommendations(p, fr, p.length + fr.length, opts.includePaid);
  // 60/40 primero (orden de mixRecommendations sobre n) y luego el tope por proveedor sobre esa mezcla.
  const head = mixRecommendations(p, fr, n, opts.includePaid);
  const items = capByProvider([...head, ...mixed.filter((c) => !head.includes(c))], OTHERS_PROVIDER_CAP, n);
  if (!items.length || !f.city.name) return null;
  return { heading: copy(f.lang).otras(f.city.name), items };
}
