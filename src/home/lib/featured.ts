/** Favoritos variados: sin repetir ciudad y alternando continentes (el mejor de cada uno primero). */
import { continentOf } from "./continents";

export function pickVaried<T extends { cityId: number; countryCode: string; reviews: number }>(tours: T[], n: number): T[] {
  const sorted = [...tours].sort((a, b) => b.reviews - a.reviews);
  const groups = new Map<string, T[]>();
  for (const t of sorted) {
    const key = continentOf(t.countryCode) ?? "otro";
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }
  const queues = [...groups.values()];
  const out: T[] = [];
  const cities = new Set<number>();
  while (out.length < n && queues.some((q) => q.length)) {
    for (const q of queues) {
      while (q.length && cities.has(q[0].cityId)) q.shift();
      const next = q.shift();
      if (!next) continue;
      cities.add(next.cityId);
      out.push(next);
      if (out.length === n) break;
    }
  }
  return out;
}
