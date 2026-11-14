import { describe, expect, it, vi } from "vitest";
import { cityLabel, toursForPlace, transportForPlace, type CrossSellDeps } from "./cross-sell";
import type { ProviderTransfer } from "./lib/transfer-cross-sell";
import type { TripCard } from "./public-load";

const card = (id: string, kind: TripCard["kind"], cities: string[], countries: string[]): TripCard => ({
  id, path: `/viajes/x/${id}`, code: id, kind, title: `T ${id}`, summary: "", image: null, countries, places: "", cities, durationDays: 1,
  price: { main: "MXN $630", original: null, rateNote: null }, priceFrom: 630, languages: [], dates: [], group: "otros", freeCancel: false, private: false, hotelPickup: false, createdAt: 0, durationMinutes: null,
});

const transfer = (id: string, cityName: string, countryCode: string, reviews: number): ProviderTransfer =>
  ({ id, title: `Traslado ${id}`, image: null, price: "EUR 24", cityName, countryCode, reviews, rating: 4.6 });

const deps: CrossSellDeps = {
  tripCards: async () => [card("bus-par", "transporte", ["París"], ["FR"]), card("circ", "circuito", ["París"], ["FR"]), card("bus-lon", "transporte", ["Londres"], ["GB"])],
  toursInCountry: async (cc) => cc === "FR" ? [
    { id: "t1", title: "Montmartre", image: null, price: null, cityName: "Paris", countryCode: "FR" },
    { id: "t2", title: "Lyon viejo", image: null, price: null, cityName: "Lyon", countryCode: "FR" },
  ] : [],
  // REQ-3428: traslados de proveedor del país (ya validados por lib/transfer-cross-sell.ts).
  providerTransfersInCountry: async (cc) => cc === "FR"
    ? [transfer("tr-par", "Paris", "FR", 40), transfer("tr-par2", "París", "FR", 900), transfer("tr-lyon", "Lyon", "FR", 10)]
    : cc === "PE" ? [transfer("tr-lima", "Lima", "PE", 7)] : [],
};

describe("transportForPlace", () => {
  it("REQ-005: el viaje propio de la ciudad del tour va primero, con precio ya formateado", async () => {
    const r = await transportForPlace({ city: "Paris", country: "FR" }, "es", deps);
    expect(r[0]).toEqual({ id: "bus-par", path: "/viajes/x/bus-par", title: "T bus-par", image: null, price: "MXN $630" });
  });
  it("REQ-005: sin transporte ni traslados en el lugar no hay nada que ofrecer", async () => {
    expect(await transportForPlace({ city: "Tokio", country: "JP" }, "es", deps)).toEqual([]);
  });

  it("REQ-3428: ciudad con traslado propio y de proveedor: salen los dos, el propio primero y el de proveedor por reseñas", async () => {
    const r = await transportForPlace({ city: "París", country: "FR" }, "es", deps);
    expect(r.map((x) => x.path)).toEqual(["/viajes/x/bus-par", "/tours/tr-par2", "/tours/tr-par"]);
    expect(r[1]).toEqual({ id: "tr-par2", path: "/tours/tr-par2", title: "Traslado tr-par2", image: null, price: "EUR 24" });
  });

  it("REQ-3428: ciudad con solo traslados de proveedor: antes no había franja, ahora sí", async () => {
    const r = await transportForPlace({ city: "Lima", country: "PE" }, "es", deps);
    expect(r.map((x) => x.id)).toEqual(["tr-lima"]);
  });

  it("REQ-3428: sin país no se le piden traslados al proveedor", async () => {
    const providerTransfersInCountry = vi.fn(deps.providerTransfersInCountry);
    const r = await transportForPlace({ city: "París", country: null }, "es", { ...deps, providerTransfersInCountry });
    expect(providerTransfersInCountry).not.toHaveBeenCalled();
    expect(r.map((x) => x.id)).toEqual(["bus-par"]);
  });

  it("REQ-3428: si la consulta de traslados falla, la franja sigue con los viajes propios", async () => {
    const r = await transportForPlace({ city: "París", country: "FR" }, "es", {
      ...deps, providerTransfersInCountry: async () => { throw new Error("D1 caída"); },
    });
    expect(r.map((x) => x.id)).toEqual(["bus-par"]);
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
