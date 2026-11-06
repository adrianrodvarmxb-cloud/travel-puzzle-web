/**
 * REQ-281 (gate firmado 6 nov 2026): erratas permitidas según la longitud de lo escrito.
 * 0 por debajo de 4 letras, 1 de 4 a 7, 2 desde 8. Puro.
 */

/** Letras y números (sin espacios ni signos), por punto de código. */
// REQ-281
export const letterCount = (s: string): number => [...s].filter((c) => /[\p{L}\p{N}]/u.test(c)).length;

// REQ-281
export function thresholdByLength(letters: number): 0 | 1 | 2 {
  if (letters < 4) return 0;
  if (letters < 8) return 1;
  return 2;
}

/** Distancia máxima que se indexa (la del umbral más alto). */
export const MAX_TYPOS = 2;
