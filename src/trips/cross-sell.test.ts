import { describe, expect, it } from "vitest";
import { cityLabel, toursForPlace, transportForPlace, type CrossSellDeps } from "./cross-sell";
import type { TripCard } from "./public-load";

const card = (id: string, kind: TripCard["kind"], cities: string[], countries: string[]): TripCard => ({
  id, path: `/viajes/x/${id}`, code: id, kind, title: `T ${id}`, summary: "", image: null, countries, places: "", cities, durationDays: 1,
  price: { main: "MXN $630", original: null, rateNote: null }, priceFrom: 630,
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
