import { describe, it, expect } from "vitest";
import { pickMostChosen, pickDayTrips, HOME_CAROUSEL_SIZE, DAY_TRIP_UNRATED_SLOTS, PROVIDER_CAP, UNRATED_ENTER_BY_PRIOR, providerOf, type RankCandidate } from "./carousels";
import { HOME_FIRST_PAGE } from "./carousel-pages";

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

  it("REQ-450: fuera de este carrusel: online/servicios (fuera, en-linea, esenciales), traslados, transporte y alquiler; REQ-10515: sin reseñas reales SÍ entra (después, con el puntaje del prior)", () => {
    const out = pickMostChosen([
      c("online", { format: "fuera", rating: 5, reviews: 9000 }),
      c("en-linea", { format: "en-linea", rating: 5, reviews: 9000 }),
      c("servicios", { format: "esenciales-viaje", rating: 5, reviews: 9000 }),
      c("traslado", { format: "traslado", rating: 5, reviews: 9000 }),
      c("bus", { format: "transporte", rating: 5, reviews: 9000 }),
      c("renta", { format: "alquiler", rating: 5, reviews: 9000 }),
      c("propio", { format: "circuito", rating: null, reviews: 0, hasReviewSystem: false }),
      c("ok"),
    ], prior);
    expect(out.map((x) => x.key)).toEqual(["ok", "propio"]); // REQ-450 «sin reseñas reales no entra» REEMPLAZADO por REQ-10515
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

  it("REQ-453 (gate C6 REEMPLAZADO por REQ-10515): los sin reseñas (con o sin sistema de reseñas) entran por puntaje del prior, después de los que tienen reseñas mejores que C", () => {
    expect(DAY_TRIP_UNRATED_SLOTS).toBe(2); // constante conservada (reversible con UNRATED_ENTER_BY_PRIOR = false)
    expect(UNRATED_ENTER_BY_PRIOR).toBe(true);
    const rated = Array.from({ length: 12 }, (_, i) => c(`r${i}`, { dayTrip: true, rating: 4.9 - i / 100 }));
    const out = pickDayTrips([
      ...rated,
      c("propio1", { dayTrip: true, rating: null, reviews: 0, hasReviewSystem: false }),
      c("propio2", { dayTrip: true, rating: null, reviews: 0, hasReviewSystem: false }),
      c("propio3", { dayTrip: true, rating: null, reviews: 0, hasReviewSystem: false }),
      c("ft-sin", { dayTrip: true, rating: null, reviews: 0, hasReviewSystem: true }),
      c("malo", { dayTrip: true, rating: 3.9, reviews: 300 }),
    ], prior);
    expect(out).toHaveLength(9);
    // r0…r8 (4.9 … 4.82 con 500 reseñas) superan C = 4.7: los sin reseñas (= C) y «malo» (< C) quedan para las páginas siguientes
    expect(out.map((x) => x.key)).toEqual(["r0", "r1", "r2", "r3", "r4", "r5", "r6", "r7", "r8"]);
    const all = pickDayTrips([...rated, c("propio1", { dayTrip: true, rating: null, reviews: 0, hasReviewSystem: false }), c("ft-sin", { dayTrip: true, rating: null, reviews: 0, hasReviewSystem: true }), c("malo", { dayTrip: true, rating: 3.9, reviews: 300 })], prior, Number.POSITIVE_INFINITY);
    expect(all.slice(12).map((x) => x.key)).toEqual(["ft-sin", "propio1", "malo"]); // sin reseñas: C, desempate por llave; «malo» al final
  });

  it("REQ-453: si faltan con reseñas, los sin sistema de reseñas completan; sin inventario, vacío (la sección se oculta)", () => {
    const out = pickDayTrips([c("r", { dayTrip: true }), ...["a", "b", "d"].map((k) => c(k, { dayTrip: true, rating: null, reviews: 0, hasReviewSystem: false }))], prior);
    expect(out.map((x) => x.key)).toEqual(["r", "a", "b", "d"]);
    expect(pickDayTrips([], prior)).toEqual([]);
    expect(pickDayTrips([c("x", { dayTrip: false })], prior)).toEqual([]);
  });
});

