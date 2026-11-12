import { describe, it, expect } from "vitest";
import { destinosHub } from "./destinos-hub";
import type { CountryNode, CityNode, TourCardModel } from "./catalog";

const card = (image: string | null): TourCardModel => ({ id: "t", href: "/x", title: "t", provider: null, image, isFreeTour: true, price: 0, currency: "EUR", rating: null, reviews: 0, duration: null, kind: "free", updatedAt: "2026-11-01" });
const city = (id: number, name: string, tours: number, image: string | null, en = name): CityNode => ({
  id, slug: name.toLowerCase(), name, href: `/destinos/x/${name.toLowerCase()}`, guide: null, guideUpdatedAt: null,
  activeTours: tours, indexableTours: tours, indexed: true, freeTours: image ? [card(image)] : [], paidTours: [], ownTrips: [], transportTrips: [], names: { es: name, en },
});
const country = (id: number, iso2: string, name: string, cities: CityNode[], indexable = true): CountryNode => ({ id, iso2, slug: iso2.toLowerCase(), name, href: `/destinos/${iso2.toLowerCase()}`, indexable, cities, names: { es: name, en: name } });

const tree = [
  country(1, "ES", "España", [city(10, "Madrid", 120, "https://img/madrid.jpg"), city(11, "Toledo", 9, "https://img/toledo.jpg")]),
  country(2, "IT", "Italia", [city(20, "Roma", 300, null, "Rome"), city(21, "Nápoles", 40, "https://img/napoles.jpg", "Naples")]),
  country(3, "PE", "Perú", [city(30, "Cusco", 80, "https://img/cusco.jpg")]),
  country(4, "AF", "Afganistán", [city(40, "Kabul", 4, "https://img/kabul.jpg")]),
  country(5, "FR", "Francia", [city(50, "París", 0, null, "Paris")], false),
];

describe("REQ-3475: «Más buscados» con el criterio del inicio", () => {
  it("REQ-3475: hasta 8 ciudades con foto, con su enlace y número de tours (sin ciudades sin tours ni sin foto)", () => {
    const h = destinosHub(tree, "es");
    expect(h.top.length).toBeLessThanOrEqual(8);
    expect(h.top.every((c) => c.image && c.tours > 0)).toBe(true);
    expect(h.top.map((c) => c.name)).not.toContain("París");
    expect(h.top[0]).toMatchObject({ href: expect.stringMatching(/^\/destinos\//), country: expect.any(String) });
  });
  it("REQ-3475: Roma usa la foto propia del sitio aunque sus tours no traigan foto (como el inicio)", () => {
    expect(destinosHub(tree, "es").top.map((c) => c.name)).toContain("Roma");
  });
});

describe("REQ-3476: continentes con foto por país", () => {
  it("REQ-3476: agrupa por continente, solo países indexables, con más tours primero", () => {
    const h = destinosHub(tree, "es");
    const europa = h.continents.find((c) => c.continent === "europa")!;
    expect(europa.countries.map((c) => c.name)).toEqual(["Italia", "España"]);
    expect(h.continents.flatMap((c) => c.countries).map((c) => c.name)).not.toContain("Francia");
  });
  it("REQ-3476: la foto del país es la de su ciudad con más tours que tenga foto", () => {
    const it_ = destinosHub(tree, "es").continents.find((c) => c.continent === "europa")!.countries.find((c) => c.name === "Italia")!;
    expect(it_.image).toBeTruthy();
    expect(it_).toMatchObject({ cities: 2, tours: 340 });
  });
  it("REQ-3476: un país sin continente conocido va en «Otros», al final", () => {
    const h = destinosHub(tree, "es");
    expect(h.continents.at(-1)!.continent).toBe("otros");
    expect(h.continents.at(-1)!.countries.map((c) => c.name)).toEqual(["Afganistán"]);
  });
});

describe("REQ-3477: A–Z por continente", () => {
  it("REQ-3477: dentro de cada continente, en orden alfabético y con todos los países indexables", () => {
    const h = destinosHub(tree, "es");
    expect(h.az.find((c) => c.continent === "europa")!.countries.map((c) => c.name)).toEqual(["España", "Italia"]);
    expect(h.az.flatMap((c) => c.countries)).toHaveLength(4);
  });
});
