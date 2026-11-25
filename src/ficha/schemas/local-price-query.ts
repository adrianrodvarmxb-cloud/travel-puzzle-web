/**
 * REQ-10874 · Consulta de `/api/precio-local` validada con Zod antes de usarse (blindaje, regla 8): monto público,
 * moneda ISO 4217, «por» e idioma de la ficha. Lo inválido se rechaza con 400; nunca se convierte un monto que no
 * venga bien formado. Pura.
 */
import { z } from "zod";
import type { FichaLang, FichaPrice } from "../lib/model";

export const localPriceQuerySchema = z.object({
  amount: z.coerce.number().finite().nonnegative().max(1_000_000_000),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
  per: z.enum(["person", "group", "total"]).default("person"),
  lang: z.enum(["es", "en", "pt", "fr", "de", "it"]).default("es"),
});

export interface LocalPriceQuery { price: FichaPrice; lang: FichaLang }

/** Lee `amount`, `currency`, `per` y `lang` de la consulta; null si algo no es válido. */
// REQ-10874
export function parseLocalPriceQuery(q: Record<string, string | string[] | undefined> | URLSearchParams): LocalPriceQuery | null {
  const get = (k: string) => (q instanceof URLSearchParams ? q.get(k) ?? undefined : Array.isArray(q[k]) ? q[k]![0] : q[k]);
  const r = localPriceQuerySchema.safeParse({ amount: get("amount"), currency: get("currency"), per: get("per"), lang: get("lang") });
  if (!r.success) return null;
  return { price: { amount: r.data.amount, currency: r.data.currency, per: r.data.per }, lang: r.data.lang };
}

// La liga que arma la ficha vive en lib (puro) junto al cálculo; se reexporta aquí para la prueba de ida y vuelta.
export { localPriceUrl } from "../lib/local-price";
