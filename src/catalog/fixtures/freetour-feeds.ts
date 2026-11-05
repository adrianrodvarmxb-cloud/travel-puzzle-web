/**
 * Fixtures del sync blindado (Ola 1, REQ-071…078). Solo para pruebas: nada del sitio los importa.
 * Imitan la forma de GET /tours?page=N de la Partners API.
 */
import { FreetourError } from "@/freetour/api";

export interface FeedTour {
  id: number;
  updatedAt: string;
  title: Record<string, string>;
  brief: Record<string, string>;
  description: Record<string, string>;
  URLs: Record<string, string>;
  providerTitle: string;
  providerPhone: string | null;
  price: { value: number; currency: string };
  length: string;
  meetingPoint: Record<string, unknown>;
  cityId: number;
  countryId: number;
  includes: unknown[];
  POIs: unknown;
  titleImageURL: string | null;
  categoryId: number;
  images: unknown[] | null;
  videoURL: string | null;
  rating: number | null;
  reviewsNumber: number;
}

export function feedTour(id: number, over: Partial<FeedTour> = {}): FeedTour {
  return {
    id, updatedAt: "", title: { es: `Tour ${id}` }, brief: {}, description: { es: `Descripción ${id}` }, URLs: { es: `https://x/${id}` },
    providerTitle: `Guía ${id}`, providerPhone: null, price: { value: 0, currency: "EUR" }, length: "2:00",
    meetingPoint: { es: "Zócalo" }, cityId: 10, countryId: 99, includes: [], POIs: null, titleImageURL: null, categoryId: 1,
    images: [], videoURL: null, rating: 4.8, reviewsNumber: 100, ...over,
  };
}

/** Un catálogo partido en páginas, como lo devuelve /tours?page=N. */
export function pagedFeed(tours: FeedTour[], perPage = 2) {
  const totalPages = Math.ceil(tours.length / perPage);
  return (page: number) => ({
    data: { tours: tours.slice((page - 1) * perPage, page * perPage), totalPages, currentPage: page, totalObjects: tours.length },
  });
}

/** Catálogo base: 6 tours en 3 páginas. */
export const BASE_CATALOG = [1, 2, 3, 4, 5, 6].map((id) => feedTour(id));

/** Tour 2 renombrado por el proveedor (cambia el contenido → cambia el hash). */
export const RENAMED_CATALOG = BASE_CATALOG.map((t) => (t.id === 2 ? { ...t, title: { es: "Tour 2 · nuevo nombre" } } : t));

/** Tour 6 eliminado del feed. */
export const DELETED_CATALOG = BASE_CATALOG.filter((t) => t.id !== 6);

/** Solo cambió la calificación del tour 3 (no es cambio de contenido). */
export const RATING_ONLY_CATALOG = BASE_CATALOG.map((t) => (t.id === 3 ? { ...t, rating: 4.1, reviewsNumber: 101 } : t));

/** Feed vacío: la API responde 200 sin tours. */
export const EMPTY_FEED = () => ({ data: { tours: [], totalPages: 0, currentPage: 1, totalObjects: 0 } });

/** Feed que cayó más de 20 %: 4 de 6 tours. */
export const DROPPED_CATALOG = BASE_CATALOG.slice(0, 4);

export const error500 = () => new FreetourError("Freetour respondió 500", 500, null);
export const error429 = (retryAfter = "120") => new FreetourError("Freetour respondió 429", 429, null, retryAfter);
export const loginRejected = () => new FreetourError("Bad credentials", 401, 1, null, true);
