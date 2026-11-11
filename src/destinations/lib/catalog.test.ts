import { describe, it, expect } from "vitest";
import { allTours, destinationTree, findCity, isListed, ownTripPlace, type TripRow } from "./catalog";
import { fx, tour, words } from "../fixtures/destinos";
import { catalogClassifier } from "@/taxonomy/lib/publish";
import { DEFAULT_DICTIONARY, DEFAULT_MAPPINGS } from "@/taxonomy/data";

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

  it("REQ-172: un viaje de transporte va a Traslados de su ciudad, no a Tours, y su ficha sigue existiendo", () => {
    const trips: TripRow[] = [
      { id: "tr1", slug: "teotihuacan-al-amanecer", kind: "tour", title: "Teotihuacán al amanecer", image: null, countries: ["MX"], cities: ["Ciudad de Mexico"], priceLabel: null, updatedAt: "2026-11-03T00:00:00Z" },
      { id: "bb1", slug: "bus-turistico-cdmx-bbt-mx-m01-001", kind: "transporte", title: "Bus turístico", image: null, countries: ["MX"], cities: ["Ciudad de Mexico"], priceLabel: null, updatedAt: "2026-11-03T00:00:00Z" },
    ];
    const hit = findCity(destinationTree({ ...fx, tours, trips, now }), "mx", "ciudad-de-mexico")!;
    expect(hit.city.ownTrips.map((x) => x.id)).toEqual(["tr1"]);
    expect(hit.city.transportTrips.map((x) => x.id)).toEqual(["bb1"]);
    expect(allTours(hit.city).map((x) => x.id)).toContain("bb1");
  });
});

