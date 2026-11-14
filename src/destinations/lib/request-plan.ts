/**
 * Qué peticiones revisa el middleware de destinos (solo con PRIMERA_PIEZA_ENABLED="true"). Puro.
 * El middleware hace la consulta a D1 y aplica routes.ts (301, 410 o seguir igual).
 */
import { parseLegacyTourId } from "./routes";

export type DestinationsRequest =
  | { kind: "legacy-tour"; id: string }
  | { kind: "legacy-country"; countryId: number }
  | { kind: "own-trip"; slug: string }
  | { kind: "tour-slug"; pais: string; ciudad: string; slug: string }
  | { kind: "sitemap-tours"; pais: string };

const SEG = "[a-z0-9]+(?:-[a-z0-9]+)*";
const TOUR = new RegExp(`^/destinos/(${SEG})/(${SEG})/(${SEG})/?$`);
const TRIP = /^\/viajes\/[^/]+\/([^/]+)\/?$/;
const SITEMAP = /^\/sitemap-tours-([a-z0-9]+)\.xml$/;

// REQ-092 REQ-102
export function planDestinationsRequest(pathname: string, search: URLSearchParams): DestinationsRequest | null {
  if (pathname === "/tours" || pathname === "/tours/") {
    const keys = [...new Set(search.keys())];
    const id = Number(search.get("countryId"));
    return keys.length === 1 && keys[0] === "countryId" && Number.isInteger(id) && id > 0 ? { kind: "legacy-country", countryId: id } : null;
  }
  const legacy = parseLegacyTourId(pathname);
  if (legacy) return { kind: "legacy-tour", id: legacy };
  const trip = pathname.match(TRIP);
  if (trip) return { kind: "own-trip", slug: decodeURIComponent(trip[1]) };
  const tour = pathname.match(TOUR);
  if (tour) return { kind: "tour-slug", pais: tour[1], ciudad: tour[2], slug: tour[3] };
  const sm = pathname.match(SITEMAP);
  if (sm) return { kind: "sitemap-tours", pais: sm[1] };
  return null;
}

/**
 * REQ-10529: la 301 de /tours?countryId= es para enlaces viejos (Google, otros sitios). Si la petición
 * viene del propio sitio (navegación RSC de Next o mismo origen), es el filtro de país de Experiencias
 * y debe quedarse en la lista filtrada. Puro.
 */
export function isSiteNavigation(get: (name: string) => string | null, host: string): boolean {
  if (get("rsc")) return true;
  if (get("sec-fetch-site") === "same-origin") return true;
  const ref = get("referer");
  if (!ref) return false;
  try { return new URL(ref).host === host; } catch { return false; }
}
