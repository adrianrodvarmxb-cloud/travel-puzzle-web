/**
 * REQ-1265 (coordinador, 7 nov 2026, hallazgo de REQ-1264): la fila del país GB trae «Inglaterra» / «England»; ahora que
 * Escocia, Gales e Irlanda del Norte cuelgan de GB, el país se llama «Reino Unido» / «United Kingdom» en todos los idiomas
 * (H1, title, breadcrumbs, JSON-LD, filtros y sitemap). Se fija al pintar, desde la lista ISO; D1 no se toca.
 */
import { describe, expect, it } from "vitest";
import { destinationTree, findCity, type CountryRow, type CityRow } from "./catalog";
import { countryTranslations, ISO_COUNTRY_NAMES } from "./ids";
import { countriesWithCounts } from "@/tours/lib/d1-load";
import { tour } from "../fixtures/destinos";

const INGLATERRA = { es: "Inglaterra", en: "England", pt: "Inglaterra", de: "England", fr: "Angleterre", it: "Inghilterra" };
const countries: CountryRow[] = [
  { id: 2, code: "GB", iso2: "GB", translations: INGLATERRA },
  { id: 177, code: "SCT", iso2: null, translations: { es: "Escocia", en: "Scotland" } },
];
const cities: CityRow[] = [
  { id: 20, countryId: 2, translations: { es: "Londres" }, slug: "londres", guide: null, guideUpdatedAt: null, indexableSince: null, failingSince: null },
  { id: 4842, countryId: 177, translations: { es: "Edimburgo" }, slug: "edimburgo", guide: null, guideUpdatedAt: null, indexableSince: null, failingSince: null },
];

describe("REQ-1265 GB se llama «Reino Unido» en todos los idiomas", () => {
  it("REQ-1265 la lista ISO trae los 6 idiomas del sitio", () => {
    expect(ISO_COUNTRY_NAMES.GB).toEqual({ es: "Reino Unido", en: "United Kingdom", pt: "Reino Unido", de: "Vereinigtes Königreich", fr: "Royaume-Uni", it: "Regno Unito" });
    expect(countryTranslations("GB", INGLATERRA)).toEqual(ISO_COUNTRY_NAMES.GB);
    expect(countryTranslations("FR", { es: "Francia" })).toEqual({ es: "Francia" }); // los demás países, tal cual
  });
  it("REQ-1265 el árbol de /destinos (H1, title, breadcrumbs, JSON-LD, sitemap e idiomas salen de aquí)", () => {
    const tree = destinationTree({ countries, cities, tours: [tour(20, 2), tour(4842, 177)], trips: [], now: new Date("2026-11-07T12:00:00Z") });
    expect(tree).toHaveLength(1);
    expect(tree[0]).toMatchObject({ slug: "gb", name: "Reino Unido" });
    expect(tree[0].names).toMatchObject({ es: "Reino Unido", en: "United Kingdom", de: "Vereinigtes Königreich" });
    expect(JSON.stringify(tree)).not.toMatch(/Inglaterra|England/);
    expect(findCity(tree, "gb", "edimburgo")).not.toBeNull();
  });
  it("REQ-1265 el filtro de país de /tours", () => {
    const out = countriesWithCounts([{ id: 2, code: "GB", translations: INGLATERRA }, { id: 5, code: "FR", translations: { es: "Francia" } }], [{ countryId: 2, _count: { _all: 3 } }, { countryId: 5, _count: { _all: 1 } }]);
    expect(out.find((c) => c.id === 2)!.translations).toEqual(ISO_COUNTRY_NAMES.GB);
    expect(out.find((c) => c.id === 5)!.translations).toEqual({ es: "Francia" });
  });
});
