/** Orden de la lista de tours (?sort=…). Por defecto: los que tienen más reseñas. */
export const SORT_OPTIONS = ["reviews", "rating", "price", "duration"] as const;
export type TourSort = (typeof SORT_OPTIONS)[number];

export function parseSort(value: string | null | undefined): TourSort {
  return (SORT_OPTIONS as readonly string[]).includes(value ?? "") ? (value as TourSort) : "reviews";
}

/** Traduce el orden a los parámetros que ya entiende el repositorio de tours. */
export function sortToPagination(sort: TourSort): { sortBy: string; sortOrder: "asc" | "desc" } {
  if (sort === "rating") return { sortBy: "rating", sortOrder: "desc" };
  if (sort === "price") return { sortBy: "price", sortOrder: "asc" };
  if (sort === "duration") return { sortBy: "duration", sortOrder: "asc" };
  return { sortBy: "reviewsNumber", sortOrder: "desc" };
}
