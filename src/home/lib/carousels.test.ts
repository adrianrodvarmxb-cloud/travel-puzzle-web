import { describe, it, expect } from "vitest";
import { pickMostChosen, pickDayTrips, HOME_CAROUSEL_SIZE, DAY_TRIP_UNRATED_SLOTS, type RankCandidate } from "./carousels";

const prior = { m: 50, C: 4.7 };
const c = (key: string, o: Partial<RankCandidate> = {}): RankCandidate => ({
  key, city: `city-${key}`, country: `country-${key}`, format: "pieza-libre", rating: 4.8, reviews: 500, hasReviewSystem: true, dayTrip: false, ...o,
});

describe("REQ-450: «Los más elegidos» por medidor de reseñas, de cualquier proveedor y formato", () => {
  it("REQ-450: carrusel de 9", () => expect(HOME_CAROUSEL_SIZE).toBe(9));

  it("REQ-450: ordena por calificación bayesiana, no por número de reseñas", () => {
    const out = pickMostChosen([c("muchas", { rating: 4.6, reviews: 20000 }), c("mejor", { rating: 4.95, reviews: 800 }), c("nueva", { rating: 5, reviews: 4 })], prior);
    expect(out.map((x) => x.key)).toEqual(["mejor", "nueva", "muchas"]);
  });

  it("REQ-450: mezcla proveedores y formatos (no filtra por proveedor)", () => {
    const out = pickMostChosen([c("ft", { format: "pieza-libre" }), c("dmc", { format: "circuito", rating: 4.9, reviews: 60 }), c("bb", { format: "excursion-dia" })], prior);
    expect(out.map((x) => x.key).sort()).toEqual(["bb", "dmc", "ft"]);
  });

  it("REQ-450: fuera de este carrusel: online/servicios (fuera), traslados, transporte y sin reseñas reales", () => {
    const out = pickMostChosen([
      c("online", { format: "fuera", rating: 5, reviews: 9000 }),
      c("traslado", { format: "traslado", rating: 5, reviews: 9000 }),
      c("bus", { format: "transporte", rating: 5, reviews: 9000 }),
      c("propio", { format: "circuito", rating: null, reviews: 0, hasReviewSystem: false }),
      c("ok"),
    ], prior);
    expect(out.map((x) => x.key)).toEqual(["ok"]);
  });

  it("REQ-450: diversidad — máx. 2 por ciudad y 3 por formato en las primeras posiciones", () => {
    const roma = (k: string, r: number) => c(k, { city: "roma", rating: r });
    const out = pickMostChosen([roma("r1", 4.99), roma("r2", 4.98), roma("r3", 4.97), c("p1", { rating: 4.96 }), c("p2", { rating: 4.95 }), c("t1", { rating: 4.9, format: "tour" })], prior, 5);
    expect(out.map((x) => x.key)).toEqual(["r1", "r2", "p1", "t1", "p2"]);
  });
});

describe("REQ-453: «Excursiones de un día» con el mismo medidor y diversidad de destinos", () => {
  it("REQ-453: solo excursiones de un día", () => {
    const out = pickDayTrips([c("dia", { dayTrip: true }), c("pie", { dayTrip: false })], prior);
    expect(out.map((x) => x.key)).toEqual(["dia"]);
  });

  it("REQ-453: una por ciudad y máx. 2 por país en las primeras posiciones", () => {
    const out = pickDayTrips([
      c("m1", { dayTrip: true, city: "madrid", country: "es", rating: 4.99 }),
      c("m2", { dayTrip: true, city: "madrid", country: "es", rating: 4.98 }),
      c("b1", { dayTrip: true, city: "barcelona", country: "es", rating: 4.97 }),
      c("s1", { dayTrip: true, city: "sevilla", country: "es", rating: 4.96 }),
      c("l1", { dayTrip: true, city: "lima", country: "pe", rating: 4.9 }),
    ], prior, 4);
    expect(out.map((x) => x.key)).toEqual(["m1", "b1", "l1", "s1"]);
  });

  it("REQ-453: proveedores sin sistema de reseñas van al final, en hasta 2 lugares; los que sí tienen sistema pero 0 reseñas no entran", () => {
    expect(DAY_TRIP_UNRATED_SLOTS).toBe(2);
    const rated = Array.from({ length: 12 }, (_, i) => c(`r${i}`, { dayTrip: true, rating: 4.9 - i / 100 }));
    const out = pickDayTrips([
      ...rated,
      c("propio1", { dayTrip: true, rating: null, reviews: 0, hasReviewSystem: false }),
      c("propio2", { dayTrip: true, rating: null, reviews: 0, hasReviewSystem: false }),
      c("propio3", { dayTrip: true, rating: null, reviews: 0, hasReviewSystem: false }),
      c("ft-sin", { dayTrip: true, rating: null, reviews: 0, hasReviewSystem: true }),
    ], prior);
    expect(out).toHaveLength(9);
    expect(out.slice(0, 7).map((x) => x.key)).toEqual(["r0", "r1", "r2", "r3", "r4", "r5", "r6"]);
    expect(out.slice(7).map((x) => x.key)).toEqual(["propio1", "propio2"]);
  });

  it("REQ-453: si faltan con reseñas, los sin sistema de reseñas completan; sin inventario, vacío (la sección se oculta)", () => {
    const out = pickDayTrips([c("r", { dayTrip: true }), ...["a", "b", "d"].map((k) => c(k, { dayTrip: true, rating: null, reviews: 0, hasReviewSystem: false }))], prior);
    expect(out.map((x) => x.key)).toEqual(["r", "a", "b", "d"]);
    expect(pickDayTrips([], prior)).toEqual([]);
    expect(pickDayTrips([c("x", { dayTrip: false })], prior)).toEqual([]);
  });
});
