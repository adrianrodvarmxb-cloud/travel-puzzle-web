/** REQ-255: minutos de lectura a 200 palabras por minuto, redondeo hacia arriba. Se calcula en el servidor. Puro. */
export const WORDS_PER_MINUTE = 200;

export function readingMinutes(words: number): number {
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}
