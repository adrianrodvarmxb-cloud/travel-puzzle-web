import { describe, expect, it } from "vitest";
import { HOME_FIRST_PAGE, HOME_PAGE_SIZE, SEE_ALL_HREF, carouselOrder, carouselPage, orderDayTrips, orderMostChosen, parseCarouselQuery } from "./carousel-pages";
import { pickDayTrips, pickMostChosen, type RankCandidate } from "./carousels";
import { bayesScore, type Prior } from "./review-score";
import { parseTourRankRows } from "./rank-row";
import { FAVORITE_MIN_RATING, FAVORITE_MIN_REVIEWS } from "@/tours/lib/favorite";

const prior: Prior = { m: 50, C: 4.6 };
type C = RankCandidate & { title?: string };
const tour = (i: number, o: Partial<C> = {}): C => ({
  key: `tour:${i}`, city: `c${i % 40}`, country: `P${i % 9}`, format: "pieza-libre", rating: 4.9 + (i % 10) / 100, reviews: 180 + i * 7,
  hasReviewSystem: true, dayTrip: false, ...o,
});

describe("carruseles del inicio completos y por páginas (PO, 6-11 22:05)", () => {
  const tours = Array.from({ length: 140 }, (_, i) => tour(i));
  const noFav = [tour(900, { rating: 4.8, reviews: 5000 }), tour(901, { rating: 5, reviews: FAVORITE_MIN_REVIEWS - 1 })];

  it("REQ-850 (parte «nada que no sea Favorito» REEMPLAZADA por REQ-10515): «Los más elegidos» trae primero TODOS los Favoritos, una sola vez, y después el resto por puntaje", () => {
    const out = orderMostChosen([...tours, ...noFav], prior);
    expect(out).toHaveLength(142);
    expect(new Set(out.map((x) => x.key)).size).toBe(142);
    for (const x of out.slice(0, 140)) expect(x.rating! >= FAVORITE_MIN_RATING && x.reviews >= FAVORITE_MIN_REVIEWS).toBe(true);
    // REQ-10515: el resto por puntaje: 5.0 con 179 reseñas (4.95) antes que 4.8 con 5,000 (4.80)
    expect(out.slice(140).map((x) => x.key)).toEqual(["tour:901", "tour:900"]);
  });

  it("REQ-10515: un tour sin reseñas (p. ej. Tangol) entra a «Los más elegidos» con el puntaje del prior, después de los Favoritos y de lo que supera C", () => {
    const sin = tour(950, { rating: null, reviews: 0, providerId: "tangol" }); // mismo formato que los demás: así el orden es solo por puntaje
    const bajo = tour(951, { rating: 4.0, reviews: 300 }); // 4.08 < C
    const out = orderMostChosen([...tours.slice(0, 5), bajo, sin], prior);
    expect(out.slice(0, 5).map((x) => x.key).sort()).toEqual(["tour:0", "tour:1", "tour:2", "tour:3", "tour:4"]);
    expect(out.slice(5).map((x) => x.key)).toEqual(["tour:950", "tour:951"]);
  });

  it("REQ-10516: primera página con tope por proveedor: 140 Favoritos de freetour + 50 de tangol sin reseñas → tangol en la primera página; después, por puntaje", () => {
    const tangol = Array.from({ length: 50 }, (_, i) => tour(600 + i, { rating: null, reviews: 0, providerId: "tangol", format: "tour", city: `ar${i % 10}`, country: "AR" }));
    const out = orderMostChosen([...tours, ...tangol], prior);
    expect(out).toHaveLength(190);
    const first = out.slice(0, HOME_FIRST_PAGE);
    expect(first.filter((x) => x.providerId === "tangol").length).toBeGreaterThanOrEqual(1);
    expect(first.filter((x) => x.providerId !== "tangol").length).toBeLessThanOrEqual(8);
    expect(out.slice(HOME_FIRST_PAGE).filter((x) => x.providerId === "tangol")).toHaveLength(50 - first.filter((x) => x.providerId === "tangol").length);
    // las páginas siguientes: todos los Favoritos que faltan antes que el resto de tangol
    const rest = out.slice(HOME_FIRST_PAGE);
    const lastFav = rest.map((x) => x.providerId !== "tangol").lastIndexOf(true);
    const firstTangol = rest.findIndex((x) => x.providerId === "tangol");
    expect(lastFav).toBeLessThan(firstTangol);
  });

  it("REQ-850: el orden es el del medidor de reseñas con la diversidad de REQ-450: la primera página no cambia", () => {
    const out = orderMostChosen(tours, prior);
    expect(out.slice(0, HOME_FIRST_PAGE).map((x) => x.key)).toEqual(pickMostChosen(tours, prior, HOME_FIRST_PAGE).map((x) => x.key));
    // sin choques de ciudad ni formato, el orden es exactamente el del medidor
    const distinct = Array.from({ length: 30 }, (_, i) => tour(i, { city: `u${i}`, format: (["pieza-libre", "tour", "caminata"] as const)[i % 3] }));
    const scores = orderMostChosen(distinct, prior).slice(0, 6).map((x) => bayesScore(x.rating!, x.reviews, prior));
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });

  it("REQ-851: la paginación entrega todo, sin repetir ni saltar, y avisa cuándo ya no hay más", () => {
    const ordered = Array.from({ length: 140 }, (_, i) => i);
    const seen: number[] = [];
    let p = 1, more = true;
    while (more) { const r = carouselPage(ordered, p++); seen.push(...r.items); more = r.hasMore; expect(r.total).toBe(140); }
    expect(seen).toEqual(ordered);
    expect(carouselPage(ordered, 1).items).toHaveLength(HOME_FIRST_PAGE);
    expect(carouselPage(ordered, 2).items).toHaveLength(HOME_PAGE_SIZE);
    expect(carouselPage([1, 2, 3], 1)).toEqual({ items: [1, 2, 3], hasMore: false, total: 3 });
  });

  it("REQ-852: «Excursiones de un día» trae TODAS las excursiones (con y sin reseñas); la primera página es la de REQ-453 y no repite «Los más elegidos»", () => {
    const rated = Array.from({ length: 40 }, (_, i) => tour(200 + i, { dayTrip: true, format: "excursion-dia", rating: 4.5, reviews: 30 + i }));
    const unrated = Array.from({ length: 5 }, (_, i) => tour(300 + i, { dayTrip: true, format: "excursion-dia", rating: null, reviews: 0, hasReviewSystem: false }));
    const notDay = [tour(400, { dayTrip: false })];
    const out = orderDayTrips([...rated, ...unrated, ...notDay], prior, new Set(["tour:205"]));
    expect(out).toHaveLength(44);
    expect(out.map((x) => x.key)).not.toContain("tour:205");
    expect(out.map((x) => x.key)).not.toContain("tour:400");
    const pool = [...rated, ...unrated].filter((x) => x.key !== "tour:205");
    expect(out.slice(0, HOME_FIRST_PAGE).map((x) => x.key)).toEqual(pickDayTrips(pool, prior, HOME_FIRST_PAGE).map((x) => x.key));
  });

  it("REQ-853: nunca entra un producto con «FreeTour»/«Free Tour» en el título (REQ-219)", () => {
    const rows = [
      { id: "a", externalId: 1, cityId: 1, cityName: "Madrid", countryCode: "ES", categoryId: 12, durationMinutes: 120, price: 0, rating: 4.95, reviews: 900, titleEs: "FreeTour por Madrid", titleEn: "Madrid walk" },
      { id: "b", externalId: 2, cityId: 2, cityName: "Roma", countryCode: "IT", categoryId: 12, durationMinutes: 120, price: 0, rating: 4.95, reviews: 900, titleEs: "Roma esencial", titleEn: "Rome Free Tour" },
      { id: "c", externalId: 3, cityId: 3, cityName: "Lisboa", countryCode: "PT", categoryId: 12, durationMinutes: 120, price: 0, rating: 4.95, reviews: 900, titleEs: "Lisboa antigua", titleEn: "Old Lisbon" },
    ];
    const { ok } = parseTourRankRows(rows);
    const trips = [tour(500, { dayTrip: true, format: "excursion-dia", rating: null, reviews: 0, hasReviewSystem: false, title: "Free tour en Versalles" }), tour(501, { dayTrip: true, format: "excursion-dia", rating: null, reviews: 0, hasReviewSystem: false, title: "Versalles esencial" })];
    const { elegidos, excursiones } = carouselOrder({ tours: ok, dayTours: ok, trips, prior });
    expect(elegidos.map((x) => x.key)).toEqual(["tour:c"]);
    expect(excursiones.map((x) => x.key)).toEqual(["tour:501"]);
  });

  it("REQ-854: «Ver todas las experiencias →» lleva a /tours con el filtro de cada carrusel", () => {
    expect(SEE_ALL_HREF).toEqual({ elegidos: "/tours", excursiones: "/tours?tipo_act=excursiones" });
  });

  it("REQ-856: el endpoint solo acepta carruseles, páginas e idiomas válidos", () => {
    expect(parseCarouselQuery(new URLSearchParams("c=elegidos&p=2&lang=en"))).toEqual({ c: "elegidos", p: 2, lang: "en" });
    for (const q of ["c=otro&p=2", "c=elegidos&p=1", "c=elegidos&p=0", "c=elegidos&p=abc", "c=elegidos&p=2&lang=xx", "c=elegidos&p=999"]) expect(parseCarouselQuery(new URLSearchParams(q)), q).toBeNull();
  });
});

