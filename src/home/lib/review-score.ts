/**
 * REQ-450: medidor de reseñas de los carruseles del home (puro).
 *
 * Calificación bayesiana (promedio ponderado por número de reseñas con un prior del catálogo):
 *   puntaje = (v · R + m · C) / (v + m)
 *   R = calificación del producto, v = número de reseñas reales,
 *   C = calificación promedio del catálogo ponderada por reseñas (se calcula en cada carga),
 *   m = 50 reseñas: peso del prior. Es el mismo mínimo de reseñas de la insignia «Favorito» firmada
 *       (REQ-098: ≥ 4.7 y ≥ 50). Con 50 reseñas un producto pesa igual que el catálogo; con 5,000, casi solo su nota.
 * Documento: docs/gates-carruseles-home-2026-11.md.
 */

export const REVIEW_PRIOR_M = 50;
/** C de respaldo si el catálogo no da un promedio válido (base caída o datos malos). */
export const REVIEW_PRIOR_C_FALLBACK = 4.5;

export interface Prior { m: number; C: number }
export interface Rated { rating: number | null; reviews: number }

// REQ-450 (REQ-100): solo reseñas reales — al menos una y calificación entre 1 y 5.
export function hasRealReviews(x: Rated): boolean {
  return Number.isInteger(x.reviews) && x.reviews >= 1 && x.rating !== null && Number.isFinite(x.rating) && x.rating >= 1 && x.rating <= 5;
}

// REQ-450
export function bayesScore(rating: number, reviews: number, { m, C }: Prior): number {
  return (reviews * rating + m * C) / (reviews + m);
}

/** REQ-450: C = Σ(R·v) / Σv del catálogo; fuera de [1, 5] o sin reseñas, el respaldo. */
export function catalogPrior(weightedSum: number, reviews: number): number {
  const c = reviews > 0 ? weightedSum / reviews : NaN;
  return Number.isFinite(c) && c >= 1 && c <= 5 ? c : REVIEW_PRIOR_C_FALLBACK;
}

const byScoreThenReviewsThenKey = <T extends Rated & { key: string }>(a: { t: T; s: number }, b: { t: T; s: number }) =>
  b.s - a.s || b.t.reviews - a.t.reviews || (a.t.key < b.t.key ? -1 : a.t.key > b.t.key ? 1 : 0);

/** REQ-450: descarta lo que no tiene reseñas reales y ordena por puntaje (desempate: más reseñas, luego la llave). */
export function rankByReviews<T extends Rated & { key: string }>(items: readonly T[], prior: Prior): T[] {
  return items
    .filter(hasRealReviews)
    .map((t) => ({ t, s: bayesScore(t.rating as number, t.reviews, prior) }))
    .sort(byScoreThenReviewsThenKey)
    .map((x) => x.t);
}

/**
 * REQ-10515 (PO 13-11 16:00, opción A «sin reseñas entran»): el puntaje de cualquier producto. Sin reseñas reales
 * (0 reseñas, sin calificación o dato fuera de 1–5) es la misma fórmula con v = 0, es decir C, el promedio del catálogo:
 * ni premio ni castigo. Con reseñas buenas sube; con malas baja.
 */
// REQ-10515
export function priorScore(x: Rated, prior: Prior): number {
  return hasRealReviews(x) ? bayesScore(x.rating as number, x.reviews, prior) : bayesScore(0, 0, prior);
}

/** REQ-10515: ordena a TODOS (con y sin reseñas) por `priorScore`; desempate determinista: más reseñas, luego la llave. */
// REQ-10515
export function rankWithPrior<T extends Rated & { key: string }>(items: readonly T[], prior: Prior): T[] {
  return items
    .map((t) => ({ t, s: priorScore(t, prior) }))
    .sort(byScoreThenReviewsThenKey)
    .map((x) => x.t);
}

export interface Cap<T> { of: (t: T) => string; max: number }

/**
 * REQ-450: diversidad en las primeras posiciones. Recorre la lista ya ordenada y toma lo que respeta todos los topes;
 * si no alcanza para `n`, relaja los topes del último al primero (p. ej. primero el formato, luego la ciudad)
 * y completa en el mismo orden. Nunca deja huecos ni repite.
 */
export function diversify<T>(sorted: readonly T[], n: number, caps: readonly Cap<T>[]): T[] {
  const out: T[] = [];
  const used = new Set<number>();
  for (let active = caps.length; active >= 0 && out.length < n; active--) {
    const counts = caps.slice(0, active).map((cap) => {
      const m = new Map<string, number>();
      for (const t of out) m.set(cap.of(t), (m.get(cap.of(t)) ?? 0) + 1);
      return m;
    });
    sorted.forEach((t, i) => {
      if (out.length >= n || used.has(i)) return;
      const ok = caps.slice(0, active).every((cap, j) => (counts[j].get(cap.of(t)) ?? 0) < cap.max);
      if (!ok) return;
      caps.slice(0, active).forEach((cap, j) => counts[j].set(cap.of(t), (counts[j].get(cap.of(t)) ?? 0) + 1));
      used.add(i);
      out.push(t);
    });
  }
  return out;
}

/**
 * REQ-10516: garantía de presencia en la primera página. Si un grupo (proveedor) con candidatos en `pool` no quedó en
 * `head`, sale la última tarjeta del grupo más repetido (solo si ese grupo conserva al menos una) y entra, al final,
 * la mejor del grupo que faltaba. Determinista; no cambia el tamaño de la página ni repite.
 */
// REQ-10516
export function ensureEachGroup<T>(head: readonly T[], pool: readonly T[], of: (t: T) => string): T[] {
  const out = [...head];
  if (!out.length) return out;
  const inHead = new Set(out);
  const missing = [...new Set(pool.map(of))].filter((g) => !out.some((t) => of(t) === g));
  for (const g of missing) {
    const candidate = pool.find((t) => of(t) === g && !inHead.has(t));
    if (!candidate) continue;
    const counts = new Map<string, number>();
    for (const t of out) counts.set(of(t), (counts.get(of(t)) ?? 0) + 1);
    const biggest = [...counts.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (biggest === undefined) break;
    let victim = -1;
    for (let i = out.length - 1; i >= 0; i--) if (of(out[i]) === biggest) { victim = i; break; }
    inHead.delete(out[victim]);
    out.splice(victim, 1);
    out.push(candidate);
    inHead.add(candidate);
  }
  return out;
}
