import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { cityMeetsRule } from "@/destinations/lib/indexing";
import {
  RESERVED_COUNTRY_ID_BLOCK,
  RESERVED_COUNTRY_ID_MIN,
  crossProviderCountry,
  parseProviderCountries,
  planProviderCountries,
  providerCountryIdRange,
  type ExistingCountry,
} from "./provider-countries";
import { planCountriesFromRepoData, providerCountryLists } from "../provider-countries";

/** Países que ya existen, con los ids de Freetour, como los sirve el catálogo. */
const ARGENTINA: ExistingCountry = { id: 3, code: "AR", iso2: "AR" };
const PERU: ExistingCountry = { id: 2, code: "PE", iso2: "pe" };
const ESCOCIA: ExistingCountry = { id: 40, code: "SCT", iso2: null };
const REINO_UNIDO: ExistingCountry = { id: 41, code: "GB", iso2: "GB" };
const COUNTRIES = [PERU, ARGENTINA, ESCOCIA, REINO_UNIDO];

const PARAGUAY = { iso2: "PY", translations: { es: "Paraguay", en: "Paraguay" } };

const plan = (
  providers: Parameters<typeof planProviderCountries>[0]["providers"],
  countries: readonly ExistingCountry[] = COUNTRIES,
) => planProviderCountries({ providers, countries });

describe("REQ-3441: cruce de un país del proveedor contra el catálogo", () => {
  it("REQ-3441: el cruce es por iso2 en mayúsculas (el catálogo puede traerlo en minúsculas)", () => {
    expect(crossProviderCountry({ iso2: "AR", translations: { es: "Argentina", en: "Argentina" } }, COUNTRIES)).toEqual({ match: 3 });
    expect(crossProviderCountry({ iso2: "pe", translations: { es: "Perú", en: "Peru" } }, COUNTRIES)).toEqual({ match: 2 });
  });

  it("REQ-3441: Paraguay no está en el catálogo, así que es país nuevo", () => {
    expect(crossProviderCountry(PARAGUAY, COUNTRIES)).toEqual({ nuevo: true });
  });

  it("REQ-3441: GB cruza con la fila GB, no con la subnacional SCT (REQ-1264)", () => {
    expect(crossProviderCountry({ iso2: "GB", translations: { es: "Reino Unido", en: "United Kingdom" } }, COUNTRIES)).toEqual({ match: 41 });
  });

  it("REQ-3441: un código que no es ISO 3166-1 alfa-2 no cruza con nadie", () => {
    expect(crossProviderCountry({ iso2: "ZZ", translations: { es: "Nunca", en: "Never" } }, COUNTRIES)).toEqual({ nuevo: true });
  });
});

