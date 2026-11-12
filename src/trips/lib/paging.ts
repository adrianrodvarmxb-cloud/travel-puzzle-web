// REQ-3501 (gate E): los viajes de agencias en /tours se muestran por partes, como los referentes.
export const PAGE_STEP = 24;

export function visibleSlice<T>(list: T[], shown: number): T[] {
  return list.slice(0, shown);
}

export function nextVisible(shown: number, total: number): number {
  return Math.min(shown + PAGE_STEP, total);
}

export function hasMore(shown: number, total: number): boolean {
  return total > shown;
}
