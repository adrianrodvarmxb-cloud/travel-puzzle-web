/** Calificación con un decimal ("4.9"); null si no hay. */
export function formatRating(value: number | string | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n.toFixed(1) : null;
}

/** Separador de miles fijo por idioma: no depende del ICU del navegador ni del servidor (INC-001). */
const THOUSANDS: Record<string, string> = { es: ",", en: ",", pt: ".", de: ".", it: ".", fr: "\u202f" };

// REQ-173: número con separador de miles según idioma ("8,054" / "8.054"), sin Intl: mismo texto en servidor y cliente.
export function formatCount(n: number, lang: string): string {
  const v = Number.isFinite(n) ? Math.trunc(n) : 0;
  const digits = String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS[lang] ?? ",");
  return v < 0 ? `-${digits}` : digits;
}