describe("REQ-10516: tope por proveedor en la primera página (PO 13-11 16:00, opción A)", () => {
  const ft = (i: number, o: Partial<RankCandidate> = {}) => c(`ft${i}`, { providerId: "freetour", city: `f-city-${i % 60}`, format: (["pieza-libre", "tour", "caminata", "visita-guiada"] as const)[i % 4], rating: 4.85 + (i % 10) / 100, reviews: 200 + i, ...o });
  const tg = (i: number, o: Partial<RankCandidate> = {}) => c(`tg${i}`, { providerId: "tangol", city: `t-city-${i % 20}`, format: (["tour", "excursion-dia"] as const)[i % 2], rating: null, reviews: 0, ...o });

  it("REQ-10516: tope de 8 de 12 y sin proveedor en RankCandidate se asume freetour", () => {
    expect(PROVIDER_CAP).toBe(8);
    expect(providerOf(c("x"))).toBe("freetour");
    expect(providerOf(c("y", { providerId: "tangol" }))).toBe("tangol");
  });

  it("REQ-10516: 300 de freetour con reseñas + 50 de tangol sin reseñas → la primera página trae tangol (≤ 8 freetour, ≥ 1 tangol) y nadie se repite", () => {
    const pool = [...Array.from({ length: 300 }, (_, i) => ft(i)), ...Array.from({ length: 50 }, (_, i) => tg(i))];
    const page = pickMostChosen(pool, prior, HOME_FIRST_PAGE);
    expect(page).toHaveLength(12);
    const byProvider = page.reduce<Record<string, number>>((m, x) => ({ ...m, [providerOf(x)]: (m[providerOf(x)] ?? 0) + 1 }), {});
    expect(byProvider.freetour).toBeLessThanOrEqual(8);
    expect(byProvider.tangol).toBeGreaterThanOrEqual(1);
    expect(new Set(page.map((x) => x.key)).size).toBe(12);
    // el orden completo (n infinito) no lleva tope por proveedor: es el puntaje con la diversidad de siempre (REQ-450) y trae a todos
    const all = pickMostChosen(pool, prior, Number.POSITIVE_INFINITY);
    expect(new Set(all.map((x) => x.key)).size).toBe(350);
    expect(providerOf(all[349])).toBe("tangol"); // lo sin reseñas (= C) cierra la lista
  });

  it("REQ-10516: tres proveedores → los tres en la primera página aunque el tercero tenga un solo candidato con el peor puntaje", () => {
    const pool = [...Array.from({ length: 40 }, (_, i) => ft(i)), ...Array.from({ length: 40 }, (_, i) => tg(i)), c("solo", { providerId: "nuevo", rating: 3.2, reviews: 90, format: "tour" })];
    const page = pickMostChosen(pool, prior, HOME_FIRST_PAGE);
    expect(new Set(page.map(providerOf))).toEqual(new Set(["freetour", "tangol", "nuevo"]));
    expect(page.filter((x) => providerOf(x) === "freetour").length).toBeLessThanOrEqual(8);
  });

  it("REQ-10516: con un solo proveedor el tope se relaja y la página se llena igual que antes", () => {
    const pool = Array.from({ length: 30 }, (_, i) => ft(i));
    expect(pickMostChosen(pool, prior, HOME_FIRST_PAGE)).toHaveLength(12);
    expect(pickDayTrips(pool.map((x) => ({ ...x, dayTrip: true })), prior, HOME_FIRST_PAGE)).toHaveLength(12);
  });

  it("REQ-10516: «Excursiones de un día» con el mismo tope: 40 excursiones de freetour con reseñas + 10 de tangol sin reseñas → tangol en la primera página", () => {
    const pool = [...Array.from({ length: 40 }, (_, i) => ft(i, { dayTrip: true, format: "excursion-dia", country: `P${i % 30}` })), ...Array.from({ length: 10 }, (_, i) => tg(i, { dayTrip: true, format: "excursion-dia", country: "AR" }))];
    const page = pickDayTrips(pool, prior, HOME_FIRST_PAGE);
    expect(page).toHaveLength(12);
    expect(page.filter((x) => providerOf(x) === "freetour").length).toBeLessThanOrEqual(8);
    expect(page.some((x) => providerOf(x) === "tangol")).toBe(true);
  });
});
