/**
 * Una sola política de cancelación por ficha (decisión 34 del plan de la ficha única, REQ-10612; código REQ-10655).
 * Gate REQ-10654 (PO, 14 nov 2026): cuando el proveedor manda dos plazos distintos, la ficha muestra «el más
 * estricto»: el que pide más anticipación. Así nunca se promete al cliente más de lo que el proveedor da.
 * Pura: sin I/O, sin reloj; los textos van por idioma fijo (INC-001).
 */
export interface SingleCancellation {
  /** Horas de anticipación para cancelar sin cargo; null si no se conocen. */
  hours: number | null;
  /** Texto del proveedor, solo cuando no hay plazo en horas (nunca los dos a la vez). */
  text: string | null;
}

const UNIT_HOURS: [RegExp, number][] = [[/^(h|hs|hr|hrs|hora|horas)$/, 1], [/^(d|dia|dias|día|días)$/, 24]];

/** Plazo que dice el texto libre del proveedor («Gratis Hasta 48hs Antes», «Gratis Hasta 7 Días Antes»); null si no dice uno. */
// REQ-10655
export function hoursFromPolicyText(text: string | null | undefined): number | null {
  const m = /hasta\s+(\d{1,3})\s*([a-záéíóú]+)/i.exec(text ?? "");
  if (!m) return null;
  const unit = UNIT_HOURS.find(([re]) => re.test(m[2].toLowerCase()));
  const n = Number(m[1]);
  return unit && n > 0 ? n * unit[1] : null;
}

/** De los plazos del dato estructurado y del texto, el más estricto; si no hay ninguno, el texto tal cual. */
// REQ-10655
export function singleCancellation(i: { structuredHours: (number | null | undefined)[]; text: string | null | undefined }): SingleCancellation {
  const fromText = hoursFromPolicyText(i.text);
  const all = [...i.structuredHours, fromText].filter((h): h is number => typeof h === "number" && Number.isFinite(h) && h > 0);
  if (all.length) return { hours: Math.max(...all), text: null };
  return { hours: null, text: i.text?.trim() || null };
}

const SUMMARY = {
  es: { h: (n: number) => `Cancelación sin cargo hasta ${n} h antes de la salida.`, d: (n: number) => `Cancelación sin cargo hasta ${n} días antes de la salida.` },
  en: { h: (n: number) => `Free cancellation up to ${n} h before departure.`, d: (n: number) => `Free cancellation up to ${n} days before departure.` },
};

/** El mismo plazo, resumido junto al título; en días desde 72 h cuando es exacto. */
// REQ-10655
export function cancellationSummary(hours: number | null | undefined, lang: string): string | null {
  if (typeof hours !== "number" || !Number.isFinite(hours) || hours <= 0) return null;
  const t = lang === "es" ? SUMMARY.es : SUMMARY.en;
  return hours >= 72 && hours % 24 === 0 ? t.d(hours / 24) : t.h(hours);
}
