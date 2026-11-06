/**
 * REQ-282: índice SymSpell (algoritmo de borrados simétricos, Wolf Garbe, MIT) para corregir nombres de destino.
 * Para cada término se guardan todas sus variantes con hasta `maxDistance` letras borradas; una consulta genera sus
 * propios borrados y los candidatos son los términos que comparten alguno. Cada candidato se verifica con
 * Damerau-Levenshtein. Puro. En memoria usa Map (rápido de armar); `serializeIndex` lo vuelve JSON determinista
 * para el índice curado que se genera en el build (src/scripts/search-index.ts).
 */
import { damerau } from "./damerau";

/** Prefijo que se indexa (SymSpell estándar): limita los borrados sin perder candidatos; Damerau verifica completo. */
export const PREFIX_LENGTH = 7;
const prefix = (w: string) => { const cs = [...w]; return cs.length > PREFIX_LENGTH ? cs.slice(0, PREFIX_LENGTH).join("") : w; };

export interface SymspellIndex {
  maxDistance: number;
  /** Términos ordenados (el índice guarda posiciones). */
  terms: string[];
  /** Borrado → posiciones de los términos que lo generan. */
  deletes: Map<string, number[]>;
}
/** Forma serializada (JSON): llaves en orden alfabético. */
export interface SymspellJson { v: 1; maxDistance: number; terms: string[]; deletes: Record<string, number[]> }

export interface SymspellCandidate { term: string; distance: number }

/** Todas las variantes con hasta `d` borrados, incluida la palabra misma (por punto de código). */
export function deletesOf(word: string, d: number): Set<string> {
  const out = new Set<string>([word]);
  const bmp = word.length === [...word].length; // sin pares sustitutos: se puede cortar por índice
  let frontier = [word];
  for (let k = 0; k < d; k++) {
    const next: string[] = [];
    for (const w of frontier) {
      if (bmp) {
        if (w.length <= 1) continue;
        for (let i = 0; i < w.length; i++) {
          const v = w.slice(0, i) + w.slice(i + 1);
          if (!out.has(v)) { out.add(v); next.push(v); }
        }
      } else {
        const cs = [...w];
        if (cs.length <= 1) continue;
        for (let i = 0; i < cs.length; i++) {
          const v = cs.slice(0, i).concat(cs.slice(i + 1)).join("");
          if (!out.has(v)) { out.add(v); next.push(v); }
        }
      }
    }
    frontier = next;
  }
  return out;
}

// REQ-282
export function buildSymspellIndex(terms: Iterable<string>, maxDistance = 2): SymspellIndex {
  const sorted = [...new Set([...terms].filter(Boolean))].sort();
  const deletes = new Map<string, number[]>();
  sorted.forEach((t, i) => {
    for (const del of deletesOf(prefix(t), maxDistance)) {
      const list = deletes.get(del);
      if (list) list.push(i); else deletes.set(del, [i]);
    }
  });
  return { maxDistance, terms: sorted, deletes };
}

// REQ-282
export function serializeIndex(index: SymspellIndex): SymspellJson {
  const deletes: Record<string, number[]> = {};
  for (const k of [...index.deletes.keys()].sort()) deletes[k] = index.deletes.get(k)!;
  return { v: 1, maxDistance: index.maxDistance, terms: index.terms, deletes };
}

// REQ-282
export function deserializeIndex(json: SymspellJson): SymspellIndex {
  return { maxDistance: json.maxDistance, terms: json.terms, deletes: new Map(Object.entries(json.deletes)) };
}

/** Términos a `maxDistance` o menos (Damerau), por distancia y luego en orden alfabético. */
// REQ-282
export function symspellCandidates(index: SymspellIndex, word: string, maxDistance: number): SymspellCandidate[] {
  if (!word) return [];
  const d = Math.min(maxDistance, index.maxDistance);
  const seen = new Set<number>();
  for (const del of deletesOf(prefix(word), d)) {
    const hit = index.deletes.get(del);
    if (hit) for (const i of hit) seen.add(i);
  }
  const out: SymspellCandidate[] = [];
  for (const i of seen) {
    const term = index.terms[i];
    const distance = damerau(word, term);
    if (distance <= d) out.push({ term, distance });
  }
  return out.sort((a, b) => a.distance - b.distance || (a.term < b.term ? -1 : a.term > b.term ? 1 : 0));
}
