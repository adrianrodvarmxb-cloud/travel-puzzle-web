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
        findMany: async () => [{ id: "t99", externalId: 99, city: { translations: { en: "Budapest", es: "Budapest" } }, translations: [{ language: "es", title: "Free Tour de Budapest" }] }],
      },
    });
    const out = await loadHomeData({ prisma, highlights: { ...noHighlights, listRecentFiveStar: async () => [review] }, includePaid: false, lang: "es" });
    expect(out.reviews).toHaveLength(1);
    expect(out.reviews[0].tour).toEqual({ id: "t99", titles: { es: "Free Tour de Budapest" }, cityNames: { en: "Budapest", es: "Budapest" } });
  });
});
