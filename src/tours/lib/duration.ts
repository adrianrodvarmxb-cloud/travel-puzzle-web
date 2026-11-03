/** Duración de los tours: la API la manda como "H:MM"; aquí se pasa a minutos y se definen los rangos del filtro. Puras. */

/** "2:15" → 135. Vacío, sin ":" o minutos fuera de 0-59 → null. */
export function durationMinutes(value: string | null | undefined): number | null {
  const m = /^(\d{1,3}):(\d{1,2})$/.exec((value ?? "").trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (min > 59) return null;
  const total = h * 60 + min;
  return total > 0 ? total : null;
}

export const DURATION_RANGES = ["short", "mid", "long"] as const;
export type DurationRange = (typeof DURATION_RANGES)[number];

/** Rango de la URL (?duracion=short|mid|long); otro valor = sin filtro. */
export function parseDurationRange(value: string | null | undefined): DurationRange | null {
  return (DURATION_RANGES as readonly string[]).includes(value ?? "") ? (value as DurationRange) : null;
}

/** Condición sobre `durationMinutes`: hasta 2 h, de 2 a 4 h, más de 4 h. */
export function durationRangeWhere(range: DurationRange): { gt?: number; lte?: number } {
  if (range === "short") return { lte: 120 };
  if (range === "mid") return { gt: 120, lte: 240 };
  return { gt: 240 };
}

const LABELS: Record<"es" | "en", Record<DurationRange, string>> = {
  es: { short: "Hasta 2 h", mid: "2 a 4 h", long: "Más de 4 h" },
  en: { short: "Up to 2 h", mid: "2 to 4 h", long: "4 h +" },
};

export function durationLabel(range: DurationRange, lang: string): string {
  return LABELS[lang === "es" ? "es" : "en"][range];
}
