/**
 * REQ-10831, REQ-10832, REQ-10833 · Ficha única, ola 7, bloques 13 «Antes de ir» (qué llevar y requisitos), 14
 * «Condiciones» (una sola cancelación, decisión 34 / REQ-10612, y «Cómo funciona tu reserva» con el plazo único de
 * 48 horas hábiles, decisión 33 / REQ-10611) y 15 «Información importante» (notas del proveedor y la línea discreta
 * «Opera en destino: …», decisión 38 / REQ-10615, igual para todos). Sin dato, la parte no sale; nunca «N/D». Puro:
 * los pasos de la reserva llegan por parámetro (dependen de una bandera que la vista no lee).
 */
import type { FichaCancellation, FichaLang } from "./model";
import { cancellationSummary } from "./cancellation";
import { withoutOperatorNotes } from "./operator";

const clean = (items: string[]) => [...new Set(items.map((s) => s.trim()).filter(Boolean))];

export interface BeforeYouGoView { bring: string[]; requirements: string[] }

/** Bloque 13: qué llevar y requisitos, sin vacíos ni repetidos; null si no hay nada. */
// REQ-10831
export function beforeYouGoView(whatToBring: string[], requirements: string[]): BeforeYouGoView | null {
  const bring = clean(whatToBring);
  const req = clean(requirements);
  return bring.length || req.length ? { bring, requirements: req } : null;
}

export interface ConditionsView { cancellation: string | null; howTitle: string; howSteps: string[] }

/**
 * Bloque 14: la única política (en horas, resumida; si no hay plazo, el texto del proveedor) y «Cómo funciona tu
 * reserva» con los pasos que arma `bookingSteps` (el plazo único sale de `payment-copy.ts`). Siempre sale.
 */
// REQ-10832
export function conditionsView(c: FichaCancellation | null, lang: FichaLang, how: { title: string; steps: string[] }): ConditionsView {
  const cancellation = cancellationSummary(c?.hours, lang) ?? (c?.text?.trim() || null);
  return { cancellation, howTitle: how.title, howSteps: clean(how.steps) };
}

export interface ImportantInfoView { notes: string[]; operatorLine: string | null }

/** Bloque 15: notas del proveedor y «Opera en destino: X» (el modelo ya trae `operator` null cuando no se muestra). */
// REQ-10833
export function importantInfoView(notes: string[], operator: string | null, lang: FichaLang): ImportantInfoView | null {
  const n = clean(withoutOperatorNotes(notes)); // REQ-10895: el operador solo en la línea discreta
  const op = operator?.trim() || null;
  if (!n.length && !op) return null;
  return { notes: n, operatorLine: op ? `${OPERATES[lang] ?? OPERATES.es}: ${op}` : null };
}

const OPERATES: Record<FichaLang, string> = { es: "Opera en destino", en: "Operated locally by", pt: "Opera no destino", fr: "Opéré sur place par", de: "Vor Ort durchgeführt von", it: "Operato a destinazione da" };

type Key = "antesDeIr" | "queLlevar" | "requisitos" | "condiciones" | "cancelacion" | "informacion";
const TEXT: Record<Key, Record<FichaLang, string>> = {
  antesDeIr: { es: "Antes de ir", en: "Before you go", pt: "Antes de ir", fr: "Avant de partir", de: "Bevor du losgehst", it: "Prima di partire" },
  queLlevar: { es: "Qué llevar", en: "What to bring", pt: "O que levar", fr: "À emporter", de: "Was du mitbringen solltest", it: "Cosa portare" },
  requisitos: { es: "Requisitos", en: "Requirements", pt: "Requisitos", fr: "Conditions requises", de: "Voraussetzungen", it: "Requisiti" },
  condiciones: { es: "Condiciones", en: "Conditions", pt: "Condições", fr: "Conditions", de: "Bedingungen", it: "Condizioni" },
  cancelacion: { es: "Cancelación", en: "Cancellation", pt: "Cancelamento", fr: "Annulation", de: "Stornierung", it: "Cancellazione" },
  informacion: { es: "Información importante", en: "Important information", pt: "Informações importantes", fr: "Informations importantes", de: "Wichtige Informationen", it: "Informazioni importanti" },
};

/** Títulos de los bloques 13–15 en el idioma del sitio. */
// REQ-10831 REQ-10832 REQ-10833
export const conditionsText = (key: Key, lang: FichaLang): string => TEXT[key][lang] ?? TEXT[key].es;
