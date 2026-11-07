/**
 * Normalización y palabras clave del clasificador. Misma semántica que el ensayo del plan
 * (scratchpad taxo-ensayo/clasificar.py): minúsculas, sin acentos y solo ASCII; `\b` al inicio de cada palabra;
 * `*` al final = prefijo, si no, `\b` al final. Puro.
 */

export function norm(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\x00-\x7f]/g, "");
}

const cache = new Map<string, RegExp>();

/** Compila una lista de palabras (fragmentos de regex) a una sola expresión. Lista vacía = nunca coincide. */
export function keywordRegex(words: readonly string[]): RegExp | null {
  if (words.length === 0) return null;
  const key = words.join("\u0000");
  let rx = cache.get(key);
  if (!rx) {
    const alts = words.map((w) => (w.endsWith("*") ? w.slice(0, -1) : `${w}\\b`));
    rx = new RegExp(`\\b(${alts.join("|")})`, "i");
    cache.set(key, rx);
  }
  return rx;
}

export function matches(words: readonly string[] | undefined, normalizedText: string): boolean {
  const rx = keywordRegex(words ?? []);
  return rx !== null && rx.test(normalizedText);
}

/** Quita frases excluidas (p. ej. «game of thrones») antes de buscar las palabras de un tema. */
export function without(normalizedText: string, phrases: readonly string[] | undefined): string {
  let out = normalizedText;
  for (const p of phrases ?? []) {
    const rx = keywordRegex([p]);
    if (rx) out = out.replace(new RegExp(rx.source, "gi"), " ");
  }
  return out;
}