describe("REQ-858: «Excursiones de un día» solo con tarjetas que dicen «Excursión de un día»", () => {
  it("REQ-858: con el clasificador de la tarjeta, un viaje con audioguía o un tour corto no entran; una excursión sí", async () => {
    const { tripCandidate } = await import("./rank-row");
    const { isHomeDayTrip: isDayTrip } = await import("./day-trip");
    const rows = [
      { id: "x", externalId: 1, cityId: 1, cityName: "Cusco", countryCode: "PE", categoryId: 4, durationMinutes: 600, price: 40, rating: 4.7, reviews: 300, titleEs: "Excursión a Laguna Humantay", titleEn: "Humantay day trip" },
      { id: "y", externalId: 2, cityId: 2, cityName: "Madrid", countryCode: "ES", categoryId: 4, durationMinutes: 120, price: 40, rating: 4.7, reviews: 300, titleEs: "Visita guiada por el centro", titleEn: "Guided walk" },
    ];
    const { ok } = parseTourRankRows(rows, { isDayTrip });
    expect(ok.map((t) => [t.id, t.dayTrip])).toEqual([["x", true], ["y", false]]);
    expect(isDayTrip({ categoryId: 4, price: 0, durationMinutes: 600, titles: ["Excursión gratis a Toledo"] })).toBe(true); // pieza libre de un día
    expect(isDayTrip({ categoryId: 12, price: 30, durationMinutes: 120, titles: ["Versalles con audioguía"] })).toBe(false); // autoguiado
    const trip = (formato: string) => tripCandidate({ id: formato, kind: "tour", durationDays: 1, cities: ["París"], countries: ["FR"], titles: ["Versalles"], dayTrip: formato === "excursion-dia" });
    expect(trip("autoguiado").dayTrip).toBe(false);
    expect(trip("excursion-dia").dayTrip).toBe(true);
  });
});

describe("REQ-10515: isHomeDayTrip con el proveedor de la fila", () => {
  it("REQ-10515: una excursión de Tangol (cat 9000002, 10 h) es excursión de un día; sin providerId no lo sería", async () => {
    const { isHomeDayTrip } = await import("./day-trip");
    const i = { categoryId: 9000002, price: 120, durationMinutes: 600, titles: ["Excursión a Bariloche y Cerro Catedral"] };
    expect(isHomeDayTrip({ ...i, providerId: "tangol" })).toBe(true);
    expect(isHomeDayTrip(i)).toBe(false);
  });
});
