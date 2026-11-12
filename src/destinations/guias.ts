/**
 * REQ-1228: registro de las guías de ciudad del repo (src/destinations/content/guias.json). Una guía inválida se
 * descarta con un log y no tumba /destinos. Solo las agrega el workflow guias-ciudad.yml.
 */
import { parseGuide, type CityGuide, type CityGuideInput } from "./lib/guia";
import raw from "./content/guias.json";
import { footerGuideLinks, guidesIndex, type GuideCountry, type GuideNavLink } from "./lib/guias-index";
import { countryName } from "@/trips/lib/geo";

export const GUIDES_RAW: CityGuideInput[] = raw as unknown as CityGuideInput[];

export function loadGuides(source: CityGuideInput[] = GUIDES_RAW, log: (l: string) => void = (l) => console.error(l)): CityGuide[] {
  return source.flatMap((g) => {
    const r = parseGuide(g);
    if (r.ok) return [r.guide];
    log(`[guías] guía descartada (${(g as { pais?: string; ciudad?: string })?.pais}/${(g as { ciudad?: string })?.ciudad}): ${r.error}`);
    return [];
  });
}

/** Guía estructurada de una ciudad (para pintarla con sus enlaces), o null. */
export function guideFor(pais: string, ciudad: string, guides: CityGuide[] = loadGuides()): CityGuide | null {
  return guides.find((g) => g.pais === pais && g.ciudad === ciudad) ?? null;
}

/** REQ-3333: nombre del país en el idioma (Intl, en el servidor; nunca en el cliente, INC-001). */
export const guideCountryName = (iso: string, lang: string) => countryName(iso.toUpperCase(), lang);

/** REQ-3333 / REQ-3334: índice de guías del repo en un idioma. */
export function guidesIndexFor(lang: string, guides: CityGuide[] = loadGuides()): GuideCountry[] {
  return guidesIndex(guides, lang, guideCountryName);
}

/** REQ-3335: enlaces de la columna «Guías» del pie por idioma (es y en; los demás idiomas no tienen guías). */
export function footerGuideLinksByLang(guides: CityGuide[] = loadGuides()): Record<string, GuideNavLink[]> {
  return Object.fromEntries((["es", "en"] as const).map((l) => [l, footerGuideLinks(guidesIndex(guides, l, guideCountryName), l)]));
}
