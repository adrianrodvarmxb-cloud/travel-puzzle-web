import { describe, it, expect } from "vitest";
import { destinationTree, findCity, isListed, ownTripPlace, type TripRow } from "./catalog";
import { fx, tour, words } from "../fixtures/destinos";

const now = new Date("2026-11-05T12:00:00Z");
describe("REQ-088: árbol de destinos generado desde los datos", () => {
  const tours = [tour(10, 1), tour(10, 1), tour(10, 1, { price: 15 }), tour(11, 1), tour(20, 2), tour(30, 3)];
  const tree = destinationTree({ ...fx, tours, trips: [], now });

  it("REQ-088: solo países con ISO-2; slug del país = ISO-2 en minúsculas", () => {
    expect(tree.map((c) => c.slug)).toEqual(["mx", "pe"]);
    expect(tree[0].href).toBe("/destinos/mx");
  });

  it("REQ-088: la ciudad tiene secciones de free tours y tours; las URLs no llevan el id de FREETOUR", () => {
    const hit = findCity(tree, "mx", "ciudad-de-mexico")!;
    expect(hit.city.freeTours).toHaveLength(2);
    expect(hit.city.paidTours).toHaveLength(1);
    for (const t of [...hit.city.freeTours, ...hit.city.paidTours]) {
      expect(t.href).toMatch(/^\/destinos\/mx\/ciudad-de-mexico\/tour-\d+$/);
      expect(t.href).not.toContain(String(tours.find((x) => x.id === t.id)!.externalId));
    }
  });

  it("REQ-088: con slugs nulos (como hoy en producción) no aparece nada y no truena", () => {
    const empty = destinationTree({
      countries: fx.countries.map((c) => ({ ...c, iso2: null })),
      cities: fx.cities.map((c) => ({ ...c, slug: null })),
      tours: tours.map((t) => ({ ...t, slug: null })),
      trips: [],
      now,
    });
    expect(empty).toEqual([]);
  });

  it("REQ-088: tours sin slug, inactivos o removed no aparecen; missing sí", () => {
    expect(isListed({ slug: null, isActive: true, status: "active" })).toBe(false);
    expect(isListed({ slug: "a", isActive: false, status: "active" })).toBe(false);
    expect(isListed({ slug: "a", isActive: true, status: "removed" })).toBe(false);
    expect(isListed({ slug: "a", isActive: true, status: "missing" })).toBe(true);
  });

  it("REQ-088 (gate 4): un viaje propio publicado entra a Tours de su ciudad por país ISO-2 y nombre", () => {
    const trips: TripRow[] = [{ id: "tr1", slug: "teotihuacan-al-amanecer", title: "Teotihuacán al amanecer", image: null, countries: ["MX"], cities: ["Ciudad de Mexico"], priceLabel: "Desde MXN $1,200", updatedAt: "2026-11-03T00:00:00Z" }];
    const t = destinationTree({ ...fx, tours, trips, now });
    const hit = findCity(t, "mx", "ciudad-de-mexico")!;
    expect(hit.city.ownTrips.map((x) => x.href)).toEqual(["/destinos/mx/ciudad-de-mexico/teotihuacan-al-amanecer"]);
    expect(hit.city.activeTours).toBe(4);
  });
});

describe("REQ-089/090/091: indexación en el árbol", () => {
  it("REQ-089: ≥3 tours activos se indexa; 1 tour sin guía queda en noindex; 1 tour + guía de 300 palabras se indexa", () => {
    const tree = destinationTree({ ...fx, tours: [tour(10, 1), tour(10, 1), tour(10, 1), tour(11, 1), tour(20, 2)], trips: [], now });
    expect(findCity(tree, "mx", "ciudad-de-mexico")!.city.indexed).toBe(true);
    expect(findCity(tree, "mx", "oaxaca")!.city.indexed).toBe(false);
    expect(findCity(tree, "pe", "cusco")!.city.indexed).toBe(true);
  });

  it("REQ-090: una ciudad indexada que dejó de cumplir hace 13 días sigue indexada; a los 14 no", () => {
    const base = { ...fx, tours: [tour(11, 1)], trips: [], now };
    const at = (days: number) => destinationTree({
      ...base,
      cities: fx.cities.map((c) => (c.id === 11 ? { ...c, indexableSince: "2026-09-01T00:00:00Z", failingSince: new Date(now.getTime() - days * 86_400_000).toISOString() } : c)),
    });
    expect(findCity(at(13), "mx", "oaxaca")!.city.indexed).toBe(true);
    expect(findCity(at(14), "mx", "oaxaca")!.city.indexed).toBe(false);
  });

  it("REQ-091: una ciudad sin tours no tiene página; un país se indexa con ≥1 ciudad indexada", () => {
    const tree = destinationTree({ ...fx, tours: [tour(11, 1), tour(20, 2)], trips: [], now });
    expect(findCity(tree, "mx", "puebla")).toBeNull();
    expect(tree.find((c) => c.slug === "mx")!.indexable).toBe(false);
    expect(tree.find((c) => c.slug === "pe")!.indexable).toBe(true);
  });
});

describe("REQ-092 (gate 4): ciudad de un viaje propio", () => {
  const cities = [
    { ...fx.cities[0], iso2: "MX" },
    { ...fx.cities[4], iso2: "PE" },
  ];
  it("REQ-092: país ISO-2 + nombre de ciudad sin acentos → su lugar en /destinos", () => {
    expect(ownTripPlace({ slug: "teo", countries: ["mx"], cities: ["Mexico City"] }, cities)).toEqual({ countrySlug: "mx", citySlug: "ciudad-de-mexico", slug: "teo" });
    expect(ownTripPlace({ slug: "machu", countries: ["PE"], cities: ["Cusco"] }, cities)).toEqual({ countrySlug: "pe", citySlug: "cusco", slug: "machu" });
  });
  it("REQ-092: sin ciudad con slug o con slug de viaje inválido: null", () => {
    expect(ownTripPlace({ slug: "teo", countries: ["MX"], cities: ["Oaxaca"] }, cities)).toBeNull();
    expect(ownTripPlace({ slug: "Teo Viaje", countries: ["MX"], cities: ["Mexico City"] }, cities)).toBeNull();
  });
});
