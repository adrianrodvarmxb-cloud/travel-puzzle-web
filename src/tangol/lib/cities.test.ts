import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import {
  RESERVED_CITY_ID_MIN,
  cleanProviderCityName,
  crossProviderCity,
  normalizeProviderCityName,
  planProviderCities,
  providerCityIdRange,
  type ExistingCity,
} from "./cities";

/** Ciudades que ya existen (ids de Freetour) con su ISO-2 ya unido, como las sirve el catálogo. */
const PEKIN: ExistingCity = { id: 101, countryId: 1, iso2: "CN", slug: "pekin", stateCode: null, geonameid: 1816670, translations: { es: "Pekín", en: "Beijing" } };
const VALLE: ExistingCity = { id: 102, countryId: 2, iso2: "PE", slug: "valle", stateCode: null, geonameid: null, translations: { es: "Valle" } };
const BUENOS_AIRES: ExistingCity = { id: 103, countryId: 3, iso2: "AR", slug: "buenos-aires", stateCode: null, geonameid: 3435910, translations: { es: "Buenos Aires" } };
const MADRYN: ExistingCity = { id: 104, countryId: 3, iso2: "AR", slug: "puerto-madryn", stateCode: null, geonameid: 3840092, translations: { es: "Puerto Madryn" } };
const CITIES = [PEKIN, VALLE, BUENOS_AIRES, MADRYN];
const COUNTRIES = [{ id: 1, iso2: "CN" }, { id: 2, iso2: "PE" }, { id: 3, iso2: "AR" }];

const plan = (destinos: Parameters<typeof planProviderCities>[0]["destinos"], extra: Partial<Parameters<typeof planProviderCities>[0]> = {}) =>
  planProviderCities({ provider: "tangol", destinos, cities: CITIES, countries: COUNTRIES, ...extra });

describe("REQ-3367: cruce de una ciudad del proveedor contra el catálogo", () => {
  it("REQ-3367: «Beijing (solo)» y «Beijing Solo» cruzan con Pekín (misma regla del proveedor, REQ-1606)", () => {
    expect(crossProviderCity({ externalId: "7", name: "Beijing (solo)", countryCode: "CN" }, CITIES)).toEqual({ match: 101 });
    expect(crossProviderCity({ externalId: "8", name: "Beijing Solo", countryCode: "CN" }, CITIES)).toEqual({ match: 101 });
  });

  it("REQ-3367: «Valle Sagrado de los Incas» NO cruza con «Valle»: es ciudad nueva", () => {
    expect(crossProviderCity({ externalId: "9", name: "Valle Sagrado de los Incas", countryCode: "PE" }, CITIES)).toEqual({ nueva: true });
  });

  it("REQ-3367: el cruce por país + GeoNames gana aunque el proveedor escriba el nombre de otra forma", () => {
    expect(crossProviderCity({ externalId: "10", name: "Pto. Madryn", countryCode: "AR", geonameid: 3840092 }, CITIES)).toEqual({ match: 104 });
  });

  it("REQ-3367: el mismo nombre en otro país no cruza", () => {
    expect(crossProviderCity({ externalId: "11", name: "Buenos Aires", countryCode: "UY" }, CITIES)).toEqual({ nueva: true });
  });

  it("REQ-3367: normaliza el nombre del proveedor (nota entre paréntesis, espacios y acentos)", () => {
    expect(cleanProviderCityName("  El   Calafate (opcional) ")).toBe("El Calafate");
    expect(normalizeProviderCityName("  El   Calafate (opcional) ")).toBe("el calafate");
    expect(normalizeProviderCityName("Iguazú")).toBe(normalizeProviderCityName("Iguazu"));
  });

  it("REQ-3367: una ciudad existente sin ISO-2 no cruza con nadie", () => {
    const sinIso = [{ ...PEKIN, iso2: null }];
    expect(crossProviderCity({ externalId: "12", name: "Beijing", countryCode: "CN" }, sinIso)).toEqual({ nueva: true });
  });
});

