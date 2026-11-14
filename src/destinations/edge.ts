/**
 * Decisión del middleware para las URLs de destinos (solo con PRIMERA_PIEZA_ENABLED="true"):
 * 301 desde /tours/{id}, /tours?countryId= y /viajes/{destino}/{slug} cuando ya hay slug; 410 para tours
 * removed; rewrite de /sitemap-tours-{pais}.xml. El repositorio se inyecta.
 * REQ-3540 (INC-015): si D1 falla, el error sale como `FalloDeBase` y lo decide la raíz (middleware.ts).
 * Antes se devolvía null y la URL vieja respondía 200 declarándose canónica de sí misma.
 */
import { planDestinationsRequest } from "./lib/request-plan";
import { legacyCountryResolution, legacyTourResolution, ownTripResolution, type Resolution } from "./lib/routes";
import { ownTripPlace } from "./lib/catalog";
import { goneRewritePath } from "./lib/page-model";
import type { DestinationsRepo, TourPlaceRow } from "./repository";
import { FalloDeBase } from "./lib/fallo-de-base";

export type EdgeDecision =
  | { type: "redirect"; status: 301; location: string }
  | { type: "gone"; status: 410; path: string }
  | { type: "rewrite"; path: string }
  | null;

export interface EdgeDeps {
  repo: DestinationsRepo;
  /** Interruptores de viajes propios (OWN_TOURS_ENABLED / TRANSPORT_ENABLED). */
  tripVisible(kind: string): boolean;
}

// REQ-092: la página 410 busca el tour por id y arma título y enlace a su ciudad desde la base.
function gone(p: TourPlaceRow): EdgeDecision {
  return { type: "gone", status: 410, path: goneRewritePath(p.id) };
}

function apply(r: Resolution, p: TourPlaceRow | null): EdgeDecision {
  if (r.kind === "redirect") return { type: "redirect", status: 301, location: r.location };
  if (r.kind === "gone" && p) return gone(p);
  return null;
}

// REQ-092 REQ-102
export async function decideDestinationsRequest(pathname: string, search: URLSearchParams, { repo, tripVisible }: EdgeDeps): Promise<EdgeDecision> {
  const plan = planDestinationsRequest(pathname, search);
  if (!plan) return null;
  try {
    switch (plan.kind) {
      case "sitemap-tours":
        return { type: "rewrite", path: `/sitemaps/tours/${plan.pais}` };
      case "legacy-tour": {
        const p = await repo.tourPlaceById(plan.id);
        if (!p) return null;
        // Retirado (o isActive=0): 410 aunque no haya slugs; la página enlaza a su ciudad o a /destinos.
        if (p.status === "removed") return gone(p);
        // Sin país o ciudad con slug no hay a dónde mandar: la URL vieja sigue igual.
        if (!p.countrySlug || !p.citySlug) return null;
        return apply(legacyTourResolution({ countrySlug: p.countrySlug, citySlug: p.citySlug, slug: p.slug, status: p.status }), p);
      }
      case "legacy-country":
        return apply(legacyCountryResolution(String(plan.countryId), await repo.countrySlugWithTours(plan.countryId)), null);
      case "own-trip": {
        const trip = await repo.tripBySlug(plan.slug);
        if (!trip || !tripVisible(trip.kind)) return null;
        const at = ownTripPlace(trip, await repo.citiesOf(trip.countries));
        return apply(ownTripResolution(at), null);
      }
      case "tour-slug": {
        const p = await repo.tourPlaceBySlug(plan.slug);
        if (p) return p.status !== "removed" || p.countrySlug !== plan.pais || p.citySlug !== plan.ciudad ? null : gone(p);
        // REQ-1349: un viaje propio en una ciudad que no es la suya (la de inicio) → 301 a su URL canónica.
        const trip = await repo.tripBySlug(plan.slug);
        if (!trip || !tripVisible(trip.kind)) return null;
        const at = ownTripPlace(trip, await repo.citiesOf(trip.countries));
        if (!at || (at.countrySlug === plan.pais && at.citySlug === plan.ciudad)) return null;
        return apply(ownTripResolution(at), null);
      }
    }
  } catch (error) {
    // REQ-3540: un fallo de la base no es «no existe» (regla 7). Sale tipado; lo resuelve middleware.ts.
    throw new FalloDeBase(error);
  }
}
