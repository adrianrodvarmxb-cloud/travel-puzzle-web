/**
 * REQ-1243 (D31): la lista de /tours, la ficha (y su JSON-LD, que sale del mismo tour) y el dato crudo que viaja al
 * cliente salen del repositorio sin la plataforma. La base no se toca (solo lecturas).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mentionsPlatform } from "@/reviews/lib/platform-mention";

const ROW = {
  id: "t1", externalId: 9, cityId: 1, countryId: 1, priceValue: 0, includes: ["Guía local", "Insignia de FREETOUR.com"],
  translations: [{ language: "es", title: "Tallin", brief: "Premiado por FREETOUR.com. Gratis.", description: "Casco antiguo. Mejor visita del mundo (Premios FREETOUR.com). Desde 2019.", url: "u" }],
  city: { translations: { es: "Tallin" } }, country: { code: "ee" },
};
const findUnique = vi.fn(async () => structuredClone(ROW));
const findMany = vi.fn(async () => [structuredClone(ROW)]);
vi.mock("@/lib/prisma", () => ({ prisma: { tour: { findUnique, findMany } }, getD1: () => null }));
vi.mock("@/catalog/snapshot", () => ({ loadCatalog: async () => [{ id: "t1", cityId: 1, countryId: 1, categoryId: 12, price: 0, rating: 5, reviews: 1, durationMinutes: 60, createdAt: 0, updatedAt: 0, text: "tallin" }] }));
vi.mock("@/search/ranked", () => ({ rankedTourIds: async () => null }));

describe("REQ-1243 repositorio de tours sin la plataforma", () => {
  beforeEach(() => { findUnique.mockClear(); findMany.mockClear(); });

  it("REQ-1243 getTourById y getTourByExternalId (ficha, JSON-LD y initialTourData)", async () => {
    const { getTourById, getTourByExternalId } = await import("./tour-repository");
    for (const r of [await getTourById("t1", "es"), await getTourByExternalId(9, "es")]) {
      expect(mentionsPlatform(JSON.stringify(r))).toBe(false);
      expect(r!.translations[0].description).toBe("Casco antiguo. Desde 2019.");
      expect(r!.translations[0].title).toBe("Tallin");
      expect(r!.includes).toEqual(["Guía local"]);
    }
  });

  it("REQ-1243 getToursFromCatalog (lista de /tours en todos los idiomas)", async () => {
    const { getToursFromCatalog } = await import("./tour-repository");
    for (const language of ["es", "en", "pt"]) {
      const page = await getToursFromCatalog({ language }, { page: 1, limit: 20 });
      expect(page.data).toHaveLength(1);
      expect(mentionsPlatform(JSON.stringify(page.data))).toBe(false);
      expect(page.data[0].translations[0].brief).toBe("Gratis.");
    }
  });

  it("REQ-1243 un tour que no existe sigue siendo null", async () => {
    findUnique.mockResolvedValueOnce(null as never);
    const { getTourById } = await import("./tour-repository");
    expect(await getTourById("nada", "es")).toBeNull();
  });
});
