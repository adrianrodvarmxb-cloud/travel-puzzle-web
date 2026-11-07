/** Dependencias reales de la venta cruzada (D1). La lógica vive en cross-sell.ts y lib/. */
import { getPrisma } from "@/lib/prisma";
import { cityNamesOf } from "@/taxonomy/lib/text";
import { loadTripCards } from "./public-load";
import { cityLabel, type CrossSellDeps } from "./cross-sell";
import { catalogClassifier, FORMATOS_PRESENCIALES, taxonomyPublishEnabled } from "@/taxonomy/lib/publish";
import { DEFAULT_DICTIONARY, DEFAULT_MAPPINGS } from "@/taxonomy/data";

export function crossSellDeps(): CrossSellDeps {
  return {
    tripCards: loadTripCards,
    async toursInCountry(countryCode, lang) {
      const prisma = getPrisma();
      const country = await prisma.country.findUnique({ where: { code: countryCode }, select: { id: true } });
      if (!country) return [];
      const rows = await prisma.tour.findMany({
        where: { countryId: country.id, isActive: true, titleImageURL: { startsWith: "https://" } },
        orderBy: [{ reviewsNumber: "desc" }],
        take: 60,
        select: { id: true, titleImageURL: true, priceValue: true, priceCurrency: true, categoryId: true, durationMinutes: true, city: { select: { translations: true } }, translations: { select: { language: true, title: true } } },
      });
      // T3 (REQ-407): con TAXONOMY_PUBLISH_ENABLED solo formatos presenciales (sin online, servicios, audioguías ni traslados).
      const taxonomy = taxonomyPublishEnabled(process.env as Record<string, string | undefined>) ? catalogClassifier(DEFAULT_DICTIONARY, DEFAULT_MAPPINGS) : null;
      return rows.flatMap((r) => {
        if (taxonomy && !FORMATOS_PRESENCIALES.includes(taxonomy({ categoryId: r.categoryId, price: Number(r.priceValue), durationMinutes: r.durationMinutes, title: r.translations.map((x) => x.title).join(" | "), cities: cityNamesOf(r.city?.translations) }).formato)) return [];
        const title = r.translations.find((t) => t.language === lang)?.title ?? r.translations.find((t) => t.language === "en")?.title;
        const cityName = cityLabel(r.city?.translations, "es");
        if (!title || !cityName) return [];
        const price = Number(r.priceValue) > 0 ? `${r.priceCurrency ?? "EUR"} ${Number(r.priceValue)}` : null;
        return [{ id: r.id, title, image: r.titleImageURL, price, cityName, countryCode }];
      });
    },
  };
}
