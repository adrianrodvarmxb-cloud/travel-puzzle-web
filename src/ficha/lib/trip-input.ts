/**
 * REQ-10835 · Frente 2 (Mila con acceso a todo, #422), decisión 39 (REQ-10616: «la rama #468 se rehace sobre el modelo
 * común»). Arma la entrada del adaptador de viajes (`adapters/trip.ts`, REQ-10779) desde lo que ya guarda el sitio de un
 * viaje publicado: la fila validada (`StoredTrip`), sus traducciones, el nombre de la agencia y las banderas. Es el
 * mismo dato que ven las tarjetas y la ficha de /viajes (paridad por construcción, decisión 3), sin leer la base aquí.
 * - Textos en el idioma pedido con respaldo en español (`localized`), como la tarjeta (REQ-306).
 * - Galería con las URL públicas y absolutas de las imágenes (`imageUrl` sobre el dominio del sitio): Mila las manda por
 *   WhatsApp y Meta solo acepta https absolutas; nunca la llave interna sola.
 * - Ciudad y país principales: la primera ciudad y el primer país del viaje; el nombre del país con `countryName`.
 * - Formato con el clasificador oficial y la firma del PO (`tripFormat`, REQ-10756); el bloque de taxonomía sale de él.
 * - Mapa: punto exacto del primer punto de encuentro con coordenadas; sin él, lo que diga `fichaMapView` (zona solo con
 *   coordenadas de ciudad, que un viaje no trae: null).
 * Puro: sin Prisma, sin `fetch`, sin `process.env` (las banderas llegan por parámetro).
 */
import { tripToFicha, type TripInput } from "../adapters/trip";
import type { FichaLang, FichaModel } from "./model";
import type { StoredTrip } from "@/trips/manage";
import { localized, type Translations } from "@/trips/lib/translation";
import { imageUrl } from "@/trips/lib/image";
import { countryName } from "@/trips/lib/geo";
import { tripFormat } from "@/tours/lib/card-format";
import { taxonomyBlock } from "@/taxonomy/lib/block";
import { fichaMapView, type GeoFlagsEnv } from "@/map/lib/city-pin";
import { firstPoint } from "@/map/lib/coords";
import { isDayTripTrip } from "@/home/lib/experience-format";
import { slugify } from "@/destinations/lib/slug";

export const TRIP_TAXONOMY_PROVIDER = "propios";

export interface TripFichaSource {
  trip: StoredTrip;
  translations: Translations | null | undefined;
  agencyName: string | null;
}

export interface TripFichaOptions {
  lang: FichaLang;
  /** Banderas del mapa (`ZONE_MAP_ENABLED`, …); se pasan, no se leen aquí. */
  env: GeoFlagsEnv;
  /** Dominio público del sitio (`SITE_URL`), para que las fotos salgan absolutas. */
  siteUrl: string;
}

/** `/api/viajes/foto/...` → `https://travelpuzzle.com.mx/api/viajes/foto/...`; una URL ya absoluta se respeta. */
// REQ-10835
export function absoluteUrl(siteUrl: string, path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${siteUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

/** Entrada del adaptador desde el viaje guardado. Expuesta para probar cada pieza. */
// REQ-10835
export function tripFichaInput(s: TripFichaSource, o: TripFichaOptions): TripInput {
  const t = s.trip;
  const tr = s.translations ?? {};
  const title = localized(tr, o.lang, "title", t.titleEs);
  const titleEn = localized(tr, "en", "title", t.titleEs);
  const dayTrip = isDayTripTrip({ kind: t.kind, durationDays: t.durationDays, titles: [t.titleEs, titleEn] });
  const format = tripFormat({ id: t.id, kind: t.kind, priceFrom: t.priceFrom, durationDays: t.durationDays, titles: [t.titleEs, titleEn], dayTrip, resumen: t.summaryEs ?? "" });
  const cityName = (t.cities[0] ?? "").trim();
  const code = (t.countries[0] ?? "").trim().toUpperCase();
  return {
    row: t as unknown as TripInput["row"],
    texts: {
      title,
      summary: localized(tr, o.lang, "summary", t.summaryEs ?? "") || null,
      description: localized(tr, o.lang, "description", t.descriptionEs ?? "") || null,
    },
    gallery: t.images.map((im) => ({ url: absoluteUrl(o.siteUrl, imageUrl(im.key)), alt: im.alt?.trim() || null })),
    city: { slug: slugify(cityName), name: cityName },
    country: { code, name: code ? countryName(code, o.lang) : "" },
    lang: o.lang,
    taxonomy: taxonomyBlock({ formato: format, temas: [], atributos: [] }, { proveedor: TRIP_TAXONOMY_PROVIDER, lang: o.lang, decision11: true }),
    format,
    map: fichaMapView(firstPoint(t.meetingPoints), null, o.env),
    agencyName: s.agencyName,
  };
}

/** Modelo de la ficha de un viaje publicado (lo que `load.ts` valida después). */
// REQ-10835
export function tripFichaModel(s: TripFichaSource, o: TripFichaOptions): FichaModel {
  return tripToFicha(tripFichaInput(s, o));
}
