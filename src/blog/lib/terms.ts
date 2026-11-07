/**
 * REQ-970: canibalización de términos objetivo (estrategia-topic-cluster §2). Puro.
 * Dos términos chocan si, sin acentos, artículos ni plurales, comparten ≥ 75 % de sus palabras (Jaccard).
 */
export const TERM_SIMILARITY_MAX = 0.75;
const STOP = new Set(["a", "al", "de", "del", "el", "la", "las", "los", "en", "un", "una", "unos", "unas", "y", "o", "por", "para", "con"]);

// Plurales: consonante + «es» (ciudades, excursiones) y a/e/o o «r» + «s» (guiadas, tours); «París» no cambia.
const stem = (w: string) =>
  w.length > 4 && /[^aeiou]es$/.test(w) ? w.slice(0, -2) : w.length > 3 && /[aeor]s$/.test(w) ? w.slice(0, -1) : w;

// REQ-970
export function normalizeTerm(term: string): string[] {
  const words = term.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().split(/[^a-z0-9ñ]+/).filter(Boolean);
  return [...new Set(words.filter((w) => !STOP.has(w)).map(stem))];
}

// REQ-970
export function termSimilarity(a: string, b: string): number {
  const A = new Set(normalizeTerm(a));
  const B = new Set(normalizeTerm(b));
  if (!A.size || !B.size) return 0;
  const inter = [...A].filter((w) => B.has(w)).length;
  return inter / (A.size + B.size - inter);
}

// REQ-970: etiquetas de los términos que chocan con `term`.
export function termConflicts(term: string, others: { term: string; label: string }[], max = TERM_SIMILARITY_MAX): string[] {
  return others.filter((o) => termSimilarity(term, o.term) >= max).map((o) => o.label);
}
