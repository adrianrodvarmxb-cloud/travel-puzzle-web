/**
 * REQ-10804 y REQ-10848 · Ficha única, ola 7, bloque 21 «Garantías y pie» (plan §3; decisión 49, REQ-10626: «Cada
 * experiencia muestra garantías específicas si las tiene y siempre dirige a términos y condiciones, donde cada proveedor
 * tiene su apartado con sus especificaciones»). Puro: sin I/O, sin banderas y sin reloj.
 *
 * Textos: los 4 de §L del dictamen del abogado (19-11-2026, punto 20), literales; free tour y excursión, los del
 * paquete del 17-11 (`claude/paquetes-revisores-2026-11-17.md`, bloque B), que ya no prometen ningún «100 %».
 * La versión en español es la vinculante (§J): salen en español en todos los idiomas hasta que el abogado firme sus
 * traducciones (ola 14), igual que la leyenda §K del bloque 16.
 *
 * Qué garantía sale (solo lo que el sistema sostiene hoy):
 * - Circuito o viaje de agencia (viajes propios en «experiencias», o tipo «circuito» cobrado por Travel Puzzle): §L circuito.
 * - Boletos y entradas cobrados por Travel Puzzle: §L boletos.
 * - Cualquier otra experiencia con precio cobrada por Travel Puzzle: §L tour con costo; si además es excursión de un día
 *   o visita guiada, también el texto de excursión del 17-11.
 * - Free tour (FREETOUR sin precio): el del 17-11, solo con `freetourGuarantees` (lo decide quien llama tras la revisión
 *   de cumplimiento de FREETOUR, REQ-10765); hasta entonces, solo el enlace a T&C.
 * - Lo que cobra un tercero (FREETOUR de pago, afiliados) o un traslado: sin garantía específica; nunca «te
 *   reembolsamos lo pagado a Travel Puzzle» si no se pagó a Travel Puzzle. El §L de afiliado va en la tarjeta de
 *   Kiwitaxi del bloque 19 (`cross-sell-view.ts`).
 * - Siempre: enlace a /terminos. El ancla del apartado de cada proveedor se pasa cuando exista (REQ-3345); sin ella,
 *   el enlace va a la página completa.
 */
import { LEGAL_PATHS } from "@/legal/lib/labels";
import { NO_SHOW_G } from "@/legal/lib/no-show";
import { TRIP_PROVIDER } from "../adapters/trip";
import { FREETOUR_PROVIDER } from "./blocks";
import type { FichaLang, FichaModel } from "./model";

/** §L del dictamen (19-11-2026, punto 20), literal. No se edita sin la firma del abogado. */
// REQ-10804
export const GUARANTEE_L = {
  tourConCosto: "Precio final a la vista en la moneda del operador, con su equivalente aproximado en pesos. Cancelación gratuita hasta 24/48 h antes según lo indicado en la ficha. Si el operador cancela la actividad, te reembolsamos el 100 % de lo pagado a Travel Puzzle.",
  boletos: "Tu boleto llega por correo electrónico con código de acceso. Si el operador no puede emitirlo por falta de disponibilidad, te reembolsamos el 100 % de lo pagado a Travel Puzzle.",
  circuito: "Cotización detallada sin cargos ocultos, respaldada por nuestro Contrato de Adhesión registrado ante PROFECO (núm. 6635-2023). Cambios y cancelaciones conforme a las condiciones del contrato.",
  afiliado: "Lo reservas y pagas directamente con Kiwitaxi bajo sus propias políticas y términos de cancelación; Travel Puzzle te brinda apoyo informativo para contactar al proveedor si surge alguna incidencia.",
} as const;

/** Paquete del 17-11 (bloque B), conservados por el dictamen para free tour y excursión. */
// REQ-10804
export const GUARANTEE_1711 = {
  freeTour: "Reservas gratis y cancelas sin costo hasta antes de empezar. Si el guía no puede dar el tour, te avisamos y te proponemos otra fecha.",
  excursion: "Punto de encuentro y hora confirmados por correo 48 h antes y el mismo día. Si necesitas algo antes, nos escribes por WhatsApp.",
} as const;

