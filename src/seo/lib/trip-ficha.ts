/**
 * REQ-576 / REQ-577 / REQ-581: entrada del marcado y de «En breve» para la ficha de un viaje (propio o de agencia),
 * bajo /destinos o /viajes. Puro: recibe lo que TripDetailView ya calculó en el servidor (textos visibles) y arma
 * la FichaInput. Los viajes son de otros proveedores (no FREETOUR), así que sí se enriquecen (REQ-570).
 */
import { FORMATOS_FILTRO, formatoLabel, type FormatoFiltro } from "@/taxonomy/lib/filters";
import type { FichaInput } from "./ficha-ld";
import { fichaFacets } from "./taxonomy-facets";

export interface TripFichaTrip {
  kind: string; titleEs: string; titleEn?: string; summaryEs?: string; priceFrom: number | null; currency: string;
  durationDays: number | null; languages: string[]; options: { mode: "group" | "private" }[]; flightsIncluded: boolean;
  category?: string | null; agencyId?: string | null; countries: string[]; cities: string[];
  meetingPoints: { name: string; address?: string; lat: number | null; lng: number | null }[];
}

/** Id del interruptor (REQ-570): `propios` sin agencia; `agencia:{nombre}` con agencia. */
export function tripProviderKey(agencyId: string | null | undefined, agencyName: string | null | undefined): string {
  if (!agencyId) return "propios";
  const slug = (agencyName ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `agencia:${slug || agencyId}`;
}

// REQ-576 REQ-577 REQ-581
export function tripFichaInput(o: {
  trip: TripFichaTrip; lang: string; url: string;
  /** Lo que la página muestra, ya en el idioma de la página. */
  title: string; summary: string | null; operator: string | null; duration: string | null; languageNames: string[]; languagesTitle?: string | null;
  priceText: string | null; places: string | null; includes: string[]; formato?: string | null;
}): FichaInput {
  const { trip, lang } = o;
  const facets = fichaFacets({
    proveedor: "propios", categoriaId: trip.kind, fuentesTema: trip.category ? [trip.category] : [], precio: trip.priceFrom,
    durationDays: trip.durationDays, titulo: [trip.titleEs, trip.titleEn].filter(Boolean).join(" "), resumen: trip.summaryEs,
    idiomas: trip.languages, modos: trip.options.map((x) => x.mode), vueloIncluido: trip.flightsIncluded,
  }, lang);
  // El tipo es el mismo de la tarjeta (incluye la regla de excursión de un día, REQ-451/453): no se contradicen.
  const tipo = o.formato && (FORMATOS_FILTRO as readonly string[]).includes(o.formato) ? formatoLabel(o.formato as FormatoFiltro, lang) : facets.tipo;
  const mp = trip.meetingPoints[0];
  return {
    provider: tripProviderKey(trip.agencyId, o.operator), lang, url: o.url, name: o.title, images: [],
    operator: o.operator, free: false, price: trip.priceFrom, currency: trip.currency,
    duration: o.duration, languages: o.languageNames, languagesTitle: o.languagesTitle ?? null, place: o.places,
    meetingPoint: mp ? { name: mp.name, address: mp.address || null, lat: mp.lat, lng: mp.lng } : null,
    priceText: o.priceText, description: o.summary, tipo, etiquetas: facets.etiquetas, includes: o.includes,
  };
}
