/** REQ-1245 (D31): ciudad, árbol de /destinos, sitemaps y breadcrumbs usan el título del tour sin la plataforma. */
import { describe, expect, it } from "vitest";
import { createDestinationsRepo, type D1Read } from "./repository";

const row = { id: "t1", externalId: 9, slug: "tallin", cityId: 1, countryId: 1, title: "Tallin (Premios FREETOUR.com)", titleEn: "Tallinn - FreeTour.com", providerTitle: "Ana", priceValue: 0, priceCurrency: "EUR", rating: 5, reviewsNumber: 1, titleImageURL: null, duration: "2:00", syncStatus: "active", isActive: 1, updatedAt: null, categoryId: 12, durationMinutes: 120, providerId: "freetour", iso2: "EE", citySlug: "tallin", cityTr: "{}", cityLive: 1 };
const db: D1Read = { prepare: () => ({ bind: () => ({ all: async () => ({ results: [row] }) }) }) } as unknown as D1Read;
const repo = createDestinationsRepo(db, { cityName: () => "Tallin", tripImage: (k) => k, tripPrice: () => null });

describe("REQ-1245 repositorio de destinos sin la plataforma", () => {
  it("REQ-1245 tours() limpia el título en es y en", async () => {
    const [t] = await repo.tours();
    expect(t.title).toBe("Tallin");
    expect(t.titleEn).toBe("Tallinn");
  });
  it("REQ-1245 tourPlaceBySlug limpia el título", async () => {
    expect((await repo.tourPlaceBySlug("tallin"))!.title).toBe("Tallin");
  });
});
