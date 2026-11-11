import { describe, it, expect, vi } from "vitest";
import { placeTrips, placeKey, toMapTrip, tripCardTour, cardHref, type MapTrip } from "./trips";

const cities = [
  { id: 10, iso2: "PE", translations: { es: "Cusco", en: "Cuzco" } },
  { id: 11, iso2: "PE", translations: { es: "Lima" } },
  { id: 20, iso2: "CO", translations: { es: "Cartagena de Indias", en: "Cartagena" } },
];

const trip = (over: Partial<MapTrip>): MapTrip => ({
  id: "t", slug: "t", title: "Viaje", image: null, priceFrom: 100, currency: "USD", countries: ["PE"], cities: ["Cusco"], meetingPoints: [], ...over,
});

describe("viajes en el mapa", () => {
  it("REQ-1575: un viaje en una ciudad del catálogo suma en esa ciudad (país + nombre sin acentos, en cualquier idioma)", () => {
    const r = placeTrips([trip({ id: "a", cities: ["cuzco"] }), trip({ id: "b", countries: ["CO"], cities: ["Cartagena"] })], cities);
    expect(r.byCity.get(10)?.map((t) => t.id)).toEqual(["a"]);
    expect(r.byCity.get(20)?.map((t) => t.id)).toEqual(["b"]);
    expect(r.places).toEqual([]);
  });

  it("REQ-1575: un viaje de varias ciudades suma solo en la primera que existe en el catálogo (su ciudad de inicio)", () => {
    const r = placeTrips([trip({ id: "c", cities: ["Aguas Calientes", "Lima", "Cusco"] })], cities);
    expect(r.byCity.get(11)?.map((t) => t.id)).toEqual(["c"]);
    expect(r.byCity.has(10)).toBe(false);
  });

  it("REQ-1580: las notas entre paréntesis del proveedor no impiden el cruce («Beijing (solo)» → Pekín)", () => {
    const cn = [{ id: 30, iso2: "CN", translations: { es: "Pekín", en: "Beijing" } }];
    const r = placeTrips([trip({ id: "h", countries: ["CN"], cities: ["Beijing (solo)"], meetingPoints: [{ lat: 39.9, lng: 116.4 }] })], cn);
    expect(r.byCity.get(30)?.map((t) => t.id)).toEqual(["h"]);
    expect(r.places).toEqual([]);
  });

  it("REQ-1575: el mismo nombre en otro país no cuenta", () => {
    const r = placeTrips([trip({ id: "d", countries: ["MX"], cities: ["Lima"], meetingPoints: [] })], cities);
    expect(r.byCity.size).toBe(0);
  });

  it("REQ-1578: un lugar sin ciudad en el catálogo y con punto de encuentro lleva pin propio", () => {
    const r = placeTrips([
      trip({ id: "e", cities: ["Chachapoyas"], meetingPoints: [{ name: "Plaza", lat: -6.23, lng: -77.87 }] }),
      trip({ id: "f", cities: ["Chachapoyas"], meetingPoints: [{ name: "Hotel", lat: -6.25, lng: -77.85 }] }),
    ], cities);
    expect(r.places).toEqual([
      { key: placeKey("PE", "Chachapoyas"), iso2: "PE", name: "Chachapoyas", lat: -6.24, lng: -77.86, trips: [expect.objectContaining({ id: "e" }), expect.objectContaining({ id: "f" })] },
    ]);
  });

  it("REQ-1578: sin coordenadas no se pinta y se cuenta", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const r = placeTrips([trip({ id: "g", cities: ["Manu"], meetingPoints: [{ name: "Oficina", lat: null, lng: null }] })], cities);
    expect(r.places).toEqual([]);
    expect(r.skipped).toBe(1);
    warn.mockRestore();
  });

  it("REQ-1578: la llave del lugar es estable y apta para URL", () => {
    expect(placeKey("pe", "Islas del Rosario / Barú")).toBe("pe-islas-del-rosario-baru");
  });
});


describe("tarjeta del mapa con viajes", () => {
  it("REQ-1575: convierte la fila de Trip (JSON en texto o arreglo) y descarta puntos sin número", () => {
    const t = toMapTrip(
      { id: "x", slug: "machu-picchu", kind: "tour", titleEs: "Machu Picchu", images: '[{"key":"trips/x/1.jpg"}]', priceFrom: 120, currency: "USD", countries: '["PE"]', cities: ["Cusco"], meetingPoints: [{ name: "Plaza", lat: -13.5, lng: -71.9 }, { name: "Sin", lat: "x", lng: null }] },
      (k) => `https://img/${k}`,
    );
    expect(t).toEqual({ id: "x", slug: "machu-picchu", title: "Machu Picchu", image: "https://img/trips/x/1.jpg", priceFrom: 120, currency: "USD", countries: ["PE"], cities: ["Cusco"], meetingPoints: [{ name: "Plaza", lat: -13.5, lng: -71.9 }, { name: "Sin", lat: null, lng: null }] });
  });

  it("REQ-1575: el viaje en la tarjeta enlaza a su ficha pública y muestra su precio desde", () => {
    const c = tripCardTour(trip({ id: "y", slug: "lima-gastro", title: "Lima gastronómica", priceFrom: 85, currency: "USD" }));
    expect(c).toEqual({ id: "trip:y", href: "/viajes/peru/lima-gastro", titles: { es: "Lima gastronómica" }, image: null, rating: null, reviews: 0, isFree: false, price: 85, currency: "USD" });
    expect(cardHref(c)).toBe("/viajes/peru/lima-gastro");
    expect(cardHref({ id: "123" })).toBe("/tours/123");
  });
});
