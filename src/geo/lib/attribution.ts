/**
 * Atribución de las fuentes geográficas (REQ-129). Puro. GeoNames es CC BY 4.0 (exige atribución);
 * Wikidata es CC0 (no la exige, se nombra por cortesía). Solo se nombran las fuentes que se usen en producción.
 * Propuesta: pie de página y /legal, tras la bandera GEO_ATTRIBUTION_ENABLED (apagada hasta que el geonameid se use en el sitio).
 */

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

/** REQ-129: líneas de atribución a mostrar; vacío con la bandera apagada. */
export function geoAttribution(opts: { enabled: boolean; sourcesInProduction: readonly GeoSource[] }): Attribution[] {
  if (!opts.enabled) return [];
  return ORDER.filter((s) => opts.sourcesInProduction.includes(s)).map((s) => GEO_ATTRIBUTION[s]);
}
