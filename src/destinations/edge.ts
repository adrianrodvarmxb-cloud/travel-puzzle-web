/**
 * Decisión del middleware para las URLs de destinos (solo con PRIMERA_PIEZA_ENABLED="true"):
 * 301 desde /tours/{id}, /tours?countryId= y /viajes/{destino}/{slug} cuando ya hay slug; 410 para tours
 * removed; rewrite de /sitemap-tours-{pais}.xml. El repositorio se inyecta. Si D1 falla, no hace nada
 * (la URL sigue funcionando como hoy).
 */
import { planDestinationsRequest } from "./lib/request-plan";
import { cityPath, legacyCountryResolution, legacyTourResolution, ownTripResolution, ROUTES, type Resolution } from "./lib/routes";
import { ownTripPlace } from "./lib/catalog";
import { goneHtml } from "./lib/page-model";
import type { DestinationsRepo, TourPlaceRow } from "./repository";

export type EdgeDecision =
  | { type: "redirect"; status: 301; location: string }
  | { type: "gone"; status: 410; html: string }
  | { type: "rewrite"; path: string }
  | null;

export interface EdgeDeps {
  repo: DestinationsRepo;
  /** Interruptores de viajes propios (OWN_TOURS_ENABLED / TRANSPORT_ENABLED). */
  tripVisible(kind: string): boolean;
}

function gone(p: TourPlaceRow): EdgeDecision {
  const live = p.cityLive && p.countrySlug && p.citySlug;
  return { type: "gone", status: 410, html: goneHtml({ title: p.title || null, cityName: live ? p.cityName : "otros destinos", cityHref: live ? cityPath(p.countrySlug!, p.citySlug!) : ROUTES.destinos }) };
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
        // Sin país o ciudad con slug no hay a dónde mandar ni a qué ciudad enlazar: la URL vieja sigue igual.
        if (!p || !p.countrySlug || !p.citySlug) return null;
        if (p.status === "removed") return gone(p);
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
        if (!p || p.status !== "removed" || p.countrySlug !== plan.pais || p.citySlug !== plan.ciudad) return null;
        return gone(p);
      }
    }
  } catch (error) {
    console.error("[destinos] middleware sin decisión (sigue la URL de hoy):", (error as Error).message);
    return null;
  }
}
