/** REQ-1359: ¿una copia del árbol (de otra versión) tiene la forma que el código de hoy sabe pintar? Puro. */
import type { CityNode, CountryNode } from "./catalog";

const arr = (x: unknown) => Array.isArray(x);
const cityOk = (ci: Partial<CityNode> | null | undefined) =>
  !!ci && typeof ci.slug === "string" && typeof ci.href === "string" && !!ci.names &&
  arr(ci.freeTours) && arr(ci.paidTours) && arr(ci.ownTrips) && arr(ci.transportTrips) && arr(ci.onlineTours);

// REQ-1359
export function isDestinationTree(value: unknown): boolean {
  if (!arr(value) || !(value as unknown[]).length) return false;
  return (value as Partial<CountryNode>[]).every((c) =>
    !!c && typeof c.slug === "string" && typeof c.href === "string" && typeof c.name === "string" && !!c.names && arr(c.cities) && c.cities!.every(cityOk));
}