describe("REQ-3441: plan de países propios de un proveedor", () => {
  it("REQ-3441: el rango reservado sigue el criterio de las ciudades (REQ-1624/REQ-3368): desde 9,000,000, Tangol 9,000,001", () => {
    expect(RESERVED_COUNTRY_ID_MIN).toBe(9_000_000);
    expect(RESERVED_COUNTRY_ID_BLOCK).toBe(100_000);
    expect(providerCountryIdRange("tangol")).toEqual({ start: 9_000_001, end: 9_100_000 });
    expect(providerCountryIdRange("proveedor-sin-rango")).toBeNull();
  });

  it("REQ-3441: Paraguay se crea con id del rango, code PY y sus dos nombres", () => {
    const r = plan([{ provider: "tangol", paises: [PARAGUAY] }]);
    expect(r.nuevos).toEqual([
      { id: 9_000_001, code: "PY", iso2: "PY", translations: { es: "Paraguay", en: "Paraguay" } },
    ]);
    expect(r.mapeo).toEqual([{ provider: "tangol", iso2: "PY", countryId: 9_000_001, source: "nuevo" }]);
    expect(r.pendientes).toEqual([]);
  });

  it("REQ-3441: un país que ya existe devuelve su id y NO crea otro", () => {
    const r = plan([{ provider: "tangol", paises: [{ iso2: "AR", translations: { es: "Argentina", en: "Argentina" } }, PARAGUAY] }]);
    expect(r.mapeo).toEqual([
      { provider: "tangol", iso2: "AR", countryId: 3, source: "catalogo" },
      { provider: "tangol", iso2: "PY", countryId: 9_000_001, source: "nuevo" },
    ]);
    expect(r.nuevos.map((c) => c.iso2)).toEqual(["PY"]);
  });

  it("REQ-3441: dos proveedores con el mismo país nuevo dan UN solo país", () => {
    const r = plan([
      { provider: "tangol", paises: [PARAGUAY] },
      { provider: "exotic", paises: [{ iso2: "py", translations: { es: "Paraguay", en: "Paraguay" } }] },
    ]);
    expect(r.nuevos).toHaveLength(1);
    expect(r.nuevos[0].id).toBe(9_000_001);
    expect(r.mapeo).toEqual([
      { provider: "tangol", iso2: "PY", countryId: 9_000_001, source: "nuevo" },
      { provider: "exotic", iso2: "PY", countryId: 9_000_001, source: "catalogo" },
    ]);
  });

  it("REQ-3441: un code que ya usa otro país se resuelve con la regla que ya existe (avoidCodeClashes) y no rompe la unicidad", () => {
    // Fila de Freetour con el código PY pero sin iso2: el cruce no la encuentra y el código ya está tomado.
    const conChoque = [...COUNTRIES, { id: 77, code: "PY", iso2: null }];
    const r = plan([{ provider: "tangol", paises: [PARAGUAY] }], conChoque);
    expect(r.nuevos).toEqual([
      { id: 9_000_001, code: "PY-9000001", iso2: "PY", translations: { es: "Paraguay", en: "Paraguay" } },
    ]);
    const codes = [...conChoque.map((c) => c.code), ...r.nuevos.map((c) => c.code)];
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("REQ-3441: ids seguidos del rango y nunca uno ya usado por un país existente", () => {
    const ocupado = [...COUNTRIES, { id: 9_000_001, code: "XX", iso2: "XX" }];
    const r = plan(
      [{ provider: "tangol", paises: [PARAGUAY, { iso2: "BO", translations: { es: "Bolivia", en: "Bolivia" } }] }],
      ocupado,
    );
    expect(r.nuevos.map((c) => [c.iso2, c.id])).toEqual([
      ["BO", 9_000_002],
      ["PY", 9_000_003],
    ]);
  });

  it("REQ-3441: un ISO-2 inválido queda PENDIENTE, sin id inventado", () => {
    const r = plan([{ provider: "tangol", paises: [{ iso2: "ZZZ", translations: { es: "Nunca", en: "Never" } }] }]);
    expect(r.nuevos).toEqual([]);
    expect(r.mapeo).toEqual([]);
    expect(r.pendientes).toEqual([{ provider: "tangol", iso2: "ZZZ", reason: "«ZZZ» no es un ISO 3166-1 alfa-2" }]);
  });

  it("REQ-3441: un proveedor sin rango reservado no recibe ids: queda PENDIENTE", () => {
    const r = plan([{ provider: "proveedor-nuevo", paises: [PARAGUAY] }]);
    expect(r.nuevos).toEqual([]);
    expect(r.pendientes).toEqual([
      { provider: "proveedor-nuevo", iso2: "PY", reason: "el proveedor proveedor-nuevo no tiene rango de ids reservado" },
    ]);
  });

  it("REQ-3441: sin nombre en español e inglés el país queda PENDIENTE", () => {
    const r = plan([{ provider: "tangol", paises: [{ iso2: "PY", translations: { es: "Paraguay", en: "" } }] }]);
    expect(r.nuevos).toEqual([]);
    expect(r.pendientes).toEqual([{ provider: "tangol", iso2: "PY", reason: "falta el nombre en es o en en" }]);
  });
});

describe("REQ-3442: el dato de los países propios de proveedor vive en el repo", () => {
  it("REQ-3442: data/paises-de-proveedor.json trae Paraguay para Tangol con sus dos nombres", () => {
    const raw = JSON.parse(readFileSync("data/paises-de-proveedor.json", "utf8"));
    expect(parseProviderCountries(raw)).toEqual([
      { provider: "tangol", paises: [{ iso2: "PY", translations: { es: "Paraguay", en: "Paraguay" } }] },
    ]);
  });

  it("REQ-3442: el dato versionado es lo que lee la raíz del dominio", () => {
    const raw = JSON.parse(readFileSync("data/paises-de-proveedor.json", "utf8"));
    expect(providerCountryLists()).toEqual(parseProviderCountries(raw));
  });

  it("REQ-3442: con el catálogo de Freetour (sin PY), el plan del repo da de alta Paraguay", () => {
    const r = planCountriesFromRepoData(COUNTRIES);
    expect(r.nuevos).toEqual([
      { id: 9_000_001, code: "PY", iso2: "PY", translations: { es: "Paraguay", en: "Paraguay" } },
    ]);
    expect(r.pendientes).toEqual([]);
  });

  it("REQ-3442: si Paraguay ya estuviera en el catálogo, el plan no crea nada", () => {
    const r = planCountriesFromRepoData([...COUNTRIES, { id: 500, code: "PY", iso2: "PY" }]);
    expect(r.nuevos).toEqual([]);
    expect(r.mapeo).toEqual([{ provider: "tangol", iso2: "PY", countryId: 500, source: "catalogo" }]);
  });

  it("REQ-3442: el dato rechaza una entrada mal escrita en vez de inventarla", () => {
    expect(() => parseProviderCountries({ tangol: [{ iso2: "PY" }] })).toThrow();
    expect(() => parseProviderCountries({ tangol: "PY" })).toThrow();
  });
});

describe("REQ-3441: riesgo de indexado de una página flaca (/destinos/py con 1 tour)", () => {
  it("REQ-3441: Asunción con 1 solo tour y sin guía NO cumple la regla de indexado (INDEX_MIN_TOURS = 3)", () => {
    expect(cityMeetsRule({ activeTours: 1, indexableTours: 1, guide: null })).toBe(false);
  });
});
