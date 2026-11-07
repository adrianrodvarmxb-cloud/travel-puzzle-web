/**
 * Carruseles del inicio completos y por páginas (PO, 6 nov 2026, 22:05: «solo muestra 6 experiencias, debe mostrar
 * todo»). Puro: decide qué entra, en qué orden y qué va en cada página; load.ts lee la base y el endpoint pagina.
 *
 * - «Los más elegidos»: TODOS los Favoritos (regla única de src/tours/lib/favorite.ts) en el orden del medidor de
 *   reseñas con la diversidad de REQ-450. El orden es el mismo de antes: las primeras posiciones no cambian.
 * - «Excursiones de un día»: TODAS las excursiones; la primera página es la de REQ-453 (con sus lugares para
 *   proveedores sin reseñas) y después el resto en el mismo orden. Nada se repite entre los dos carruseles.
 * - Nada con la marca del proveedor en el título (REQ-219): las filas de tours ya llegan filtradas y aquí se filtran
 *   los viajes.
 */
import { pickDayTrips, pickMostChosen, type RankCandidate } from "./carousels";
import { mentionsProviderBrand } from "./brand";
import type { Prior } from "./review-score";
import { isTravelerFavorite } from "@/tours/lib/favorite";

/** Lo que pinta el servidor en el primer render y el tamaño de cada página siguiente. */
export const HOME_FIRST_PAGE = 12;
export const HOME_PAGE_SIZE = 12;

export const HOME_CAROUSELS = ["elegidos", "excursiones"] as const;
export type HomeCarouselId = (typeof HOME_CAROUSELS)[number];

type WithTitle = { title?: string | null };

// REQ-850
export function orderMostChosen<T extends RankCandidate>(items: readonly T[], prior: Prior): T[] {
  const favorites = items.filter((t) => isTravelerFavorite({ rating: t.rating, reviews: t.reviews }));
  return pickMostChosen(favorites, prior, Number.POSITIVE_INFINITY);
}

// REQ-852
export function orderDayTrips<T extends RankCandidate>(items: readonly T[], prior: Prior, exclude: ReadonlySet<string> = new Set()): T[] {
  const pool = items.filter((t) => !exclude.has(t.key));
  const head = pickDayTrips(pool, prior, HOME_FIRST_PAGE);
  const inHead = new Set(head.map((t) => t.key));
  const all = pickDayTrips(pool, prior, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
  return [...head, ...all.filter((t) => !inHead.has(t.key))];
}

/** REQ-850, REQ-852, REQ-853: los dos carruseles completos a partir de las candidatas (tours ya validados + viajes). */
export function carouselOrder<T extends RankCandidate, V extends RankCandidate & WithTitle>(o: { tours: readonly T[]; dayTours: readonly T[]; trips: readonly V[]; prior: Prior }): { elegidos: (T | V)[]; excursiones: (T | V)[] } {
  const trips = o.trips.filter((t) => !mentionsProviderBrand(t.title)); // REQ-219
  const elegidos = orderMostChosen<T | V>([...o.tours, ...trips], o.prior);
  const excursiones = orderDayTrips<T | V>([...o.dayTours, ...trips], o.prior, new Set(elegidos.map((x) => x.key)));
  return { elegidos, excursiones };
}

// REQ-851
export function carouselPage<T>(ordered: readonly T[], page: number): { items: T[]; hasMore: boolean; total: number } {
  const p = Number.isInteger(page) && page >= 1 ? page : 1;
  const start = p === 1 ? 0 : HOME_FIRST_PAGE + (p - 2) * HOME_PAGE_SIZE;
  const end = p === 1 ? HOME_FIRST_PAGE : start + HOME_PAGE_SIZE;
  return { items: ordered.slice(start, end), hasMore: end < ordered.length, total: ordered.length };
}

/** REQ-856: parámetros del endpoint (?c=elegidos|excursiones&p=2&lang=es); lo inválido da null (400). */
export function parseCarouselQuery(q: URLSearchParams): { c: HomeCarouselId; p: number; lang: string } | null {
  const c = q.get("c");
  const p = Number(q.get("p"));
  const lang = q.get("lang") ?? "es";
  if (!(HOME_CAROUSELS as readonly string[]).includes(c ?? "")) return null;
  if (!Number.isInteger(p) || p < 2 || p > 200) return null;
  if (!/^(es|en|pt|de|fr|it)$/.test(lang)) return null;
  return { c: c as HomeCarouselId, p, lang };
}

/** REQ-854: a dónde lleva «Ver todas las experiencias →» al final de cada carrusel. */
export const SEE_ALL_HREF: Record<HomeCarouselId, string> = {
  elegidos: "/tours",
  excursiones: "/tours?tipo_act=excursiones",
};
