import { describe, expect, it } from "vitest";
import { homeItemLists, toursItemList } from "./listing-ld";
import type { HomeTour } from "@/home/load";
import type { TripCard } from "@/trips/public-load";

const site = "https://travelpuzzle.com.mx";
const ht = (id: string, title: string) => ({ id, externalId: 1, titles: { es: title, en: `${title} EN` }, cityNames: { es: "París" }, image: "", isFree: true, price: 0, currency: "EUR", duration: "2:00", rating: null, reviews: 0 }) as HomeTour;
const trip = { id: "v1", path: "/viajes/francia/louvre", title: "Louvre", cities: ["París"], places: "Francia", image: null, price: null, durationDays: 1 } as unknown as TripCard;
const resolve = new Map([["tour:t1", "/destinos/fr/paris/bastilla"], ["viaje:louvre", "/destinos/fr/paris/louvre"]]);

describe("REQ-582: ItemList de /tours y de los carruseles del inicio", () => {
  it("REQ-582: inicio = un ItemList por carrusel con el título en el idioma y la URL canónica", () => {
    const [feat, day] = homeItemLists({ siteUrl: site, lang: "es", featured: [ht("t1", "Bastilla")], dayTrips: [{ type: "trip", trip }], resolve });
    expect(feat).toMatchObject({ name: "Los más elegidos", itemListElement: [{ position: 1, name: "Bastilla", url: `${site}/destinos/fr/paris/bastilla` }] });
    expect(day).toMatchObject({ name: "Excursiones de un día", itemListElement: [{ name: "Louvre", url: `${site}/destinos/fr/paris/louvre` }] });
  });
  it("REQ-582: sin elementos no hay ItemList", () => {
    expect(homeItemLists({ siteUrl: site, lang: "es", featured: [], dayTrips: [], resolve })).toEqual([]);
  });
  it("REQ-582: /tours lista los tours de la página y los viajes", () => {
    const l = toursItemList({ siteUrl: site, name: "Experiencias", tours: [{ id: "t1", title: "Bastilla" }], trips: [trip], resolve })!;
    expect((l.itemListElement as { url: string }[]).map((x) => x.url)).toEqual([`${site}/destinos/fr/paris/bastilla`, `${site}/destinos/fr/paris/louvre`]);
  });
});
