/** REQ-1359: llaves de las versiones anteriores (v-1, v-2…) de una llave versionada, para servir la copia anterior. Puro. */
import { cacheKey } from "./shared-cache";

// REQ-1359
export function previousVersionKeys(prefix: string, parts: Record<string, unknown> & { v: string | number }, n = 2): string[] {
  const v = Number(parts.v);
  if (!Number.isInteger(v)) return [];
  return Array.from({ length: n }, (_, i) => v - 1 - i).filter((x) => x >= 1).map((x) => cacheKey(prefix, { ...parts, v: String(x) }));
}
