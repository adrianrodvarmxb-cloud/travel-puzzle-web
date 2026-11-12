/** Dependencias reales de la venta cruzada (D1). La lógica vive en cross-sell.ts y lib/. */
import { getPrisma } from "@/lib/prisma";
import { cityNamesOf } from "@/taxonomy/lib/text";
import { loadTripCards } from "./public-load";
import { cityLabel, type CrossSellDeps } from "./cross-sell";
import { parseProviderTransfers, TRANSFER_CATEGORY_IDS } from "./lib/transfer-cross-sell";
import { catalogClassifier, FORMATOS_PRESENCIALES, taxonomyPublishEnabled } from "@/taxonomy/lib/publish";
import { DEFAULT_DICTIONARY, DEFAULT_MAPPINGS } from "@/taxonomy/data";
import type { ProviderVisibilityEnv } from "@/catalog/lib/provider-visibility";

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
    /**
     * REQ-3428: traslados (29) y transporte turístico (30) de proveedor publicados en el país. A propósito NO
     * se le aplica el filtro de formatos presenciales de T3 (REQ-407): ese filtro existe para sacar los
     * traslados de /tours y del inicio (REQ-261), y lo que el PO decidió aquí es justo lo contrario, que sí
     * entren a la franja de transporte de la ficha. La lista que sale la valida y ordena la lib.
     */
    async providerTransfersInCountry(countryCode, lang) {
      // Cliente público: el gate C (REQ-3311) ya deja fuera a los proveedores con bandera apagada.
      const prisma = getPrisma();
      const country = await prisma.country.findUnique({ where: { code: countryCode }, select: { id: true } });
      if (!country) return [];
      const rows = await prisma.tour.findMany({
        where: { countryId: country.id, isActive: true, categoryId: { in: [...TRANSFER_CATEGORY_IDS] } },
        orderBy: [{ reviewsNumber: "desc" }],
        take: 40,
        select: { id: true, providerId: true, categoryId: true, titleImageURL: true, priceValue: true, priceCurrency: true, reviewsNumber: true, rating: true, city: { select: { translations: true } }, translations: { select: { language: true, title: true } } },
      });
      const { ok, dropped } = parseProviderTransfers(rows.map((r) => ({
        id: r.id, providerId: r.providerId, categoryId: r.categoryId, image: r.titleImageURL,
        price: r.priceValue === null ? null : Number(r.priceValue), currency: r.priceCurrency,
        reviews: r.reviewsNumber, rating: r.rating === null ? null : Number(r.rating),
        cityName: cityLabel(r.city?.translations, "es"), countryCode,
        titles: Object.fromEntries(r.translations.map((t) => [t.language, t.title])),
      })), lang, process.env as ProviderVisibilityEnv);
      // Regla 8 del blindaje: el registro malo se descarta y se registra; la franja sigue con el resto.
      if (dropped) console.error(`[venta cruzada] ${dropped} traslado(s) de proveedor descartados por datos inválidos (${countryCode})`);
      return ok;
    },
  };
}
