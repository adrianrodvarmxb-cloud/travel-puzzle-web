/**
 * Código de idioma de una reseña a partir del nombre que manda el proveedor. Puro y sin zod, para que la etiqueta
 * «Favorito de los viajeros» (cliente) no arrastre el esquema de reseñas (REQ-10865). `reviews.ts` lo re-exporta.
 */
const LANGUAGE_CODES: Record<string, string> = {
  English: "en", Spanish: "es", Portuguese: "pt", German: "de", French: "fr", Italian: "it",
};

export function languageCode(name: string): string | null {
  return LANGUAGE_CODES[name] ?? null;
}
