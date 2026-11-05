/** Orden de la lista de tours (?sort=…). Por defecto: los que tienen más reseñas; al buscar, relevancia (REQ-048). */
export const SORT_OPTIONS = ["reviews", "rating", "price", "duration"] as const;
export type TourSort = (typeof SORT_OPTIONS)[number] | "relevance";

// REQ-048
export function parseSort(value: string | null | undefined, searching = false): TourSort {
  if (value === "relevance") return searching ? "relevance" : "reviews";
  if ((SORT_OPTIONS as readonly string[]).includes(value ?? "")) return value as TourSort;
  return searching ? "relevance" : "reviews";
}

/** Opciones del selector: "Relevancia" solo cuando hay búsqueda. */
export function sortOptions(searching: boolean): TourSort[] {
  return searching ? ["relevance", ...SORT_OPTIONS] : [...SORT_OPTIONS];
}

/** Traduce el orden a los parámetros que ya entiende el repositorio de tours. */
export function sortToPagination(sort: TourSort): { sortBy: string; sortOrder: "asc" | "desc" } {
  if (sort === "relevance") return { sortBy: "relevance", sortOrder: "desc" };
  if (sort === "rating") return { sortBy: "rating", sortOrder: "desc" };
  if (sort === "price") return { sortBy: "price", sortOrder: "asc" };
  if (sort === "duration") return { sortBy: "duration", sortOrder: "asc" };
  return { sortBy: "reviewsNumber", sortOrder: "desc" };
}
