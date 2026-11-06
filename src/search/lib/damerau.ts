/**
 * REQ-281: distancia de Damerau-Levenshtein (variante OSA: la transposición de dos letras vecinas cuenta 1,
 * «rmoa» = «roma» + 1). Puro, por puntos de código (no por unidades UTF-16).
 */

// REQ-281
export function damerau(a: string, b: string): number {
  const s = [...a], t = [...b];
  const n = s.length, m = t.length;
  if (!n) return m;
  if (!m) return n;
  const d: number[][] = Array.from({ length: n + 1 }, (_, i) => { const r = new Array<number>(m + 1).fill(0); r[0] = i; return r; });
  for (let j = 0; j <= m; j++) d[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      let v = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && s[i - 1] === t[j - 2] && s[i - 2] === t[j - 1]) v = Math.min(v, d[i - 2][j - 2] + 1);
      d[i][j] = v;
    }
  }
  return d[n][m];
}

/**
 * REQ-281 (gate firmado 6 nov 2026): costo de la errata para decidir si se corrige. Un error en la primera letra
 * cuenta doble (como Meilisearch): casi nadie se equivoca en la inicial, y si cambia suele ser otro lugar.
 */
// REQ-281
export function typoCost(query: string, term: string): number {
  const d = damerau(query, term);
  if (!d) return 0;
  return d + (query.codePointAt(0) !== term.codePointAt(0) ? 1 : 0);
}
