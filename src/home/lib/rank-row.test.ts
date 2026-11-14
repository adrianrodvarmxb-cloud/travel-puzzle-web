import { describe, it, expect } from "vitest";
import { parseTourRankRows, tripCandidate } from "./rank-row";

const row = (o: Record<string, unknown> = {}) => ({
  id: "t1", externalId: 10, cityId: 5, cityName: "Madrid", countryCode: "es", categoryId: 4, durationMinutes: 600,
  price: "0", rating: "4.9", reviews: 120, titleEs: "Excursión a Toledo desde Madrid", titleEn: "Toledo day trip", ...o,
});

describe("REQ-450: filas de la base validadas antes de rankear", () => {
  it("REQ-450: convierte decimales de D1 (texto o bigint) y calcula formato y excursión", () => {
    const { ok, dropped } = parseTourRankRows([row({ reviews: BigInt(120) })]);
    expect(dropped).toBe(0);
    expect(ok[0]).toMatchObject({ key: "tour:t1", city: "madrid", country: "ES", rating: 4.9, reviews: 120, format: "pieza-libre", dayTrip: true, hasReviewSystem: true });
  });

  it("REQ-450: una fila mala se descarta y se cuenta; las buenas siguen", () => {
    const { ok, dropped } = parseTourRankRows([row({ id: "" }), row({ reviews: -3 }), row({ price: "abc" }), null, row({ id: "t2" })]);
    expect(dropped).toBe(4);
    expect(ok.map((x) => x.id)).toEqual(["t2"]);
  });

  it("REQ-454: se salta la experiencia cuyo título (es o en) dice FreeTour o «free tour»", () => {
    const { ok, branded } = parseTourRankRows([row({ id: "a", titleEs: "Free Tour de Budapest" }), row({ id: "b", titleEn: "FREETOUR Lima" }), row({ id: "c" })]);
    expect(ok.map((x) => x.id)).toEqual(["c"]);
    expect(branded).toBe(2);
  });

  it("REQ-450: sin nombre de ciudad usa el id (la diversidad no se rompe)", () => {
    expect(parseTourRankRows([row({ cityName: null })]).ok[0].city).toBe("city:5");
  });
});

describe("REQ-453: viajes propios como candidatas", () => {
  it("REQ-453: sin sistema de reseñas; ciudad y país normalizados; excursión según el título en es o en", () => {
    const c = tripCandidate({ id: "v1", kind: "tour", durationDays: 1, cities: ["Lima", "Paracas"], countries: ["pe"], titles: ["Paracas e Islas Ballestas desde Lima", ""] });
    expect(c).toMatchObject({ key: "trip:v1", city: "lima", country: "PE", format: "excursion-dia", dayTrip: true, hasReviewSystem: false, reviews: 0, rating: null });
    expect(tripCandidate({ id: "v3", kind: "tour", durationDays: 1, cities: ["Cusco"], countries: ["PE"], dayTrip: true })).toMatchObject({ dayTrip: true, format: "excursion-dia" });
    expect(tripCandidate({ id: "v2", kind: "circuito", durationDays: 8, cities: ["Cusco"], countries: ["PE"], titles: ["Perú desde Lima"] }).dayTrip).toBe(false);
  });
});

describe("REQ-10515: el proveedor viaja con la fila y el formato sale del mapeo de su proveedor", () => {
  const tangol = (o: Record<string, unknown> = {}) => row({ id: "tg1", providerId: "tangol", categoryId: 9000002, durationMinutes: 600, price: "120", rating: null, reviews: 0, titleEs: "Excursión a Bariloche y Cerro Catedral", titleEn: "Bariloche and Cerro Catedral excursion", cityName: "Bariloche", countryCode: "ar", ...o });

  it("REQ-10515: sin providerId la fila es freetour (valor por defecto de la base); con él, se conserva", () => {
    expect(parseTourRankRows([row()]).ok[0].providerId).toBe("freetour");
    expect(parseTourRankRows([row({ providerId: null })]).ok[0].providerId).toBe("freetour");
    expect(parseTourRankRows([tangol()]).ok[0].providerId).toBe("tangol");
  });

  it("REQ-10515: un tour de Tangol sin reseñas entra como candidata (rating null, 0 reseñas) y su formato NO es «por-revisar»: usa el mapeo de Tangol", () => {
    const { ok, dropped } = parseTourRankRows([tangol()]);
    expect(dropped).toBe(0);
    expect(ok[0]).toMatchObject({ providerId: "tangol", rating: null, reviews: 0, hasReviewSystem: true, format: "excursion-dia", dayTrip: true });
  });

  it("REQ-10515: con la taxonomía encendida, el formato y lo publicable se deciden con el providerId (un traslado de Tangol no entra a ningún carrusel)", async () => {
    const { catalogClassifier } = await import("@/taxonomy/lib/publish");
    const { DEFAULT_DICTIONARY, DEFAULT_MAPPINGS } = await import("@/taxonomy/data");
    const { isOnSiteForRanking } = await import("./experience-format");
    const { isHomeDayTrip } = await import("./day-trip");
    const taxonomy = catalogClassifier(DEFAULT_DICTIONARY, DEFAULT_MAPPINGS);
    const traslado = Object.values(DEFAULT_MAPPINGS.tangol.categorias).find((c) => c.formato === "traslado")!;
    const { ok } = parseTourRankRows([tangol(), tangol({ id: "tg2", categoryId: Number(traslado.id), titleEs: "Traslado aeropuerto a hotel", titleEn: "Airport to hotel transfer", durationMinutes: 45 })], { taxonomy, isDayTrip: isHomeDayTrip });
    expect(ok.map((t) => [t.id, t.format, t.dayTrip])).toEqual([["tg1", "excursion-dia", true], ["tg2", "traslado", false]]);
    expect(isOnSiteForRanking(ok[1].format)).toBe(false); // lo filtra pickMostChosen / pickDayTrips
  });

  it("REQ-10515: con la taxonomía, el formato de un tour de FREETOUR tampoco cambia (cat 4 de pago, 10 h → excursión)", async () => {
    const { catalogClassifier } = await import("@/taxonomy/lib/publish");
    const { DEFAULT_DICTIONARY, DEFAULT_MAPPINGS } = await import("@/taxonomy/data");
    const { ok } = parseTourRankRows([row({ price: "40" })], { taxonomy: catalogClassifier(DEFAULT_DICTIONARY, DEFAULT_MAPPINGS) });
    expect(ok[0]).toMatchObject({ providerId: "freetour", format: "excursion-dia" });
  });

  it("REQ-10515: un viaje de agencia lleva su agencyId como proveedor; uno propio, «propios»", () => {
    expect(tripCandidate({ id: "v1", kind: "tour", durationDays: 1, cities: ["Lima"], countries: ["PE"], agencyId: "exotic" }).providerId).toBe("exotic");
    expect(tripCandidate({ id: "v2", kind: "tour", durationDays: 1, cities: ["Lima"], countries: ["PE"] }).providerId).toBe("propios");
  });
});
