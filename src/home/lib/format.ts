/** Calificación con un decimal ("4.9"); null si no hay. */
export function formatRating(value: number | string | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n.toFixed(1) : null;
}

/** Número con separador de miles según idioma ("7,988" / "7.988"). */
export function formatCount(n: number, lang: string): string {
  return new Intl.NumberFormat(lang === "en" ? "en-US" : lang === "es" ? "es-MX" : lang).format(n);
}
