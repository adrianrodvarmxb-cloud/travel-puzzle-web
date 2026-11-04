/** Dependencias reales de la venta cruzada (D1). La lógica vive en cross-sell.ts y lib/. */
import { getPrisma } from "@/lib/prisma";
import { loadTripCards } from "./public-load";
import { cityLabel, type CrossSellDeps } from "./cross-sell";

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
        select: { id: true, titleImageURL: true, priceValue: true, priceCurrency: true, city: { select: { translations: true } }, translations: { select: { language: true, title: true } } },
      });
      return rows.flatMap((r) => {
        const title = r.translations.find((t) => t.language === lang)?.title ?? r.translations.find((t) => t.language === "en")?.title;
        const cityName = cityLabel(r.city?.translations, "es");
        if (!title || !cityName) return [];
        const price = Number(r.priceValue) > 0 ? `${r.priceCurrency ?? "EUR"} ${Number(r.priceValue)}` : null;
        return [{ id: r.id, title, image: r.titleImageURL, price, cityName, countryCode }];
      });
    },
  };
}