export type GuaranteeId = "tour-con-costo" | "boletos" | "circuito" | "free-tour" | "excursion";
export interface FichaGuarantee { id: GuaranteeId; text: string }

const EXCURSION_TIPOS = new Set(["excursion-dia", "excursion-de-un-dia", "visita-guiada"]);

/** Garantías específicas de la ficha, en orden; [] si no tiene. */
// REQ-10804
export function guaranteesFor(f: Pick<FichaModel, "provider" | "section" | "taxonomy" | "price" | "booking">, opts: { freetourGuarantees?: boolean } = {}): FichaGuarantee[] {
  const tipo = f.taxonomy.tipo?.slug ?? "";
  if (f.provider === FREETOUR_PROVIDER) {
    return opts.freetourGuarantees === true && f.price === null && f.booking.chargedBy === "none"
      ? [{ id: "free-tour", text: GUARANTEE_1711.freeTour }]
      : [];
  }
  if (f.section === "traslados" || f.booking.chargedBy !== "travelpuzzle") return [];
  if (f.provider === TRIP_PROVIDER || tipo === "circuito") return [{ id: "circuito", text: GUARANTEE_L.circuito }];
  if (tipo === "entradas") return [{ id: "boletos", text: GUARANTEE_L.boletos }];
  if (!f.price) return [];
  const out: FichaGuarantee[] = [{ id: "tour-con-costo", text: GUARANTEE_L.tourConCosto }];
  if (EXCURSION_TIPOS.has(tipo)) out.push({ id: "excursion", text: GUARANTEE_1711.excursion });
  return out;
}

/**
 * Cláusula de no-show §G (dictamen punto 12) en la ficha: solo en tours con costo cobrados por Travel Puzzle (los
 * que llevan la garantía §L «tour con costo»). Free tour, circuitos de agencia (su contrato), boletos, traslados y lo
 * que cobra un tercero no la llevan. null si no aplica.
 */
// REQ-10796
export function noShowFor(f: Pick<FichaModel, "provider" | "section" | "taxonomy" | "price" | "booking">): string | null {
  return guaranteesFor(f).some((g) => g.id === "tour-con-costo") ? NO_SHOW_G : null;
}

const COPY = {
  es: { heading: "Garantías", terms: "Consulta los Términos y condiciones de este servicio", noShow: "Inasistencia (no-show) y puntualidad" },
  en: { heading: "Guarantees", terms: "See the Terms and conditions for this service", noShow: "No-show and punctuality" },
};

export interface GuaranteesNoShowView { heading: string; text: string }
export interface GuaranteesBlockView { heading: string; items: FichaGuarantee[]; noShow?: GuaranteesNoShowView | null; termsHref: string; termsLabel: string }

/** Bloque 21: garantías específicas (si hay) y, siempre, el enlace a T&C (con el ancla del proveedor si existe). */
// REQ-10848 REQ-10804 REQ-10796
export function guaranteesBlockView(
  f: Pick<FichaModel, "provider" | "section" | "taxonomy" | "price" | "booking" | "lang">,
  opts: { freetourGuarantees?: boolean; providerAnchor?: string | null } = {},
): GuaranteesBlockView {
  const c = (f.lang as FichaLang) === "es" ? COPY.es : COPY.en;
  const anchor = (opts.providerAnchor ?? "").replace(/[^a-z0-9-]/gi, "");
  const noShow = noShowFor(f);
  return { heading: c.heading, items: guaranteesFor(f, opts), noShow: noShow ? { heading: c.noShow, text: noShow } : null, termsHref: anchor ? `${LEGAL_PATHS.terms}#${anchor}` : LEGAL_PATHS.terms, termsLabel: c.terms };
}
