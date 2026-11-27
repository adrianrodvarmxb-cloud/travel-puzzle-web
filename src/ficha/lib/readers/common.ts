/**
 * REQ-10826 · Ficha única, ola 6 (plan §2: `lib/readers/`, «un lector por superficie: page, mila, email, booking,
 * search»; decisión 3, REQ-10582). Núcleo común que todos los lectores usan para los datos que el viajero ve repetidos
 * (título, duración, idioma, punto de encuentro, precio, cancelación, operador): así la paridad entre ficha, Mila,
 * correo, página de reserva y buscador sale por construcción y no por disciplina (dictamen punto 19, REQ-10803:
 * «datos dinámicos iguales al voucher»). Puro.
 */
import { cancellationSummary } from "../cancellation";
import { keyFactsRows } from "../key-facts";
import { formatAmount } from "../local-price";
import type { FichaLang, FichaModel, FichaPrice } from "../model";
import { referenciaFicha } from "../whatsapp-context";

export interface ReaderContext {
  /** Ruta pública de la ficha (sin dominio). */
  path: string;
}

/** Lo que toda superficie repite igual. */
export interface CommonFacts {
  id: string;
  provider: string;
  reference: string;
  title: string;
  place: string;
  lang: FichaLang;
  duration: string | null;
  languages: string | null;
  meeting: string | null;
  price: FichaPrice | null;
  priceText: string | null;
  cancellation: string | null;
  operator: string | null;
  path: string;
}

const PER: Record<FichaLang, Record<FichaPrice["per"], string>> = {
  es: { person: "por persona", group: "por grupo", total: "en total" },
  en: { person: "per person", group: "per group", total: "in total" },
  pt: { person: "por pessoa", group: "por grupo", total: "no total" },
  fr: { person: "par personne", group: "par groupe", total: "au total" },
  de: { person: "pro Person", group: "pro Gruppe", total: "insgesamt" },
  it: { person: "a persona", group: "a gruppo", total: "in totale" },
};
const FREE: Record<FichaLang, string> = { es: "Gratis", en: "Free", pt: "Grátis", fr: "Gratuit", de: "Kostenlos", it: "Gratis" };

/** Precio del proveedor en texto (la moneda del visitante la agrega la página con `localPrice`). */
// REQ-10826
export function providerPriceText(p: FichaPrice | null, lang: FichaLang): string | null {
  if (!p) return null;
  if (p.amount <= 0) return FREE[lang] ?? FREE.en;
  return `${formatAmount(p.amount, p.currency, lang)} ${(PER[lang] ?? PER.en)[p.per]}`;
}

// REQ-10826
export function commonFacts(f: FichaModel, ctx: ReaderContext): CommonFacts {
  const rows = keyFactsRows(f.facts, f.lang);
  const row = (id: string) => rows.find((r) => r.id === id)?.value ?? null;
  return {
    id: f.id,
    provider: f.provider,
    reference: referenciaFicha(f),
    title: f.title.trim(),
    place: `${f.city.name}, ${f.country.name}`,
    lang: f.lang,
    duration: row("duracion"),
    languages: row("idiomas"),
    meeting: f.meeting.title?.trim() || null,
    price: f.price,
    priceText: providerPriceText(f.price, f.lang),
    cancellation: cancellationSummary(f.cancellation?.hours, f.lang === "es" ? "es" : "en"),
    operator: f.operator,
    path: ctx.path,
  };
}

/** Llaves de `CommonFacts` que la prueba de paridad compara entre lectores. */
export const PARITY_KEYS = ["title", "reference", "place", "duration", "languages", "meeting", "priceText", "cancellation", "operator", "path"] as const satisfies readonly (keyof CommonFacts)[];
