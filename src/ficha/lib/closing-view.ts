/**
 * REQ-10839, REQ-10840, REQ-10841 (y REQ-10803) · Ficha única, ola 7, bloques 16 «Preguntas frecuentes», 17 «Mila» y
 * 18 «Reseñas» (plan §3). Puro: sin I/O, sin banderas y sin reloj; la visibilidad de cada bloque la decide
 * `blocks.ts` (FAQ_MIN, `milaEnabled`, `freetourFaqEnabled`) y aquí solo se arma lo que cada bloque pinta.
 * - 16: las preguntas de `faq.ts` (mismo dato que «Datos clave» y el voucher) y, al cierre, la leyenda §K literal del
 *   dictamen del abogado (19-11-2026, punto 19; arts. 32 y 42 LFPC). La versión en español es la vinculante (§J), así
 *   que la leyenda sale en español en todos los idiomas hasta que el abogado firme sus traducciones (ola 14).
 * - 17: acceso a Mila por WhatsApp con el contexto de la ficha (decisión 41, `whatsapp-context.ts`) y el aviso de que
 *   es una asistente con IA. Apagada en FREETOUR (decisión 42, regla B3): null.
 * - 18: reseñas filtradas por proveedor (solo las del mismo proveedor de la ficha) y las propias de Travel Puzzle, que
 *   ya llegan moderadas (aprobadas); fuera las que nombran la plataforma (REQ-171). Proveedor con nota oculta
 *   (decisión 18, Tangol): sin conteo y solo las propias.
 */
import type { ReviewView } from "@/reviews/load";
import { withoutPlatformMentions } from "@/reviews/lib/platform-mention";
import { FREETOUR_PROVIDER } from "./blocks";
import { faqFor, faqVisible, type FichaFaq } from "./faq";
import type { FichaLang, FichaModel } from "./model";
import type { FichaPrefill } from "./prefill";
import { showsProviderRating } from "./rating-visibility";
import { whatsappLink } from "./whatsapp-context";

/** §K del dictamen del abogado (19-11-2026), literal. No se edita sin su firma. */
// REQ-10803
export const FAQ_LEGEND_K =
  "La información aquí resumida tiene carácter orientativo; las condiciones exactas, horarios definitivos y reglas de cancelación aplicables a su reserva son los establecidos en la ficha específica del servicio, en su confirmación y en nuestros Términos y Condiciones.";

const COPY = {
  es: {
    preguntas: "Preguntas frecuentes",
    mila: "¿Te quedó alguna duda?",
    milaBody: "Escríbele a Mila, nuestra asistente con inteligencia artificial, por WhatsApp. El mensaje ya lleva el código de esta experiencia.",
    milaCta: "Escribir a Mila",
    resenas: "Reseñas",
    total: (n: number) => `${n} ${n === 1 ? "reseña" : "reseñas"}`,
  },
  en: {
    preguntas: "Frequently asked questions",
    mila: "Any questions left?",
    milaBody: "Message Mila, our AI assistant, on WhatsApp. The message already includes this experience's code.",
    milaCta: "Message Mila",
    resenas: "Reviews",
    total: (n: number) => `${n} ${n === 1 ? "review" : "reviews"}`,
  },
};
const copy = (lang: FichaLang) => (lang === "es" ? COPY.es : COPY.en);

export interface FaqBlockView { heading: string; items: FichaFaq[]; legend: string }

/** Bloque 16: preguntas y leyenda §K al cierre; null si no hay suficientes preguntas. */
// REQ-10839 REQ-10803
export function faqBlockView(f: FichaModel): FaqBlockView | null {
  const items = faqFor(f);
  if (!faqVisible(items)) return null;
  return { heading: copy(f.lang).preguntas, items, legend: FAQ_LEGEND_K };
}

export interface MilaBlockView { heading: string; body: string; cta: string; href: string }

/** Bloque 17: liga a Mila con el contexto de la ficha; null en FREETOUR o sin número configurado. */
// REQ-10840
export function milaBlockView(f: FichaModel, number: string | null | undefined, prefill: FichaPrefill): MilaBlockView | null {
  if (f.provider === FREETOUR_PROVIDER) return null;
  const href = whatsappLink(number, f, prefill);
  if (!href) return null;
  const c = copy(f.lang);
  return { heading: c.mila, body: c.milaBody, cta: c.milaCta, href };
}

/** Reseña con el proveedor de donde viene (las propias de Travel Puzzle llevan `verified`). */
export type FichaReviewInput = ReviewView & { provider?: string | null };

export interface ReviewsBlockView { heading: string; totalText: string | null; items: ReviewView[] }

const strip = ({ provider: _p, ...r }: FichaReviewInput): ReviewView => r;

/** Bloque 18: reseñas del mismo proveedor y las propias; null si no queda ninguna. */
// REQ-10841
export function reviewsBlockView(f: Pick<FichaModel, "provider" | "lang">, reviews: FichaReviewInput[], total: number): ReviewsBlockView | null {
  const provider = f.provider.trim().toLowerCase();
  const showsProvider = showsProviderRating(provider);
  const kept = reviews.filter((r) => r.verified === true || (showsProvider && (r.provider ?? "").trim().toLowerCase() === provider));
  const items = withoutPlatformMentions(kept.map(strip));
  if (!items.length) return null;
  const c = copy(f.lang);
  const n = Math.max(Number.isFinite(total) ? Math.trunc(total) : 0, items.length);
  return { heading: c.resenas, totalText: showsProvider ? c.total(n) : null, items };
}
