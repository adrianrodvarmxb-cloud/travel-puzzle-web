import type { OctoProduct } from "./schemas";
import { chooseCurrency, fromPrice, isFullyPriced } from "./pricing";

/**
 * Ola 2: liga el catálogo OCTO de Big Bus con las 29 ciudades ya cargadas (imports/bigbus-2026.json).
 * Solo existe para Travel Puzzle lo que la API devuelve: Big Bus solo entrega por API lo que deja revender,
 * así que lo que no venga es exclusivo de su web (regla de Rositsa, REQ-1607) y no se vende directo.
 */

export type CityKeywords = Record<string, string[]>;

/** Minúsculas, sin acentos y con espacios simples, para comparar nombres. */
export function normalizeName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Ciudad del producto por su nombre interno o referencia. Null si no coincide ninguna o coincide más de una. */
// REQ-3413
export function matchCity(product: Pick<OctoProduct, "internalName" | "reference">, map: CityKeywords): string | null {
  const text = ` ${normalizeName(`${product.internalName} ${product.reference ?? ""}`)} `;
  const hits = Object.entries(map)
    .filter(([ref]) => !ref.startsWith("_"))
    .filter(([, words]) => words.some((w) => text.includes(` ${normalizeName(w)} `)))
    .map(([ref]) => ref);
  return hits.length === 1 ? hits[0] : null;
}

export interface PlanOption {
  optionId: string;
  name: string;
  from: { amount: number; currency: string } | null;
  units: { id: string; type: string; name: string; minAge: number | null; maxAge: number | null }[];
}

export interface PlanProduct {
  productId: string;
  name: string;
  availabilityType: string;
  /** REQ-3436: moneda en que se piden precio y disponibilidad a la API. */
  currency: string | null;
  options: PlanOption[];
}

export interface CityPlan {
  ref: string;
  products: PlanProduct[];
  from: { amount: number; currency: string } | null;
}

export interface CatalogPlan {
  generatedAt: string;
  cities: CityPlan[];
  /** Ciudades cargadas sin producto en la API: no se venden directo (siguen en modo solicitud o se ocultan, decide el PO). */
  notResold: string[];
  unmatched: { productId: string; name: string }[];
  /** Sin precio en todas sus unidades: Ventrata no permite venderlos. */
  unpriced: { productId: string; name: string }[];
}

function toPlanProduct(p: OctoProduct): PlanProduct {
  const currency = chooseCurrency(p);
  return {
    productId: p.id,
    name: p.internalName,
    availabilityType: p.availabilityType,
    currency,
    options: p.options.map((o) => {
      const single = { ...p, options: [o] };
      return {
        optionId: o.id,
        name: o.internalName,
        from: fromPrice(single, currency) ?? fromPrice(single),
        units: o.units.map((u) => ({
          id: u.id,
          type: u.type,
          name: u.internalName,
          minAge: (u.restrictions.minAge as number | null | undefined) ?? null,
          maxAge: (u.restrictions.maxAge as number | null | undefined) ?? null,
        })),
      };
    }),
  };
}

/** Plan del catálogo: qué producto va con qué ciudad. Sin `net` (el plan puede llegar a la ficha). */
// REQ-3414
export function buildCatalogPlan(products: OctoProduct[], cityRefs: string[], map: CityKeywords, now: Date): CatalogPlan {
  const byCity = new Map<string, PlanProduct[]>();
  const unmatched: CatalogPlan["unmatched"] = [];
  const unpriced: CatalogPlan["unpriced"] = [];
  const known = new Set(cityRefs);
  for (const p of products) {
    if (!isFullyPriced(p)) {
      unpriced.push({ productId: p.id, name: p.internalName });
      continue;
    }
    const ref = matchCity(p, map);
    if (!ref || !known.has(ref)) {
      unmatched.push({ productId: p.id, name: p.internalName });
      continue;
    }
    byCity.set(ref, [...(byCity.get(ref) ?? []), toPlanProduct(p)]);
  }
  const cities: CityPlan[] = [...byCity.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ref, prods]) => {
      const prices = prods.flatMap((x) => x.options.map((o) => o.from)).filter((f): f is NonNullable<typeof f> => !!f);
      const cur = prices[0]?.currency;
      const same = prices.filter((f) => f.currency === cur);
      const from = same.length ? same.reduce((m, f) => (f.amount < m.amount ? f : m)) : null;
      return { ref, products: prods, from };
    });
  return {
    generatedAt: now.toISOString(),
    cities,
    notResold: cityRefs.filter((r) => !byCity.has(r)).sort(),
    unmatched,
    unpriced,
  };
}
