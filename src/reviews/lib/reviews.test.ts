import { describe, it, expect } from "vitest";
import { parseReviewsResponse, isCacheFresh, languageCode, pickReviews } from "./reviews";

const r = (id: number, over: Partial<Record<string, unknown>> = {}) => ({
  id, reviewerName: "Ana", language: "Spanish", title: "Genial", content: "Muy buen tour", rate: 5, addedAt: "2026-10-01 10:00:00", ...over,
});

describe("parseReviewsResponse", () => {
  it("lee la respuesta paginada de v.2.1", () => {
    const out = parseReviewsResponse({ data: { reviews: [r(1)], currentPage: 1, totalPages: 1, totalObjects: 1 }, status: 200 });
    expect(out.totalObjects).toBe(1);
    expect(out.reviews[0]).toMatchObject({ id: 1, reviewerName: "Ana", language: "Spanish", rate: 5 });
    expect(out.reviews[0].addedAt.toISOString()).toBe("2026-10-01T10:00:00.000Z");
  });

  it("también acepta la lista simple de v.2.0", () => {
    expect(parseReviewsResponse({ data: [r(1), r(2)], status: 200 }).totalObjects).toBe(2);
  });

  it("si no hay fecha usa una fecha base para no romper", () => {
    const out = parseReviewsResponse({ data: [r(3, { addedAt: undefined })], status: 200 });
    expect(out.reviews[0].addedAt.getTime()).toBe(0);
  });
});

describe("isCacheFresh", () => {
  const now = new Date("2026-10-30T12:00:00Z");
  it("vale 7 días", () => {
    expect(isCacheFresh(new Date("2026-10-24T12:00:01Z"), now)).toBe(true);
    expect(isCacheFresh(new Date("2026-10-23T11:59:59Z"), now)).toBe(false);
    expect(isCacheFresh(null, now)).toBe(false);
  });
});

describe("languageCode", () => {
  it("convierte el nombre del idioma de Freetour al código del sitio", () => {
    expect(languageCode("Spanish")).toBe("es");
    expect(languageCode("English")).toBe("en");
    expect(languageCode("Klingon")).toBeNull();
  });
});

describe("pickReviews", () => {
  const list = [
    { ...r(1, { language: "English", content: "Great" }), addedAt: new Date("2026-10-05") },
    { ...r(2, { content: "Excelente" }), addedAt: new Date("2026-10-04") },
    { ...r(3, { content: "" }), addedAt: new Date("2026-10-06") },
    { ...r(4, { rate: 3, content: "Regular" }), addedAt: new Date("2026-10-07") },
    { ...r(5, { content: "Bien" }), addedAt: new Date("2026-10-01") },
  ] as never;

  it("primero las del idioma pedido, luego el resto; solo con comentario y desde 4 estrellas", () => {
    expect(pickReviews(list, { lang: "es", limit: 3 }).map((x) => x.id)).toEqual([2, 5, 1]);
  });

  it("respeta el límite", () => {
    expect(pickReviews(list, { lang: "en", limit: 1 }).map((x) => x.id)).toEqual([1]);
  });
});
