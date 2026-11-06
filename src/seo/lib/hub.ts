/** «Actividades destacadas» de cada hub y canonical propio por página. Puro. */

export interface HubTour { id: string; title: string; href: string; reviews: number; rating: number | string | null; active: boolean }

// REQ-101: los 3 tours activos principales (más reseñas, luego mejor calificación), enlazados.
export function featuredActivities(tours: HubTour[], n = 3): { label: string; items: { title: string; href: string }[] } | null {
  const items = tours
    .filter((t) => t.active)
    .sort((a, b) => b.reviews - a.reviews || Number(b.rating ?? 0) - Number(a.rating ?? 0))
    .slice(0, n)
    .map((t) => ({ title: t.title, href: t.href }));
  return items.length ? { label: "Actividades destacadas", items } : null;
}

// REQ-101: URL absoluta sin query, hash ni diagonal final (la raíz conserva "/").
export function canonicalUrl(siteUrl: string, path: string): string {
  const clean = path.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  return `${siteUrl.replace(/\/+$/, "")}${clean.startsWith("/") ? clean : `/${clean}`}`;
}

// REQ-101: dos rutas que declaran el mismo canonical compiten por el mismo nombre.
export function findCanonicalConflicts(pages: { path: string; canonical: string }[]): { canonical: string; paths: string[] }[] {
  const by = new Map<string, string[]>();
  for (const p of pages) by.set(p.canonical, [...(by.get(p.canonical) ?? []), p.path]);
  return [...by].filter(([, paths]) => paths.length > 1).map(([canonical, paths]) => ({ canonical, paths }));
}
