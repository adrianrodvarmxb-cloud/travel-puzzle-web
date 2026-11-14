/**
 * Carruseles del inicio completos y por páginas (PO, 6 nov 2026, 22:05: «solo muestra 6 experiencias, debe mostrar
 * todo»). Puro: decide qué entra, en qué orden y qué va en cada página; load.ts lee la base y el endpoint pagina.
 *
 * - «Los más elegidos»: primero TODOS los Favoritos (regla única de src/tours/lib/favorite.ts) en el orden del medidor
 *   de reseñas con la diversidad de REQ-450; después (REQ-10515, PO 13-11 16:00) el resto por puntaje, donde lo que no
 *   tiene reseñas vale C (el promedio del catálogo). La primera página lleva tope por proveedor (REQ-10516): ningún
 *   proveedor ocupa más de 8 de 12 y todos los que tienen candidatos aparecen; las siguientes siguen por puntaje.
 * - «Excursiones de un día»: TODAS las excursiones por el mismo puntaje (con y sin reseñas) y el mismo tope por
 *   proveedor en la primera página; después el resto en el mismo orden. Nada se repite entre los dos carruseles.
 * - Nada con la marca del proveedor en el título (REQ-219): las filas de tours ya llegan filtradas y aquí se filtran
 *   los viajes.
 */
import { pickDayTrips, pickMostChosen, pickPage, type RankCandidate } from "./carousels";
import type { Cap } from "./review-score";
import { mentionsProviderBrand } from "./brand";
import type { Prior } from "./review-score";
import { isTravelerFavorite } from "@/tours/lib/favorite";

/** Lo que pinta el servidor en el primer render y el tamaño de cada página siguiente. */
export const HOME_FIRST_PAGE = 12;
export const HOME_PAGE_SIZE = 12;

export const HOME_CAROUSELS = ["elegidos", "excursiones"] as const;
export type HomeCarouselId = (typeof HOME_CAROUSELS)[number];

type WithTitle = { title?: string | null };

/** REQ-10516: la primera página se vuelve a armar sobre el orden completo (Favoritos y resto) con los topes de REQ-450 (y el del proveedor, en pickPage). */
const FIRST_PAGE_CAPS: Cap<RankCandidate>[] = [{ of: (t) => t.city, max: 2 }, { of: (t) => t.format, max: 3 }];

// REQ-850
// REQ-10515: Favoritos primero (como antes), luego el resto por puntaje del prior. REQ-10516: tope por proveedor en la primera página.
export function orderMostChosen<T extends RankCandidate>(items: readonly T[], prior: Prior): T[] {
  const isFav = (t: T) => isTravelerFavorite({ rating: t.rating, reviews: t.reviews });
  const favorites = pickMostChosen(items.filter(isFav), prior, Number.POSITIVE_INFINITY);
  const rest = pickMostChosen(items.filter((t) => !isFav(t)), prior, Number.POSITIVE_INFINITY);
  const all = [...favorites, ...rest];
  const head = pickPage(all, HOME_FIRST_PAGE, FIRST_PAGE_CAPS);
  const inHead = new Set(head.map((t) => t.key));
  return [...head, ...all.filter((t) => !inHead.has(t.key))];
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
  // REQ-10515: «Los más elegidos» pinta tarjetas de tour (HomeTour); un viaje (Trip) solo entra si su proveedor tiene
  // sistema de reseñas (hoy ninguno). Los viajes sin reseñas siguen entrando a «Excursiones de un día».
  const elegidos = orderMostChosen<T | V>([...o.tours, ...trips.filter((t) => t.hasReviewSystem)], o.prior);
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
