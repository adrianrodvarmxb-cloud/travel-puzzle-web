import { describe, it, expect } from "vitest";
import { toTourRows, cityIdsOf, countryRow } from "./tour-rows";

const t = (s: string) => ({ en: `${s} en`, es: `${s} es`, pt: "", de: "", fr: "", it: "" });
const apiTour = {
  id: 6782,
  updatedAt: "2026-10-01 10:00:00",
  title: t("Mpika"),
  brief: t("breve"),
  description: t("desc"),
  providerTitle: "Generation Tours Affiliate",
  providerPhone: null,
  URL: "https://www.freetour.com/mpika/x",
  URLs: { en: "https://en", es: "https://es", pt: "", de: "", fr: "", it: "" },
  price: { value: 0, currency: "EUR" },
  length: "2:00",
  meetingPoint: { title: "Plaza" },
  cityId: 4755,
  countryId: 220,
  includes: ["Guía"],
  POIs: null,
  titleImageURL: null,
  categoryId: 1,
  images: null,
  videoURL: null,
  rating: 4.8,
  reviewsNumber: 12,
};

describe("toTourRows", () => {
  const seenAt = new Date("2026-10-30T09:00:00Z");
  const rows = toTourRows(apiTour as never, seenAt);

  it("arma el tour con precio, ciudad, país y marca de visto hoy", () => {
    expect(rows.tour).toMatchObject({ externalId: 6782, priceValue: 0, priceCurrency: "EUR", cityId: 4755, countryId: 220, duration: "2:00", isActive: true, lastSeenAt: seenAt });
    expect(rows.tour.images).toEqual([]);
  });

  it("solo crea traducciones de idiomas con título y URL", () => {
    expect(rows.translations.map((r) => r.language)).toEqual(["en", "es"]);
    expect(rows.translations[1]).toEqual({ language: "es", title: "Mpika es", brief: "breve es", description: "desc es", url: "https://es" });
  });
});

describe("helpers", () => {
  it("cityIdsOf agrupa ciudades por país sin repetir", () => {
    const tours = [{ cityId: 1, countryId: 9 }, { cityId: 1, countryId: 9 }, { cityId: 2, countryId: 9 }, { cityId: 3, countryId: 8 }];
    expect(cityIdsOf(tours as never)).toEqual(new Map([[9, [1, 2]], [8, [3]]]));
  });

  it("countryRow usa el nombre en cada idioma y el código corto", () => {
    const c = { id: 99, shortTitle: "mx", title: { en: "Mexico", es: "México", pt: "México", de: "Mexiko", fr: "Mexique", it: "Messico" } };
    expect(countryRow(c as never)).toEqual({ id: 99, code: "MX", translations: c.title });
  });
});
