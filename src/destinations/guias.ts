/**
 * REQ-1228: registro de las guías de ciudad del repo (src/destinations/content/guias.json). Una guía inválida se
 * descarta con un log y no tumba /destinos. Solo las agrega el workflow guias-ciudad.yml.
 */
import { parseGuide, type CityGuide, type CityGuideInput } from "./lib/guia";
import raw from "./content/guias.json";

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