describe("REQ-089/090/091: indexación en el árbol", () => {
  it("REQ-089: ≥3 tours activos se indexa; 1 tour sin guía queda en noindex; 1 tour + guía de 300 palabras se indexa", () => {
    // REQ-1200: con tours de un proveedor con permiso de indexar (los de FREETOUR ya no cuentan; ver REQ-1200…1204).
    const bm = (t: ReturnType<typeof tour>) => ({ ...t, providerId: "bemyguest" });
    const tree = destinationTree({ ...fx, tours: [tour(10, 1), tour(10, 1), tour(10, 1), tour(11, 1), tour(20, 2)].map(bm), trips: [], now });
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

describe("T3 árbol de destinos con la taxonomía (TAXONOMY_PUBLISH_ENABLED)", () => {
  // En CDMX: 2 free a pie, 1 online gratis (8, en vivo), 1 museo gratis (24), 1 renta gratis (26), 1 traslado (29), 1 caminata de pago.
  // REQ-1262: la cat. 8 ya no es `fuera` por categoría; lo «online» es lo que de verdad es en línea (tour virtual en vivo).
  const online = (cityId: number) => tour(cityId, 1, { categoryId: 8, title: "Tour virtual en vivo por Zoom" });
  const tours = [
    tour(10, 1, { categoryId: 12 }), tour(10, 1, { categoryId: 12 }), online(10), tour(10, 1, { categoryId: 24 }),
    tour(10, 1, { categoryId: 26 }), tour(10, 1, { categoryId: 29, price: 40 }), tour(10, 1, { categoryId: 12, price: 15 }),
    online(11), online(11), online(11),
  ];
  const tax = catalogClassifier(DEFAULT_DICTIONARY, DEFAULT_MAPPINGS);
  const off = destinationTree({ ...fx, tours, trips: [], now });
  const on = destinationTree({ ...fx, tours, trips: [], now, taxonomy: tax });
  it("REQ-407 apagada, todo igual que hoy (precio 0 = free tour; online cuenta)", () => {
    const city = findCity(off, "mx", "ciudad-de-mexico")!.city;
    expect(city.freeTours).toHaveLength(5);
    expect(findCity(off, "mx", "oaxaca")).not.toBeNull();
  });
  it("REQ-406 encendida, solo pieza-libre es free tour: el museo gratis va a Tours, el online se va", () => {
    const city = findCity(on, "mx", "ciudad-de-mexico")!.city;
    expect(city.freeTours.map((t) => t.title).sort()).toEqual([tours[0].title, tours[1].title].sort());
    expect(city.paidTours.map((t) => t.title).sort()).toEqual([tours[3].title, tours[6].title].sort());
    expect(allTours(city).map((t) => t.title)).not.toContain(tours[2].title);
  });
  it("REQ-261 encendida, renta y traslado de FREETOUR salen de Tours y van a Traslados (decisión 4)", () => {
    const city = findCity(on, "mx", "ciudad-de-mexico")!.city;
    expect(city.transportTrips.map((t) => t.title)).toEqual([tours[4].title, tours[5].title]);
    expect(city.paidTours.map((t) => t.title)).not.toContain(tours[5].title);
  });
  it("REQ-407 encendida, una ciudad solo con tours online no tiene página ni cuenta para indexar", () => {
    expect(findCity(on, "mx", "oaxaca")).toBeNull();
    expect(findCity(on, "mx", "ciudad-de-mexico")!.city.activeTours).toBe(6);
  });
});

describe("REQ-1200 / REQ-1201 / REQ-1204: indexación de ciudad y país en el árbol sin FREETOUR", () => {
  const W = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(" ");
  const city = (id: number, slug: string, es: string, guide: string | null = null) => ({ id, countryId: 1, translations: { es }, slug, guide, guideUpdatedAt: null, indexableSince: null, failingSince: null });
  const ft = (cityId: number, n: number) => Array.from({ length: n }, (_, i) => tour(cityId, 1, { slug: `ft-${cityId}-${i}`, providerId: "freetour" }));
  const trip = (i: number, city: string) => ({ id: `tr${city}${i}`, slug: `viaje-${i}-ext-mx-t01-00${i}`, kind: "tour", title: `Viaje ${i}`, image: null, countries: ["MX"], cities: [city], priceLabel: null, updatedAt: "2026-11-01T00:00:00Z", agency: "Extime Travel", agencyId: "ag1" });
  const t = destinationTree({
    countries: [{ id: 1, code: "mx", iso2: "MX", translations: { es: "México" } }],
    cities: [city(41, "solo-freetour", "Solo Freetour"), city(42, "con-guia", "Con Guía", W(300)), city(43, "tres-viajes", "Tres Viajes"), city(44, "un-viaje-y-guia", "Un Viaje Y Guía", W(300))],
    tours: [...ft(41, 10), ...ft(42, 4), ...ft(43, 2), ...ft(44, 1)],
    trips: [1, 2, 3].map((i) => trip(i, "Tres Viajes")).concat([trip(4, "Un Viaje Y Guía")]),
    now: new Date("2026-11-07T12:00:00Z"),
  });
  const get = (slug: string) => findCity(t, "mx", slug)!.city;
  it("REQ-1200: 10 tours de FREETOUR sin guía ya no indexan la ciudad (la página y sus tarjetas siguen)", () => {
    expect(get("solo-freetour").indexed).toBe(false);
    expect(get("solo-freetour").freeTours.length + get("solo-freetour").paidTours.length).toBe(10);
    expect(get("solo-freetour").indexableTours).toBe(0);
  });
  it("REQ-1200: 3 viajes de agencia indexan la ciudad; 1 viaje + guía también", () => {
    expect(get("tres-viajes").indexableTours).toBe(3);
    expect(get("tres-viajes").indexed).toBe(true);
    expect(get("un-viaje-y-guia").indexed).toBe(true);
  });
  it("REQ-1201: la guía propia del campo City.guide indexa aunque solo haya FREETOUR", () => {
    expect(get("con-guia").indexed).toBe(true);
  });
  it("REQ-1204: el país se indexa con ≥1 ciudad indexada; sin ninguna, noindex", () => {
    expect(t[0].indexable).toBe(true);
    const solo = destinationTree({ countries: [{ id: 1, code: "mx", iso2: "MX", translations: { es: "México" } }], cities: [city(41, "solo-freetour", "Solo Freetour")], tours: ft(41, 10), trips: [], now: new Date("2026-11-07T12:00:00Z") });
    expect(solo[0].indexable).toBe(false);
  });
});
