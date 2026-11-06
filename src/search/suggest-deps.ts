/** REQ-290…292: dependencias reales del autocompletado (catálogo en memoria + nombres y títulos de D1 por id). */
import { getPrisma } from "@/lib/prisma";
import { loadCatalog } from "@/catalog/snapshot";
import type { SuggestDeps } from "./suggest";

export const LANGUAGES = new Set(["es", "en", "pt", "de", "fr", "it"]);
export const pickLanguage = (v: string | null | undefined) => (v && LANGUAGES.has(v) ? v : "es");

export function suggestDeps(): SuggestDeps {
  const db = getPrisma();
  return {
    loadCatalog,
    cityTranslations: (ids) => db.city.findMany({ where: { id: { in: ids } }, select: { id: true, translations: true } }),
    countryTranslations: (ids) => db.country.findMany({ where: { id: { in: ids } }, select: { id: true, translations: true } }),
    tourTitles: (ids, language) => db.tourTranslation.findMany({ where: { tourId: { in: ids }, language: { in: [language, "en"] } }, select: { tourId: true, language: true, title: true } }),
    env: { SEARCH_SUGGEST_ENABLED: process.env.SEARCH_SUGGEST_ENABLED, SEARCH_V2_ENABLED: process.env.SEARCH_V2_ENABLED, SEARCH_FUZZY_ENABLED: process.env.SEARCH_FUZZY_ENABLED },
  };
}
