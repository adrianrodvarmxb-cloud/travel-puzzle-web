import { describe, expect, it } from "vitest";
import type { Tour } from "@/types";
import type { HomeTour } from "@/home/load";
import type { TourCardModel } from "@/destinations/lib/catalog";
import type { TripCard } from "@/trips/public-load";
import { fromCatalogTour, fromDestinationTour, fromHomeTour, fromTripCard, withFinalHref } from "./card-sources";

const tour = {
  id: "t1", externalId: 1, title: "Free tour por Montmartre", brief: "Barrio de artistas.", description: null, destination: "París", provider: "FREETOUR.com",
  providerPhone: null, price: 0, currency: "EUR", images: ["https://img/1.jpg"], titleImageURL: null, duration: "2:00",
  meetingPoint: {} as Tour["meetingPoint"], includes: [], rating: 4.9, reviewsNumber: 320, bookingURL: "", isActive: true,
} as Tour;

describe("REQ-520: todas las fuentes dan la misma tarjeta", () => {
  it("REQ-520 REQ-524: /tours — pieza libre de FREETOUR sin la marca y con su categoría", () => {
    const m = fromCatalogTour(tour, { lang: "es", formato: "pieza-libre" });
    expect(m).toMatchObject({ category: "Pieza libre", meta: "París · 2 h", provider: null, favorite: "Favorito", price: { text: "Free tour", free: true }, description: "Barrio de artistas." });
    expect(fromCatalogTour({ ...tour, provider: "Montmartre Walks" }, { lang: "en", formato: "pieza-libre" })).toMatchObject({ category: "Free Puzzle" /* REQ-1103 */, provider: "Montmartre Walks", favorite: "Favorite" });
  });

  it("REQ-523: la frase de reseña real ocupa el lugar de la descripción cuando existe", () => {
    expect(fromCatalogTour(tour, { lang: "es", formato: "pieza-libre", highlight: "Increíble" }).description).toBe("“Increíble”");
  });

  it("REQ-525: tour de pago con etiqueta del servidor", () => {
    const m = fromCatalogTour({ ...tour, price: 99, provider: "Paris Day Trips" }, { lang: "es", formato: "excursion-dia", priceLabel: { main: "EUR €99", approx: "aprox. MXN $2,080" } });
    expect(m.price).toEqual({ text: "Desde aprox. MXN $2,080 · EUR €99", free: false });
    expect(m.category).toBe("Excursión de un día");
  });

  it("REQ-520: inicio — título, ciudad y descripción en el idioma del visitante", () => {
    const h: HomeTour = { id: "h1", externalId: 2, titles: { es: "Excursión a Versalles", en: "Versailles day trip" }, cityNames: { es: "París", en: "Paris" }, image: "https://img/2.jpg",
      isFree: false, price: 80, currency: "EUR", duration: "8:00", rating: 4.7, reviews: 12, provider: "Versailles Guides", formato: "excursion-dia", durationMinutes: 480, briefs: { en: "Palace and gardens." } };
    expect(fromHomeTour(h, { lang: "en" })).toMatchObject({ title: "Versailles day trip", meta: "Paris · 8 h", category: "Day trip", provider: "Versailles Guides", favorite: null, description: "Palace and gardens.", price: { text: "From EUR 80", free: false } });
  });

  it("REQ-520 REQ-522: /destinos y La Primera Pieza", () => {
    const d: TourCardModel = { id: "d1", href: "/destinos/fr/paris/x", title: "Free tour Louvre", provider: "Ana", image: null, isFreeTour: true, price: 0, currency: "EUR",
      rating: null, reviews: 0, duration: "1:30", kind: "free", updatedAt: "", formato: "pieza-libre", city: "París" };
    expect(fromDestinationTour(d, { price: null })).toMatchObject({ category: "Pieza libre", meta: "París · 1 h 30 min", rating: null, provider: "Ana" });
    const own: TourCardModel = { ...d, kind: "own", isFreeTour: false, formato: "circuito", priceLabel: "Desde MXN $25,000", durationDays: 8, provider: "Exotic Escapes", duration: null };
    expect(fromDestinationTour(own, { price: null })).toMatchObject({ category: "Circuito", meta: "París · 8 días", price: { text: "Desde MXN $25,000", free: false }, provider: "Exotic Escapes" });
  });

  it("REQ-520 REQ-524: viajes de agencias — Big Bus con su nombre y categoría de transporte", () => {
    const t = { id: "b1", path: "/viajes/big-bus-paris", code: "BB-1", kind: "transporte", title: "Big Bus París", summary: "Sube y baja.", image: "https://img/3.jpg", countries: ["FR"], places: "Francia",
      cities: ["París"], durationDays: 1, price: { main: "MXN $1,050", original: "EUR €49", rateNote: null }, priceFrom: 49, languages: [], dates: [], group: "", freeCancel: false, private: false,
      hotelPickup: false, createdAt: 0, durationMinutes: 1440, provider: "Big Bus Tours", formato: "transporte" } as unknown as TripCard;
    expect(fromTripCard(t, "es", "Desde")).toMatchObject({ category: "Transporte turístico", meta: "París · 1 día", provider: "Big Bus Tours", price: { text: "Desde MXN $1,050 · EUR €49", free: false }, rating: null });
  });
});

describe("REQ-668: las tarjetas enlazan la ficha final", () => {
  const resolve = new Map([["tour:t1", "/destinos/fr/paris/free-tour-montmartre"]]);
  it("REQ-668: /tours e inicio usan la ficha final cuando existe; si no, /tours/{id} como antes", () => {
    expect(fromCatalogTour(tour, { lang: "es", href: resolve.get("tour:t1") }).href).toBe("/destinos/fr/paris/free-tour-montmartre");
    expect(fromCatalogTour(tour, { lang: "es" }).href).toBe("/tours/t1");
    const fin = withFinalHref(resolve);
    expect(fin({ id: "t1" }).href).toBe("/destinos/fr/paris/free-tour-montmartre");
    expect(fin({ id: "t9" }).href).toBe("/tours/t9");
    expect(withFinalHref(undefined)({ id: "t1" }).href).toBe("/tours/t1");
    const h = { id: "t1", externalId: 1, titles: { es: "A" }, cityNames: { es: "París" }, image: "", isFree: true, price: 0, currency: "EUR", duration: "2:00", rating: null, reviews: 0 } as HomeTour;
    expect(fromHomeTour(fin(h), { lang: "en" }).href).toBe("/destinos/fr/paris/free-tour-montmartre");
  });
  it("REQ-665: la tarjeta de /destinos en el idioma de la página", () => {
    const d: TourCardModel = { id: "d1", href: "/destinos/fr/paris/x", title: "Louvre", provider: "Ana", image: null, isFreeTour: true, price: 0, currency: "EUR",
      rating: null, reviews: 0, duration: "1:30", kind: "free", updatedAt: "", formato: "pieza-libre", city: "Paris" };
    expect(fromDestinationTour(d, { price: null, lang: "en" }).category).toBe("Free Puzzle") // REQ-1103;
  });
});
