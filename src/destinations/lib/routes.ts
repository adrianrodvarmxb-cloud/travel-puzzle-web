/**
 * URLs canónicas por destino y qué responde cada URL vieja. Pura: recibe los slugs ya guardados
 * (Ola 3) y el estado del tour (Ola 1); quien hace I/O busca esos datos y aplica la respuesta.
 * El id de FREETOUR nunca va en la URL.
 */
export const ROUTES = { primeraPieza: "/la-primera-pieza", destinos: "/destinos" } as const;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function seg(slug: string): string {
  if (!SLUG.test(slug)) throw new Error(`slug inválido: "${slug}"`);
  return slug;
}

// REQ-088
export const countryPath = (pais: string) => `${ROUTES.destinos}/${seg(pais)}`;
// REQ-088
export const cityPath = (pais: string, ciudad: string) => `${countryPath(pais)}/${seg(ciudad)}`;
// REQ-088
export const tourPath = (pais: string, ciudad: string, slug: string) => `${cityPath(pais, ciudad)}/${seg(slug)}`;

export type TourStatus = "active" | "missing" | "removed";
export interface TourPlace { countrySlug: string; citySlug: string; slug: string }
export interface TourRouteInfo { countrySlug: string; citySlug: string; slug: string | null; status: TourStatus; equivalent?: TourPlace | null }

export type Resolution =
  | { kind: "ok"; status: 200 }
  | { kind: "redirect"; status: 301; location: string }
  | { kind: "gone"; status: 410; cityHref: string }
  | { kind: "not-found"; status: 404 }
  | { kind: "keep" };

const redirect = (p: TourPlace): Resolution => ({ kind: "redirect", status: 301, location: tourPath(p.countrySlug, p.citySlug, p.slug) });

// REQ-092: /tours/{id} → id; cualquier otra forma no es una ficha vieja.
export function parseLegacyTourId(pathname: string): string | null {
  const m = pathname.match(/^\/tours\/([^/]+)\/?$/);
  return m ? decodeURIComponent(m[1]) : null;
}

// REQ-092: removed → 301 solo si hay equivalente; si no, 410 con enlace a su ciudad. missing sigue sirviéndose.
export function tourPageResolution(t: TourRouteInfo): Resolution {
  if (t.status !== "removed") return { kind: "ok", status: 200 };
  if (t.equivalent) return redirect(t.equivalent);
  return { kind: "gone", status: 410, cityHref: cityPath(t.countrySlug, t.citySlug) };
}

// REQ-092: la ficha vieja redirige directo (sin cadenas) a la nueva. Sin slug todavía, se queda como está.
export function legacyTourResolution(t: TourRouteInfo | null): Resolution {
  if (!t) return { kind: "not-found", status: 404 };
  if (t.status === "removed") return tourPageResolution(t);
  if (!t.slug) return { kind: "keep" };
  return redirect({ countrySlug: t.countrySlug, citySlug: t.citySlug, slug: t.slug });
}

// REQ-092: /tours?countryId= → 301 al hub del país si ya tiene slug.
export function legacyCountryResolution(countryId: string | null, countrySlug: string | null): Resolution {
  if (!countryId || !countrySlug) return { kind: "keep" };
  return { kind: "redirect", status: 301, location: countryPath(countrySlug) };
}

// REQ-092 (gate 4): /viajes/{destino}/{slug} entra a /destinos/{pais}/{ciudad}/{slug} con 301.
export function ownTripResolution(trip: TourPlace | null): Resolution {
  return trip ? redirect(trip) : { kind: "keep" };
}
