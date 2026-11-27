/**
 * REQ-10825 · Ficha única, ola 6 (plan §2: `lib/agent-view.ts`, «vista de Mila desde el modelo, sin FREETOUR»).
 * Decisión 40 (REQ-10617): Mila ve e informa sobre los tours de Tangol desde ya; para reservar manda a la ficha o a un
 * asesor. Decisión 42 (REQ-10619) y regla B3 de docs/freetour: FREETOUR nunca llega a Mila. Decisión 39 (REQ-10616):
 * la rama #468 se rehace sobre este modelo. Plan §4: «Igual que la pública; FREETOUR nunca sale; sin neto ni teléfonos».
 * - Solo datos públicos del modelo (sin galería, que Mila no necesita en texto). Nunca neto, comisión, teléfonos ni
 *   correos (REQ-10540): el modelo ya no los trae y el texto se arma solo de sus campos.
 * - Texto plano para el prompt, en el idioma de la ficha (es/en; los demás usan inglés), sin HTML.
 * Puro.
 */
import { FREETOUR_PROVIDER } from "./blocks";
import { cancellationSummary } from "./cancellation";
import { keyFactsRows } from "./key-facts";
import { formatAmount } from "./local-price";
import type { BookingMode, FichaModel, FichaPrice } from "./model";
import { htmlToLines } from "./text";
import { referenciaFicha } from "./whatsapp-context";

export interface AgentOption { id: string; name: string; price: FichaPrice | null }

export interface AgentView {
  id: string;
  provider: string;
  reference: string;
  title: string;
  /** «Ciudad, País». */
  place: string;
  summary: string | null;
  duration: string | null;
  languages: string[];
  price: FichaPrice | null;
  cancellation: string | null;
  meeting: string | null;
  includes: string[];
  excludes: string[];
  whatToBring: string[];
  options: AgentOption[];
  /** Igual que la ficha pública: línea «Opera en destino» (decisión 38) o null. */
  operator: string | null;
  booking: { mode: BookingMode; path: string };
}

const lines = (html: string | null): string | null => { const t = htmlToLines(html).join(" ").replace(/\s+([.,;:!?])/g, "$1").trim(); return t || null; };

/** Vista de Mila; null si el proveedor no puede llegar a un bot (FREETOUR). */
// REQ-10825
export function agentView(f: FichaModel, ctx: { path: string }): AgentView | null {
  if (f.provider === FREETOUR_PROVIDER) return null;
  const facts = keyFactsRows(f.facts, f.lang);
  return {
    id: f.id,
    provider: f.provider,
    reference: referenciaFicha(f),
    title: f.title.trim(),
    place: `${f.city.name}, ${f.country.name}`,
    summary: (f.brief ?? "").trim() || lines(f.descriptionHtml),
    duration: facts.find((r) => r.id === "duracion")?.value ?? null,
    languages: [...new Set(f.facts.languages.map((l) => l.trim().toLowerCase()).filter(Boolean))],
    price: f.price,
    cancellation: cancellationSummary(f.cancellation?.hours, f.lang === "es" ? "es" : "en"),
    meeting: f.meeting.title?.trim() || null,
    includes: f.includes,
    excludes: f.excludes,
    whatToBring: f.whatToBring,
    options: f.options.map((o) => ({ id: o.id, name: o.name, price: o.price })),
    operator: f.operator,
    booking: { mode: f.booking.mode, path: ctx.path },
  };
}

const COPY = {
  es: { ref: "Código", place: "Dónde", duration: "Duración", langs: "Idioma del guía", price: "Precio", free: "Gratis", per: { person: "por persona", group: "por grupo", total: "en total" }, cancel: "Cancelación", meeting: "Punto de encuentro", includes: "Incluye", excludes: "No incluye", options: "Opciones", operator: "Opera en destino", book: "Reservar", request: "se reserva a solicitud desde la ficha", advisor: "se aparta con un asesor", noPrice: "sin precio" },
  en: { ref: "Code", place: "Where", duration: "Duration", langs: "Guide language", price: "Price", free: "Free", per: { person: "per person", group: "per group", total: "in total" }, cancel: "Cancellation", meeting: "Meeting point", includes: "Includes", excludes: "Not included", options: "Options", operator: "Operated locally by", book: "Book", request: "booked on request from the page", advisor: "booked with an advisor", noPrice: "no price" },
};

const priceText = (p: FichaPrice | null, c: (typeof COPY)["es"], lang: FichaModel["lang"]): string => (p === null ? c.noPrice : p.amount <= 0 ? c.free : `${formatAmount(p.amount, p.currency, lang)} ${c.per[p.per]}`);

/** Texto corto para el prompt de Mila; null si la ficha no puede llegar a Mila. */
// REQ-10825
export function agentViewText(f: FichaModel, ctx: { path: string }): string | null {
  const v = agentView(f, ctx);
  if (!v) return null;
  const c = f.lang === "es" ? COPY.es : COPY.en;
  const out: string[] = [`${v.title} (${c.ref} ${v.reference})`, `${c.place}: ${v.place}`];
  if (v.summary) out.push(v.summary);
  if (v.duration) out.push(`${c.duration}: ${v.duration}`);
  if (v.languages.length) out.push(`${c.langs}: ${v.languages.join(", ")}`);
  out.push(`${c.price}: ${priceText(v.price, c, f.lang)}`);
  if (v.cancellation) out.push(`${c.cancel}: ${v.cancellation}`);
  if (v.meeting) out.push(`${c.meeting}: ${v.meeting}`);
  if (v.includes.length) out.push(`${c.includes}: ${v.includes.join(", ")}`);
  if (v.excludes.length) out.push(`${c.excludes}: ${v.excludes.join(", ")}`);
  if (v.options.length > 1) out.push(`${c.options}: ${v.options.map((o) => `${o.name} (${priceText(o.price, c, f.lang)})`).join("; ")}`);
  if (v.operator) out.push(`${c.operator}: ${v.operator}`);
  const how = v.booking.mode === "request" ? ` (${c.request})` : v.booking.mode === "advisor" ? ` (${c.advisor})` : "";
  out.push(`${c.book}: ${v.booking.path}${how}`);
  return out.join("\n");
}
