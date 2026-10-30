import { describe, it, expect } from "vitest";
import { tourStatements } from "./sql";
import { MAX_PARAMS } from "@/lib/d1/batch";

const now = new Date("2026-10-30T10:00:00Z");
const row = (externalId: number) => ({
  tour: {
    externalId, providerTitle: "p", providerPhone: null, priceValue: 0, priceCurrency: "EUR", duration: "2:00",
    titleImageURL: null, categoryId: 1, rating: 4.5, reviewsNumber: 3, cityId: 10, countryId: 99,
    meetingPoint: { es: "Zócalo" }, includes: [], POIs: null, images: [], videoURL: null, isActive: true as const, lastSeenAt: now,
  },
  translations: ["en", "es", "pt", "de", "fr", "it"].map((language) => ({ language, title: `t-${language}`, brief: null, description: null, url: "u" })) as never,
});

describe("tourStatements", () => {
  const ids = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n"];
  let n = 0;
  const newId = () => ids[n++ % ids.length];

  it("guarda primero los tours y luego sus traducciones (que apuntan al tour por externalId)", () => {
    const stmts = tourStatements([row(6782)], now, newId);
    expect(stmts[0].sql).toMatch(/^INSERT INTO "Tour"/);
    expect(stmts[0].sql).toContain('ON CONFLICT ("externalId") DO UPDATE');
    expect(stmts[0].sql).not.toMatch(/SET .*"id" = excluded/);
    expect(stmts[0].sql).not.toMatch(/"createdAt" = excluded/);
    const tr = stmts[stmts.length - 1];
    expect(tr.sql).toMatch(/^INSERT INTO "TourTranslation"/);
    expect(tr.sql).toContain('(SELECT "id" FROM "Tour" WHERE "externalId" = ?)');
    expect(tr.sql).toContain('ON CONFLICT ("tourId", "language") DO UPDATE');
  });

  it("una página completa (100 tours) nunca pasa de 100 parámetros por sentencia y queda en pocas sentencias", () => {
    const stmts = tourStatements(Array.from({ length: 100 }, (_, i) => row(i + 1)), now, newId);
    expect(stmts.every((s) => s.params.length <= MAX_PARAMS)).toBe(true);
    expect(stmts.length).toBeLessThan(200);
  });
});
