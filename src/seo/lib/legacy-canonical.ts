/**
 * REQ-579: canonical de /tours/{id}. Con PRIMERA_PIEZA_ENABLED el middleware la manda con 301 a su ficha de
 * /destinos; la página ya no se declara canonical a sí misma sino a ese destino final. Puro.
 */
import { allTours, type CountryNode } from "@/destinations/lib/catalog";

// REQ-579
export function legacyTourCanonical(tree: CountryNode[] | null, id: string): string {
  for (const c of tree ?? []) for (const ci of c.cities) { const hit = allTours(ci).find((x) => x.id === id && x.kind !== "own"); if (hit) return hit.href; }
  return `/tours/${id}`;
}
