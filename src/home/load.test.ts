import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { loadHomeData } from "./load";
import type { HighlightRepo } from "@/reviews/repository";

const fail = () => Promise.reject(new Error("D1 caído"));

/** Base falsa: todo falla salvo lo que se indique. */
function fakePrisma(overrides: Record<string, Record<string, unknown>> = {}) {
  const model = (name: string) => ({ groupBy: fail, findMany: fail, count: fail, ...(overrides[name] ?? {}) });
  return { tour: model("tour"), city: model("city"), country: model("country"), $queryRaw: fail } as unknown as PrismaClient;
}

const noHighlights: HighlightRepo = { listFiveStarForTours: async () => [], listRecentFiveStar: async () => [] };

describe("datos del inicio", () => {
  it("si la base falla, el inicio no se cae: cada sección sale vacía", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const out = await loadHomeData({ prisma: fakePrisma(), highlights: noHighlights, includePaid: false, lang: "es" });
    expect(out).toMatchObject({ hero: [], destinations: [], featured: [], continents: [], reviews: [] });
    expect(out.stats.tours).toBe(0);
  });

  it("las reseñas del inicio llevan su tour", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const review = { id: 1, tourExternalId: 99, reviewerName: "Ana", language: "Spanish", title: null, content: "Excelente recorrido por la ciudad", rate: 5, addedAt: new Date("2026-10-30") };
    const prisma = fakePrisma({
      tour: {
        findMany: async () => [{ id: "t99", externalId: 99, city: { translations: { en: "Budapest", es: "Budapest" } }, translations: [{ language: "es", title: "Recorrido por Budapest" }] }],
      },
    });
    const out = await loadHomeData({ prisma, highlights: { ...noHighlights, listRecentFiveStar: async () => [review] }, includePaid: false, lang: "es" });
    expect(out.reviews).toHaveLength(1);
    expect(out.reviews[0].tour).toEqual({ id: "t99", titles: { es: "Recorrido por Budapest" }, cityNames: { en: "Budapest", es: "Budapest" } });
  });

  it("REQ-219: la reseña cuyo tour se llama «FreeTour…» no sale; entra la siguiente", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const rv = (id: number, ext: number, days: number) => ({ id, tourExternalId: ext, reviewerName: "R" + id, language: "Spanish", title: null, content: "Excelente recorrido por la ciudad", rate: 5, addedAt: new Date(Date.UTC(2026, 9, 30) - days * 86400000) });
    const tours = [
      { id: "t1", externalId: 1, city: { translations: { es: "Tokio" } }, translations: [{ language: "es", title: "FreeTour a Pie por Shinjuku" }] },
      { id: "t2", externalId: 2, city: { translations: { es: "Lima" } }, translations: [{ language: "es", title: "Recorrido por el centro de Lima" }] },
    ];
    const prisma = fakePrisma({ tour: { findMany: async () => tours } });
    const out = await loadHomeData({ prisma, highlights: { ...noHighlights, listRecentFiveStar: async () => [rv(1, 1, 0), rv(2, 2, 1)] }, includePaid: false, lang: "es" });
    expect(out.reviews.map((r) => r.tour?.id)).toEqual(["t2"]);
  });

  it("REQ-219: «Los más elegidos» no incluye tours con la marca en el título (en ningún idioma)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const tour = (id: string, ext: number, title: string, en = title) => ({
      id, externalId: ext, cityId: ext, titleImageURL: "https://x/" + id + ".jpg", priceValue: 0, priceCurrency: "EUR", duration: "2", rating: 4.9, reviewsNumber: 500 - ext,
      country: { code: "MX" }, city: { translations: { es: "CDMX" } }, translations: [{ language: "es", title }, { language: "en", title: en }],
    });
    const list = [tour("a", 1, "Free Tour por el Centro"), tour("b", 2, "Recorrido por Coyoacán", "FreeTour Coyoacan"), tour("c", 3, "Recorrido por Xochimilco", "Xochimilco walk")];
    const prisma = fakePrisma({ tour: { findMany: async () => list } });
    const out = await loadHomeData({ prisma, highlights: noHighlights, includePaid: false, lang: "es" });
    expect(out.featured.map((t) => t.id)).toEqual(["c"]);
  });
});
