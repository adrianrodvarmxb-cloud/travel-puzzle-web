/**
 * REQ-10822 · Ficha única, ola 6 (plan §2: `lib/faq.ts`, «preguntas armadas con datos reales y textos de /ayuda»).
 * Confirmación del PO REQ-10630 (14-11-2026): «Sí, y también en las fichas de FREETOUR. Se arman con datos reales de
 * la ficha y con los mismos textos que la página de Ayuda». Reglas:
 * - Una pregunta por dato real; sin dato no hay pregunta; nunca «N/D» (plan §3).
 * - Duración e idioma salen del mismo dato que «Datos clave» (`key-facts.ts`) y, por tanto, que el voucher
 *   (dictamen punto 19, REQ-10803: la leyenda de cierre §K la agrega el bloque 16, no esta lib).
 * - Los textos generales (pago, propina, qué llevar, llegar tarde) son los de `src/help/lib/faq.ts`, sin copiarlos.
 * - Menos de tres preguntas: el bloque no sale (`FAQ_MIN` de `blocks.ts`; en FREETOUR además tras la revisión de
 *   cumplimiento, `freetourFaqEnabled`).
 * - Nunca nombra al operador ni trae neto o teléfonos (REQ-10540). Español e inglés (los demás idiomas usan inglés).
 * Puro.
 */
import { faqTopics } from "@/help/lib/faq";
import { FAQ_MIN } from "./blocks";
import { cancellationSummary } from "./cancellation";
import { keyFactsRows } from "./key-facts";
import type { FichaModel } from "./model";

export type FichaFaqId = "cancelacion" | "duracion" | "punto-de-encuentro" | "idioma" | "que-llevar" | "ninos" | "pago" | "gratis" | "llegar-tarde";
export interface FichaFaq { id: FichaFaqId; q: string; a: string }

const COPY = {
  es: {
    cancelacion: "¿Puedo cancelar sin cargo?",
    duracion: "¿Cuánto dura?",
    duracionA: (d: string) => `Dura ${d}.`,
    punto: "¿Dónde es el punto de encuentro?",
    puntoA: (t: string) => `En ${t}. Los detalles exactos vienen en tu confirmación.`,
    idioma: "¿En qué idioma es?",
    idiomaA: (l: string) => `El guía habla ${l}.`,
    ninos: "¿Pueden ir niños?",
    ninosA: (a: number, b: number) => `Sí. La tarifa de niño aplica de ${a} a ${b} años.`,
    lista: (xs: string[]) => xs.join(", ") + ".",
  },
  en: {
    cancelacion: "Can I cancel free of charge?",
    duracion: "How long does it take?",
    duracionA: (d: string) => `It takes ${d}.`,
    punto: "Where is the meeting point?",
    puntoA: (t: string) => `At ${t}. The exact details come with your confirmation.`,
    idioma: "What language is it in?",
    idiomaA: (l: string) => `The guide speaks ${l}.`,
    ninos: "Can children join?",
    ninosA: (a: number, b: number) => `Yes. The child rate applies from ${a} to ${b} years old.`,
    lista: (xs: string[]) => xs.join(", ") + ".",
  },
};

const helpItem = (lang: "es" | "en", id: string) => faqTopics(lang).flatMap((t) => t.items).find((i) => i.id === id) ?? null;
const isFree = (f: FichaModel) => f.price !== null && f.price.amount <= 0 && f.booking.chargedBy === "none";

/** Preguntas de la ficha, en el orden fijo, solo con datos reales. */
// REQ-10822
export function faqFor(f: FichaModel): FichaFaq[] {
  const lang: "es" | "en" = f.lang === "es" ? "es" : "en";
  const c = COPY[lang];
  const facts = keyFactsRows(f.facts, f.lang);
  const fact = (id: string) => facts.find((r) => r.id === id)?.value ?? null;
  const out: FichaFaq[] = [];

  const cancel = cancellationSummary(f.cancellation?.hours, lang);
  if (cancel) out.push({ id: "cancelacion", q: c.cancelacion, a: cancel });

  const dur = fact("duracion");
  if (dur) out.push({ id: "duracion", q: c.duracion, a: c.duracionA(dur) });

  const meetingTitle = f.meeting.title?.trim();
  if (meetingTitle) out.push({ id: "punto-de-encuentro", q: c.punto, a: c.puntoA(meetingTitle) });

  const idioma = fact("idiomas");
  if (idioma) out.push({ id: "idioma", q: c.idioma, a: c.idiomaA(idioma) });

  const llevar = f.whatToBring.map((s) => s.trim()).filter(Boolean);
  const llevarHelp = helpItem(lang, "que-llevar");
  if (llevar.length && llevarHelp) out.push({ id: "que-llevar", q: llevarHelp.q, a: c.lista(llevar) });

  if (f.facts.ages && f.facts.ages.childTo >= f.facts.ages.childFrom) out.push({ id: "ninos", q: c.ninos, a: c.ninosA(f.facts.ages.childFrom, f.facts.ages.childTo) });

  if (f.price) {
    const h = helpItem(lang, isFree(f) ? "gratis" : "pago");
    if (h) out.push({ id: isFree(f) ? "gratis" : "pago", q: h.q, a: h.a });
  }

  const tarde = helpItem(lang, "no-llego");
  if (meetingTitle && tarde) out.push({ id: "llegar-tarde", q: tarde.q, a: tarde.a });

  return out;
}

/** ¿Hay suficientes preguntas para mostrar el bloque? (misma regla que `blocks.ts`). */
// REQ-10822
export function faqVisible(qs: FichaFaq[]): boolean {
  return qs.length >= FAQ_MIN;
}