describe("REQ-3368: id y slug de las ciudades nuevas del proveedor", () => {
  it("REQ-3368: el rango reservado de Tangol empieza en 9,000,001", () => {
    expect(RESERVED_CITY_ID_MIN).toBe(9_000_000);
    expect(providerCityIdRange("tangol")?.start).toBe(9_000_001);
    expect(providerCityIdRange("proveedor-sin-rango")).toBeNull();
  });

  it("REQ-3368: con geonameid conocido, el id de la ciudad nueva es su geonameid", () => {
    const r = plan([{ externalId: "20", name: "El Calafate", countryCode: "AR", geonameid: 3862927 }]);
    expect(r.nuevas).toEqual([{ id: 3862927, countryId: 3, name: "El Calafate", slug: "el-calafate", geonameid: 3862927, idSource: "geonames" }]);
    expect(r.mapeo).toEqual([{ provider: "tangol", externalId: "20", cityId: 3862927, providerName: "El Calafate", countryCode: "AR", source: "nueva" }]);
  });

  it("REQ-3368: sin geonameid, el id sale del rango reservado del proveedor y no se repite", () => {
    const r = plan([
      { externalId: "21", name: "Ushuaia", countryCode: "AR" },
      { externalId: "22", name: "Puerto Natales", countryCode: "AR" },
    ]);
    expect(r.nuevas.map((c) => [c.id, c.idSource, c.slug])).toEqual([
      [9_000_001, "rango", "ushuaia"],
      [9_000_002, "rango", "puerto-natales"],
    ]);
  });

  it("REQ-3368: un id del rango ya usado por una ciudad existente se salta", () => {
    const cities = [...CITIES, { ...MADRYN, id: 9_000_001, geonameid: null, slug: "vieja", translations: { es: "Vieja" } }];
    const r = planProviderCities({ provider: "tangol", destinos: [{ externalId: "23", name: "Ushuaia", countryCode: "AR" }], cities, countries: COUNTRIES });
    expect(r.nuevas[0].id).toBe(9_000_002);
  });

  it("REQ-3368: un geonameid que ya es el id de otra ciudad no se reutiliza: cae al rango", () => {
    const ocupada: ExistingCity = { id: 3862927, countryId: 3, iso2: "AR", slug: "ya-usada", stateCode: null, geonameid: null, translations: { es: "Ya Usada" } };
    const r = plan([{ externalId: "24", name: "El Calafate", countryCode: "AR", geonameid: 3862927 }], { cities: [...CITIES, ocupada] });
    expect(r.nuevas[0]).toMatchObject({ id: 9_000_001, idSource: "rango", geonameid: 3862927 });
  });

  it("REQ-3368: el orden de llegada no cambia los ids asignados", () => {
    const a = [{ externalId: "31", name: "Ushuaia", countryCode: "AR" }, { externalId: "32", name: "Salta", countryCode: "AR" }];
    const ids = (d: typeof a) => plan(d).mapeo.map((m) => `${m.externalId}:${m.cityId}`).sort();
    expect(ids(a)).toEqual(ids([...a].reverse()));
  });

  it("REQ-3368: el slug es único dentro del país y nunca pisa el de una ciudad existente", () => {
    const r = plan([
      { externalId: "41", name: "Ushuaia", countryCode: "AR" },
      { externalId: "42", name: "Valle Sagrado de los Incas", countryCode: "PE" },
    ]);
    expect(r.nuevas.map((c) => c.slug)).toEqual(["ushuaia", "valle-sagrado-de-los-incas"]);
    expect(r.nuevas.every((c) => !CITIES.some((x) => x.countryId === c.countryId && x.slug === c.slug))).toBe(true);
  });

  it("REQ-3368: dos destinos del proveedor con el mismo nombre normalizado son una sola ciudad nueva", () => {
    const r = plan([
      { externalId: "51", name: "Ushuaia", countryCode: "AR" },
      { externalId: "52", name: "Ushuaia (invierno)", countryCode: "AR" },
    ]);
    expect(r.nuevas).toHaveLength(1);
    expect(r.mapeo.map((m) => m.cityId)).toEqual([9_000_001, 9_000_001]);
  });

  it("REQ-3368: un destino que ya existe no crea ciudad y su mapeo dice por qué cruzó", () => {
    const r = plan([
      { externalId: "61", name: "Beijing (solo)", countryCode: "CN" },
      { externalId: "62", name: "Pto. Madryn", countryCode: "AR", geonameid: 3840092 },
    ]);
    expect(r.nuevas).toEqual([]);
    expect(r.mapeo.map((m) => [m.cityId, m.source])).toEqual([[101, "nombre"], [104, "geonames"]]);
  });

  it("REQ-3368: sin país en el catálogo y con el rango agotado, el destino queda pendiente y sin id inventado", () => {
    const sinPais = plan([{ externalId: "71", name: "Asunción", countryCode: "PY" }]);
    expect(sinPais.nuevas).toEqual([]);
    expect(sinPais.pendientes).toEqual([{ externalId: "71", name: "Asunción", countryCode: "PY", reason: "el país PY no está en el catálogo" }]);

    const lleno = plan([
      { externalId: "72", name: "Ushuaia", countryCode: "AR" },
      { externalId: "73", name: "Salta", countryCode: "AR" },
    ], { range: { start: 9_000_001, end: 9_000_001 } });
    expect(lleno.nuevas).toHaveLength(1);
    expect(lleno.pendientes).toHaveLength(1);
    expect(lleno.pendientes[0].reason).toMatch(/rango/i);
  });
});

