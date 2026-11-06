/**
 * Atribución de las fuentes geográficas (REQ-138). Puro. GeoNames es CC BY 4.0 (exige atribución);
 * Wikidata es CC0 (no la exige, se nombra por cortesía). Solo se nombran las fuentes que se usen en producción.
 * Gate G5 (firmado el 5 nov 2026): solo en la página legal (/terminos; el sitio no tiene /legal), NO en el pie de página,
 * tras la bandera GEO_ATTRIBUTION_ENABLED="false" (se enciende cuando el geonameid o datos de GeoNames se vean en el sitio).
 */

import { LEGAL_PATHS } from "@/legal/lib/labels";

export type GeoSource = "geonames" | "wikidata";

export interface Attribution {
  id: GeoSource;
  text: string;
  links: string[];
}

export const GEO_ATTRIBUTION: Record<GeoSource, Attribution> = {
  geonames: {
    id: "geonames",
    text: "Datos geográficos: GeoNames (geonames.org), licencia CC BY 4.0.",
    links: ["https://www.geonames.org/", "https://creativecommons.org/licenses/by/4.0/deed.es"],
  },
  wikidata: {
    id: "wikidata",
    text: "Identificadores complementarios: Wikidata (CC0).",
    links: ["https://www.wikidata.org/"],
  },
};

const ORDER: readonly GeoSource[] = ["geonames", "wikidata"];

/** REQ-138: líneas de atribución a mostrar; vacío con la bandera apagada. */
export function geoAttribution(opts: { enabled: boolean; sourcesInProduction: readonly GeoSource[] }): Attribution[] {
  if (!opts.enabled) return [];
  return ORDER.filter((s) => opts.sourcesInProduction.includes(s)).map((s) => GEO_ATTRIBUTION[s]);
}

/** REQ-139: rutas donde se muestra la atribución (solo la sección legal; nunca el pie de página). */
export const GEO_ATTRIBUTION_PATHS: readonly string[] = [LEGAL_PATHS.terms];

/** REQ-139: fuentes geográficas que hoy se usan en producción (Wikidata solo es segunda opinión del ensayo). */
export const GEO_SOURCES_IN_PRODUCTION: readonly GeoSource[] = ["geonames"];

/** REQ-139: la bandera solo enciende con "true" exacto. */
export function isGeoAttributionEnabled(value: string | undefined): boolean {
  return value === "true";
}

/** REQ-139: líneas de atribución para una ruta; vacío fuera de /terminos o con la bandera apagada. */
export function geoAttributionFor(path: string, env: { GEO_ATTRIBUTION_ENABLED?: string }): Attribution[] {
  if (!GEO_ATTRIBUTION_PATHS.includes(path)) return [];
  return geoAttribution({ enabled: isGeoAttributionEnabled(env.GEO_ATTRIBUTION_ENABLED), sourcesInProduction: GEO_SOURCES_IN_PRODUCTION });
}
