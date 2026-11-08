import { describe, expect, it } from "vitest";
import { destinationTree, findCity } from "./catalog";
import { fx, tour } from "../fixtures/destinos";
import { cityLangs, countryLangs, localizeTree, tourLangs } from "./locale";

const now = new Date("2026-11-05T12:00:00Z");
const tours = [
  tour(10, 1, { title: "Centro Histórico", titleEn: "Historic Centre" }),
  tour(10, 1, { title: "Coyoacán", titleEn: "" }),
  tour(10, 1, { title: "Xochimilco", titleEn: "Xochimilco boats" }),
  tour(20, 2, { title: "Cusco colonial", titleEn: "Colonial Cusco" }),
].map((t) => ({ ...t, providerId: "bemyguest" })); // REQ-1200: tours que cuentan para indexar la ciudad
const tree = destinationTree({ ...fx, tours, trips: [{ id: "v1", slug: "viaje-cdmx", title: "Viaje CDMX", titleEn: "CDMX trip", image: null, countries: ["MX"], cities: ["Ciudad de México"], priceLabel: null, updatedAt: "2026-11-01T00:00:00Z" }], now });

describe("árbol por idioma", () => {
  it("REQ-665: en inglés, nombres de país y ciudad y títulos del idioma; sin traducción, el de español", () => {
    const en = localizeTree(tree, "en");
    const { country, city } = findCity(en, "mx", "ciudad-de-mexico")!;
    expect(country.name).toBe("Mexico");
    expect(city.name).toBe("Mexico City");
    expect(city.freeTours.map((t) => t.title)).toEqual(expect.arrayContaining(["Historic Centre", "Coyoacán"]));
    expect(city.ownTrips[0].title).toBe("CDMX trip");
    expect(findCity(en, "pe", "cusco")!.country.name).toBe("Peru");
  });

  it("REQ-651: mismos slugs y href en todos los idiomas; español = el árbol tal cual", () => {
    expect(localizeTree(tree, "es")).toBe(tree);
    const en = localizeTree(tree, "en");
    expect(findCity(en, "mx", "ciudad-de-mexico")!.city.href).toBe(findCity(tree, "mx", "ciudad-de-mexico")!.city.href);
    expect(tree[0].name).toBe("México"); // no muta el árbol en caché
  });

  it("REQ-662: el tour es indexable en inglés solo con título del proveedor en inglés", () => {
    const { country, city } = findCity(tree, "mx", "ciudad-de-mexico")!;
    const byTitle = (t: string) => [...city.freeTours, ...city.paidTours].find((x) => x.title === t)!;
    expect(tourLangs(byTitle("Centro Histórico"), city, country)).toEqual(["es", "en"]);
    expect(tourLangs(byTitle("Coyoacán"), city, country)).toEqual(["es"]);
    expect(tourLangs(city.ownTrips[0], city, country)).toEqual(["es", "en"]);
  });

  it("REQ-662: ciudad indexada solo por su guía en español = solo es; con ≥3 tours = es y en", () => {
    const cdmx = findCity(tree, "mx", "ciudad-de-mexico")!;
    const cusco = findCity(tree, "pe", "cusco")!;
    expect(cityLangs(cdmx.city, cdmx.country)).toEqual(["es", "en"]);
    expect(cusco.city.indexed).toBe(true);
    expect(cityLangs(cusco.city, cusco.country)).toEqual(["es"]);
    expect(countryLangs(cusco.country)).toEqual(["es"]);
    expect(countryLangs(cdmx.country)).toEqual(["es", "en"]);
  });

  it("REQ-662: ciudad o país sin indexar = ningún idioma", () => {
    const oax = findCity(destinationTree({ ...fx, tours: [tour(11, 1, {})], trips: [], now }), "mx", "oaxaca")!;
    expect(cityLangs(oax.city, oax.country)).toEqual([]);
  });
});

describe("REQ-1205: hreflang y sitemaps por idioma con la misma regla", () => {
  it("REQ-1205: una ciudad indexada solo por su guía (español) no se indexa en inglés; con 3 tours indexables sí", () => {
    const W = Array.from({ length: 300 }, (_, i) => `w${i}`).join(" ");
    const base = { countries: [{ id: 1, code: "mx", iso2: "MX", translations: { es: "México", en: "Mexico" } }], trips: [], now: new Date("2026-11-07T12:00:00Z") };
    const g = destinationTree({ ...base, cities: [{ id: 41, countryId: 1, translations: { es: "Guía" }, slug: "guia", guide: W, guideUpdatedAt: null, indexableSince: null, failingSince: null }], tours: [1, 2, 3, 4].map((i) => tour(41, 1, { slug: `g-${i}`, providerId: "freetour" })) });
    const c = findCity(g, "mx", "guia")!;
    expect(cityLangs(c.city, c.country)).toEqual(["es"]);
    const o = destinationTree({ ...base, cities: [{ id: 42, countryId: 1, translations: { es: "Otro" }, slug: "otro", guide: null, guideUpdatedAt: null, indexableSince: null, failingSince: null }], tours: [1, 2, 3].map((i) => tour(42, 1, { slug: `o-${i}`, providerId: "bemyguest" })) });
    const d = findCity(o, "mx", "otro")!;
    expect(cityLangs(d.city, d.country)).toEqual(["es", "en"]);
  });
});