type Db = { exec: (s: string) => void; prepare: (s: string) => { all: (...v: unknown[]) => unknown[]; run: (...v: unknown[]) => unknown } };
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as { DatabaseSync: new (p: string) => Db };
const SQL = readFileSync("migrations/0028_provider_city.sql", "utf8");

/** La base como está hoy: City con sus ids de Freetour. */
function dbAntes(): Db {
  const d = new DatabaseSync(":memory:");
  d.exec(`CREATE TABLE "City"("id" INTEGER PRIMARY KEY, "countryId" INTEGER NOT NULL, "slug" TEXT, "geonameid" INTEGER)`);
  d.prepare(`INSERT INTO "City" VALUES (101, 1, 'pekin', 1816670)`).run();
  return d;
}
const tablas = (d: Db) => (d.prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`).all() as { name: string }[]).map((x) => x.name);

describe("REQ-3369: tabla de mapeo proveedor → ciudad (migración 0028, sin aplicar)", () => {
  it("REQ-3369: crea ProviderCity con llave (proveedor, destino) y no toca las tablas que ya existen", () => {
    const d = dbAntes();
    d.exec(SQL);
    expect(tablas(d)).toContain("ProviderCity");
    expect((d.prepare(`SELECT COUNT(*) AS n FROM "City"`).all() as { n: number }[])[0].n).toBe(1);
    const code = SQL.replace(/--[^\n]*/g, "");
    expect(code).not.toMatch(/\b(ALTER|UPDATE|DELETE|DROP|INSERT)\b/i);
    d.prepare(`INSERT INTO "ProviderCity" ("provider","externalId","cityId","providerName","countryCode","source","createdAt","updatedAt") VALUES ('tangol','7',101,'Beijing (solo)','CN','nombre','2026-11-12','2026-11-12')`).run();
    expect(() => d.prepare(`INSERT INTO "ProviderCity" ("provider","externalId","cityId","providerName","countryCode","source","createdAt","updatedAt") VALUES ('tangol','7',102,'otro','CN','nombre','2026-11-12','2026-11-12')`).run()).toThrow(/UNIQUE|PRIMARY/i);
  });

  it("REQ-3369: el mismo destino en otro proveedor sí entra y una ciudad puede tener varios destinos", () => {
    const d = dbAntes();
    d.exec(SQL);
    const ins = (p: string, e: string, c: number) => d.prepare(`INSERT INTO "ProviderCity" ("provider","externalId","cityId","providerName","countryCode","source","createdAt","updatedAt") VALUES ('${p}','${e}',${c},'x','CN','nombre','2026-11-12','2026-11-12')`).run();
    ins("tangol", "7", 101);
    ins("freetour", "7", 101);
    ins("tangol", "8", 101);
    expect((d.prepare(`SELECT COUNT(*) AS n FROM "ProviderCity" WHERE "cityId" = 101`).all() as { n: number }[])[0].n).toBe(3);
  });

  it("REQ-3369: solo acepta un origen conocido del cruce", () => {
    const d = dbAntes();
    d.exec(SQL);
    expect(() => d.prepare(`INSERT INTO "ProviderCity" ("provider","externalId","cityId","providerName","countryCode","source","createdAt","updatedAt") VALUES ('tangol','9',101,'x','CN','adivinado','2026-11-12','2026-11-12')`).run()).toThrow(/CHECK/i);
  });

  it("REQ-3369: es idempotente (se puede volver a correr) y trae su plan de regreso", () => {
    const d = dbAntes();
    d.exec(SQL);
    expect(() => d.exec(SQL)).not.toThrow();
    expect(SQL).toMatch(/Plan de regreso/i);
  });

  it("REQ-3369: las filas que arma el plan entran tal cual en la tabla", () => {
    const d = dbAntes();
    d.exec(SQL);
    const r = plan([
      { externalId: "61", name: "Beijing (solo)", countryCode: "CN" },
      { externalId: "62", name: "Ushuaia", countryCode: "AR" },
    ]);
    for (const c of r.nuevas) d.prepare(`INSERT INTO "City" ("id","countryId","slug","geonameid") VALUES (?, ?, ?, ?)`).run(c.id, c.countryId, c.slug, c.geonameid);
    for (const m of r.mapeo) {
      d.prepare(`INSERT INTO "ProviderCity" ("provider","externalId","cityId","providerName","countryCode","source","createdAt","updatedAt") VALUES (?, ?, ?, ?, ?, ?, '2026-11-12', '2026-11-12')`)
        .run(m.provider, m.externalId, m.cityId, m.providerName, m.countryCode, m.source);
    }
    const filas = d.prepare(`SELECT "externalId","cityId","source" FROM "ProviderCity" ORDER BY "externalId"`).all() as { externalId: string; cityId: number; source: string }[];
    expect(filas.map((f) => [f.externalId, f.cityId, f.source])).toEqual([
      ["61", 101, "nombre"],
      ["62", 9_000_001, "nueva"],
    ]);
  });
});
