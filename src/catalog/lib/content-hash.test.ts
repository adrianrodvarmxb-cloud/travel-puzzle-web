import { describe, it, expect } from "vitest";
import { canonicalJson, contentHash, classify } from "./content-hash";
import type { TourRow, TranslationRow } from "./tour-rows";

const base = (over: Partial<TourRow> = {}): { tour: TourRow; translations: TranslationRow[] } => ({
  tour: {
    externalId: 1, providerTitle: "Guía", providerPhone: null, priceValue: 0, priceCurrency: "EUR", duration: "2:00",
    durationMinutes: 120, titleImageURL: null, categoryId: 1, rating: 4.8, reviewsNumber: 120, cityId: 10, countryId: 99,
    meetingPoint: { b: 1, a: 2 }, includes: [], POIs: null, images: [], videoURL: null, isActive: true,
    lastSeenAt: new Date("2026-11-05T09:00:00Z"), ...over,
  },
  translations: [{ language: "es", title: "Centro histórico", brief: null, description: null, url: "u" }],
});

describe("canonicalJson", () => {
  it("REQ-073: ordena las llaves para que el mismo contenido dé el mismo texto", () => {
    expect(canonicalJson({ b: 1, a: { d: 1, c: [2, 1] } })).toBe('{"a":{"c":[2,1],"d":1},"b":1}');
  });
});

describe("contentHash", () => {
  it("REQ-073: es sha-256 en hexadecimal y estable", async () => {
    const h = await contentHash(base());
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(await contentHash(base())).toBe(h);
  });

  it("REQ-073: la calificación, el número de reseñas y la fecha de la corrida no cambian el hash", async () => {
    const h = await contentHash(base());
    expect(await contentHash(base({ rating: 3.1, reviewsNumber: 999, lastSeenAt: new Date("2030-01-01") }))).toBe(h);
  });

  it("REQ-073: un cambio de título, precio o punto de encuentro sí cambia el hash", async () => {
    const h = await contentHash(base());
    const renamed = base();
    renamed.translations[0].title = "Centro histórico (nuevo)";
    expect(await contentHash(renamed)).not.toBe(h);
    expect(await contentHash(base({ priceValue: 10 }))).not.toBe(h);
    expect(await contentHash(base({ meetingPoint: { a: 3 } }))).not.toBe(h);
  });
});

describe("classify", () => {
  it("REQ-073: nuevo si no existe; cambiado si el hash difiere o no tenía hash", () => {
    expect(classify("h1", { rating: 4, reviewsNumber: 1 }, undefined)).toBe("new");
    expect(classify("h1", { rating: 4, reviewsNumber: 1 }, { contentHash: "h0", rating: 4, reviewsNumber: 1 })).toBe("changed");
    expect(classify("h1", { rating: 4, reviewsNumber: 1 }, { contentHash: null, rating: 4, reviewsNumber: 1 })).toBe("changed");
  });

  it("REQ-073: mismo hash y misma calificación = sin escritura; solo cambió la calificación = rating", () => {
    expect(classify("h1", { rating: 4.5, reviewsNumber: 10 }, { contentHash: "h1", rating: 4.5, reviewsNumber: 10 })).toBe("same");
    expect(classify("h1", { rating: 4.6, reviewsNumber: 10 }, { contentHash: "h1", rating: 4.5, reviewsNumber: 10 })).toBe("rating");
    expect(classify("h1", { rating: 4.5, reviewsNumber: 11 }, { contentHash: "h1", rating: 4.5, reviewsNumber: 10 })).toBe("rating");
    expect(classify("h1", { rating: null, reviewsNumber: 0 }, { contentHash: "h1", rating: null, reviewsNumber: 0 })).toBe("same");
  });

  it("REQ-10514: punto de encuentro, incluye/no incluye, política, idiomas y reglas de disponibilidad SÍ cambian el hash", async () => {
    const rico = () => ({
      ...base(),
      tour: { ...base().tour, excludes: ["Propinas"], cancellationPolicy: "48 h", guideLanguages: ["es"], availabilityRules: { options: [] } },
    });
    const h = await contentHash(rico());
    expect(await contentHash(rico())).toBe(h);
    expect(await contentHash(base())).not.toBe(h);
    const con = (tour: Record<string, unknown>) => contentHash({ ...rico(), tour: { ...rico().tour, ...tour } });
    expect(await con({ includes: ["Guía"] })).not.toBe(h);
    expect(await con({ excludes: [] })).not.toBe(h);
    expect(await con({ cancellationPolicy: "24 h" })).not.toBe(h);
    expect(await con({ guideLanguages: ["es", "en"] })).not.toBe(h);
    expect(await con({ availabilityRules: { options: [{ code: "A" }] } })).not.toBe(h);
    expect(await con({ meetingPoint: { title: "Obelisco" } })).not.toBe(h);
    // La calificación y las reseñas siguen fuera del hash (REQ-073): las actualiza la vía de «rating».
    expect(await con({ rating: 4.9, reviewsNumber: 1 })).toBe(h);
  });
});
