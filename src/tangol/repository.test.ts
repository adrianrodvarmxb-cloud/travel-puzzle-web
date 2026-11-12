import { describe, it, expect } from "vitest";
import {
  createTangolSqlRepo,
  readExportRows,
  toExistingCities,
  toExistingCountries,
  toSyncState,
} from "./repository";
import { cityStatements } from "@/catalog/lib/sql";

const vacio = { countries: [], cities: [], state: null };
let n = 0;
const newId = () => `id${n++}`;

const fila = (externalId: number, providerId: string) => ({
  tour: {
    providerId, externalId, providerTitle: "Travel Puzzle", providerPhone: null, priceValue: 100, priceCurrency: "USD",
    duration: "3 Horas", durationMinutes: 180, titleImageURL: null, categoryId: 0, rating: null, reviewsNumber: 0,
    cityId: 10, countryId: 1, meetingPoint: {}, includes: [], POIs: null, images: [], videoURL: null,
    isActive: true as const, lastSeenAt: new Date("2026-11-12T18:00:00Z"),
  },
  translations: [{ language: "es" as const, title: `Tour ${externalId}`, brief: null, description: null, url: "/destinos/ar/buenos-aires" }],
});

describe("REQ-3464: el repositorio junta sentencias en vez de escribir", () => {
  it("REQ-3464: un repo recién creado no tiene ninguna sentencia (el ensayo no escribe nada)", async () => {
    const repo = createTangolSqlRepo(vacio, newId);
    expect(repo.statements()).toEqual([]);
    expect(repo.sql().trim()).toBe("");
    expect(await repo.getState()).toBeNull();
  });

  it("REQ-3461: un tour de Tangol y uno de Freetour con el MISMO número conviven en el SQL generado", async () => {
    const repo = createTangolSqlRepo(vacio, newId);
    await repo.upsertTours([fila(1234, "tangol")]);
    const sql = repo.sql();
    expect(sql).toContain('ON CONFLICT ("providerId", "externalId") DO UPDATE');
    expect(sql).toContain("'tangol'");
    expect(sql).toContain("1234");
    // La traducción busca su tour por (proveedor, número): nunca pisaría el tour 1234 de Freetour.
    expect(sql).toContain('(SELECT "id" FROM "Tour" WHERE "providerId" = \'tangol\' AND "externalId" = 1234)');
    expect(sql).not.toContain("'freetour'");
  });

  it("REQ-3463: el avance se guarda en la fila de SyncMetadata del proveedor, no en la de Freetour", async () => {
    const repo = createTangolSqlRepo(vacio, newId);
    await repo.saveState({ status: "in_progress", nextPage: 11, totalPages: 184, runStartedAt: new Date("2026-11-12T09:00:00Z"), lastSyncAt: new Date("2026-11-12T09:05:00Z") });
    const sql = repo.sql();
    expect(sql).toContain('INSERT INTO "SyncMetadata"');
    expect(sql).toContain("'tangol'");
    expect(sql).toContain('ON CONFLICT ("provider") DO UPDATE');
    expect(sql).not.toContain("'freetour'");
  });

  it("REQ-3463: una ciudad nueva se da de alta con su slug y nunca reescribe una que ya existe (REQ-130)", async () => {
    const repo = createTangolSqlRepo(vacio, newId);
    await repo.upsertCities([{ id: 9_000_001, countryId: 1, name: "El Calafate", slug: "el-calafate", geonameid: null, idSource: "rango" }]);
    const sql = repo.sql();
    expect(sql).toContain('INSERT INTO "City"');
    expect(sql).toContain('ON CONFLICT ("id") DO NOTHING');
    expect(sql).toContain("'el-calafate'");
    // El nombre va en los 6 idiomas del sitio.
    expect(sql).toContain('"es":"El Calafate"');
    expect(sql).toContain('"en":"El Calafate"');
  });

  it("REQ-3463: el alta de ciudades no actualiza nada de una ciudad existente", () => {
    const [st] = cityStatements([{ id: 5, countryId: 1, translations: { es: "x" }, slug: null, geonameid: 123 }]);
    expect(st.sql).toContain('ON CONFLICT ("id") DO NOTHING');
    expect(st.sql).not.toMatch(/DO UPDATE/);
    expect(st.params).toEqual([5, 1, '{"es":"x"}', null, 123]);
  });

  it("REQ-3462: el alta de países del proveedor escribe iso2 y no borra el guardado", async () => {
    const repo = createTangolSqlRepo(vacio, newId);
    await repo.upsertCountries([{ id: 9_000_001, code: "PY", iso2: "PY", translations: { es: "Paraguay", en: "Paraguay" } }]);
    const sql = repo.sql();
    expect(sql).toContain('INSERT INTO "Country"');
    expect(sql).toContain('"iso2" = COALESCE(excluded."iso2", "Country"."iso2")');
    expect(sql).toContain("'PY'");
  });
});

describe("REQ-3464: lectura del export de D1", () => {
  const wrangler = (results: unknown[]) => [{ results }];

  it("REQ-3464: acepta la salida de wrangler --json y también un arreglo suelto", () => {
    expect(readExportRows(wrangler([{ id: 1 }]))).toEqual([{ id: 1 }]);
    expect(readExportRows([{ id: 1 }])).toEqual([{ id: 1 }]);
    expect(readExportRows(null)).toEqual([]);
  });

  it("REQ-3464: los países llegan con su iso2 (y el vacío queda en null)", () => {
    expect(toExistingCountries([{ id: "1", code: "ES", iso2: "ES" }, { id: 2, code: "C2", iso2: "" }])).toEqual([
      { id: 1, code: "ES", iso2: "ES" },
      { id: 2, code: "C2", iso2: null },
    ]);
  });

  it("REQ-3464: las traducciones de una ciudad llegan como objeto, vengan como texto JSON o ya convertidas", () => {
    const [a, b] = toExistingCities([
      { id: "10", countryId: "1", iso2: "AR", slug: "buenos-aires", stateCode: null, geonameid: "3435910", translations: '{"es":"Buenos Aires"}' },
      { id: 11, countryId: 1, iso2: null, slug: null, stateCode: null, geonameid: null, translations: "no es json" },
    ]);
    expect(a).toEqual({ id: 10, countryId: 1, iso2: "AR", slug: "buenos-aires", stateCode: null, geonameid: 3435910, translations: { es: "Buenos Aires" } });
    expect(b.translations).toBeNull();
  });

  it("REQ-3464: sin fila de SyncMetadata el estado es null (la corrida arranca desde el primer destino)", () => {
    expect(toSyncState([])).toBeNull();
    expect(toSyncState([{ status: "in_progress", nextPage: "11", totalPages: "184", runStartedAt: "2026-11-12 09:00:00" }])).toEqual({
      status: "in_progress",
      nextPage: 11,
      totalPages: 184,
      runStartedAt: new Date("2026-11-12 09:00:00"),
    });
  });
});
