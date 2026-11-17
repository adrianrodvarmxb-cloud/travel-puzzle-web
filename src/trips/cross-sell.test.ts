import { describe, expect, it } from "vitest";
import { cityLabel, toursForPlace, transportForPlace, transportOrigin, type CrossSellDeps } from "./cross-sell";
import type { TripCard } from "./public-load";

const card = (id: string, kind: TripCard["kind"], cities: string[], countries: string[]): TripCard => ({
  id, path: `/viajes/x/${id}`, code: id, kind, title: `T ${id}`, summary: "", image: null, countries, places: "", cities, durationDays: 1,
  price: { main: "MXN $630", original: null, rateNote: null }, priceFrom: 630, languages: [], dates: [], group: "otros", freeCancel: false, private: false, hotelPickup: false, createdAt: 0, durationMinutes: null,
});

const deps: CrossSellDeps = {
  tripCards: async () => [card("bus-par", "transporte", ["París"], ["FR"]), card("circ", "circuito", ["París"], ["FR"]), card("bus-lon", "transporte", ["Londres"], ["GB"])],
  toursInCountry: async (cc) => cc === "FR" ? [
    { id: "t1", title: "Montmartre", image: null, price: null, cityName: "Paris", countryCode: "FR" },
    { id: "t2", title: "Lyon viejo", image: null, price: null, cityName: "Lyon", countryCode: "FR" },
  ] : [],
};

describe("transportForPlace", () => {
  it("REQ-005: solo transporte de la ciudad del tour, con precio ya formateado", async () => {
    const r = await transportForPlace({ city: "Paris", country: "FR" }, "es", deps);
    expect(r).toEqual([{ id: "bus-par", path: "/viajes/x/bus-par", title: "T bus-par", image: null, price: "MXN $630" }]);
  });
  it("REQ-005: sin transporte en el lugar no hay nada que ofrecer", async () => {
    expect(await transportForPlace({ city: "Lima", country: "PE" }, "es", deps)).toEqual([]);
  });
});

describe("toursForPlace", () => {
  it("REQ-007: tours de la misma ciudad del transporte", async () => {
    const r = await toursForPlace({ city: "París", country: "FR" }, "es", deps);
    expect(r.map((x) => x.path)).toEqual(["/tours/t1"]);
  });
  it("REQ-007: sin país no consulta nada", async () => {
    expect(await toursForPlace({ city: "París", country: null }, "es", deps)).toEqual([]);
  });
});

describe("cityLabel", () => {
  it("REQ-005: idioma pedido, luego español, luego inglés", () => {
    expect(cityLabel({ es: "París", en: "Paris" }, "fr")).toBe("París");
    expect(cityLabel({ en: "Paris" }, "es")).toBe("Paris");
    expect(cityLabel(null, "es")).toBeNull();
  });
});

describe("transportForPlace con «Cerca» único (REQ-10752)", () => {
  const far = card("bus-mad", "transporte", ["Madrid"], ["ES"]);
  const near = { ...card("bus-tol", "transporte", ["Toledo"], ["ES"]), mapPoint: { lat: 39.86, lng: -4.02 } };
  const nearer = { ...card("bus-get", "transporte", ["Getafe"], ["ES"]), mapPoint: { lat: 40.3, lng: -3.73 } };
  const other = { ...card("bus-lis", "transporte", ["Lisboa"], ["PT"]), mapPoint: { lat: 38.72, lng: -9.14 } };
  const d: CrossSellDeps = { ...deps, tripCards: async () => [far, near, nearer, other, card("circ-es", "circuito", ["Madrid"], ["ES"])] };

  it("REQ-10752: apagada, sigue la regla de hoy (ciudad → país, sin distancia)", async () => {
    const r = await transportForPlace({ city: "Alcalá", country: "ES" }, "es", d, { unified: false, origin: { point: { lat: 40.48, lng: -3.36 }, provider: "freetour" } });
    expect(r.map((x) => x.id)).toEqual(["bus-mad", "bus-tol", "bus-get"]);
  });
  it("REQ-10752: encendida, misma ciudad primero", async () => {
    const r = await transportForPlace({ city: "Toledo", country: "ES" }, "es", d, { unified: true, origin: { point: null, provider: "tangol" } });
    expect(r.map((x) => x.id)).toEqual(["bus-tol"]);
  });
  it("REQ-10752: encendida, sin ciudad igual, el mismo país ordenado por distancia al punto de la ficha", async () => {
    const r = await transportForPlace({ city: "Alcalá", country: "ES" }, "es", d, { unified: true, origin: { point: { lat: 40.48, lng: -3.36 }, provider: "freetour" } });
    expect(r.map((x) => x.id)).toEqual(["bus-get", "bus-tol", "bus-mad"]);
  });
  it("REQ-10752: encendida y sin punto, el mismo país en el orden de entrada (no se inventa distancia)", async () => {
    const r = await transportForPlace({ city: "Alcalá", country: "ES" }, "es", d, { unified: true, origin: { point: null, provider: null } });
    expect(r.map((x) => x.id)).toEqual(["bus-mad", "bus-tol", "bus-get"]);
  });
  it("REQ-10752: encendida, sin ciudad ni país iguales, por radio desde el punto (ningún FREETOUR entre los candidatos)", async () => {
    const r = await transportForPlace({ city: "Badajoz", country: null }, "es", d, { unified: true, origin: { point: { lat: 38.88, lng: -6.97 }, provider: "freetour" } });
    expect(r.map((x) => x.id)).toEqual(["bus-lis", "bus-tol"]); // Lisboa ~210 km y Toledo ~290 km: los dos dentro de 300 km, la más cercana primero
  });
  it("REQ-10752: encendida, solo transporte; un circuito de la misma ciudad no entra en la franja", async () => {
    const r = await transportForPlace({ city: "Madrid", country: "ES" }, "es", d, { unified: true, origin: { point: null, provider: null } });
    expect(r.map((x) => x.id)).toEqual(["bus-mad"]);
  });
});

describe("transportOrigin (REQ-10752)", () => {
  it("REQ-10752: punto exacto del tour cuando lo hay", () => {
    expect(transportOrigin({ coordinates: "40.41,-3.70" }, { lat: 40.0, lng: -3.0 }, "freetour")).toEqual({ point: { lat: 40.41, lng: -3.7 }, provider: "freetour" });
  });
  it("REQ-10752: sin punto exacto (o relleno de FREETOUR), las coordenadas de su ciudad (REQ-10735)", () => {
    expect(transportOrigin({ coordinates: "51.478,0.0015" }, { lat: 40.0, lng: -3.0 }, "freetour").point).toEqual({ lat: 40.0, lng: -3.0 });
    expect(transportOrigin(null, { lat: 40.0, lng: -3.0 }, "tangol").point).toEqual({ lat: 40.0, lng: -3.0 });
  });
  it("REQ-10752: sin punto ni ciudad con coordenadas, null (nunca un punto inventado)", () => {
    expect(transportOrigin(null, { lat: null, lng: null }, null)).toEqual({ point: null, provider: null });
  });
});
