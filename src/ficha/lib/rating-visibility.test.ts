import { describe, expect, it } from "vitest";
import { publicRating, showsProviderRating, withHiddenRating } from "./rating-visibility";
import { experienceCard } from "@/tours/lib/experience-card";
import { transformDBTourToUITour } from "@/lib/db/tour-transformer";

// REQ-10652 (construye la decisión 18, REQ-10596): la nota y el conteo de Tangol no se muestran en ficha ni
// tarjetas; el dato se conserva y solo se usa por dentro para ordenar.
describe("REQ-10652: la nota de Tangol no llega a la ficha ni a la tarjeta", () => {
  it("REQ-10652: Tangol queda sin nota y sin conteo para el visitante", () => {
    expect(showsProviderRating("tangol")).toBe(false);
    expect(publicRating("tangol", 4.8, 312)).toEqual({ rating: null, reviews: 0 });
    expect(publicRating(" Tangol ", "4.8", 312)).toEqual({ rating: null, reviews: 0 });
  });
  it("REQ-10652: el primer proveedor y los demás siguen como hoy", () => {
    for (const id of ["freetour", null, undefined, ""]) {
      expect(showsProviderRating(id)).toBe(true);
      expect(publicRating(id, 4.9, 200)).toEqual({ rating: 4.9, reviews: 200 });
    }
    expect(publicRating("freetour", null, undefined)).toEqual({ rating: null, reviews: 0 });
  });
  it("REQ-10652: la tarjeta de un tour de Tangol no pinta estrellas ni «Favorito», aunque el dato lo cumpla", () => {
    const base = { key: "t1", href: "/x", title: "Minitrekking", image: null, city: "El Calafate", duration: "8 h", formato: null, provider: "Travel Puzzle", price: null };
    const tangol = experienceCard({ ...base, rating: 4.9, reviews: 500, providerId: "tangol" }, "es");
    expect(tangol.rating).toBeNull();
    expect(tangol.favorite).toBeNull();
    const freetour = experienceCard({ ...base, rating: 4.9, reviews: 500, providerId: "freetour" }, "es");
    expect(freetour.rating).not.toBeNull();
    expect(freetour.favorite).not.toBeNull();
    const sinProveedor = experienceCard({ ...base, rating: 4.9, reviews: 500 }, "es");
    expect(sinProveedor.rating).not.toBeNull();
    // Inicio: no manda el providerId al navegador (REQ-10517), manda la marca de nota oculta.
    const inicio = experienceCard({ ...base, rating: 4.9, reviews: 500, ratingHidden: true }, "es");
    expect(inicio.rating).toBeNull();
    expect(inicio.favorite).toBeNull();
    expect(withHiddenRating(undefined, 4.9, 500)).toEqual({ rating: 4.9, reviews: 500 });
  });
  it("REQ-10652: el tour que llega a la ficha (servidor y navegador, INC-022) ya viene sin la nota de Tangol", () => {
    const row = {
      id: "t1", externalId: 9, providerId: "tangol", providerTitle: "Tangol Tours", providerPhone: null, priceValue: 120, priceCurrency: "USD",
      images: [], titleImageURL: null, duration: "8:00", meetingPoint: null, includes: [], rating: 4.8, reviewsNumber: 312, isActive: true,
      createdAt: new Date("2026-11-01"), translations: [{ language: "es", title: "Minitrekking", brief: "b", description: "d", url: "" }], city: { translations: [] },
    };
    const tour = transformDBTourToUITour(row as unknown as Parameters<typeof transformDBTourToUITour>[0], "es");
    expect(tour.rating).toBeNull();
    expect(tour.reviewsNumber).toBe(0);
    const ft = transformDBTourToUITour({ ...row, providerId: "freetour" } as unknown as Parameters<typeof transformDBTourToUITour>[0], "es");
    expect(ft.rating).toBe(4.8);
    expect(ft.reviewsNumber).toBe(312);
  });
});
