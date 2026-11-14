import { describe, it, expect } from "vitest";
import { tourStatements, publishTourStatements, ratingStatements, stageStatements, backupStatements, presenceStatements, publishBatch, slugStatements, cityIndexStatements, countryStatements } from "./sql";
import { MAX_PARAMS } from "@/lib/d1/batch";

const now = new Date("2026-10-30T10:00:00Z");
const row = (externalId: number) => ({
  tour: {
    externalId, providerTitle: "p", providerPhone: null, priceValue: 0, priceCurrency: "EUR", duration: "2:00", durationMinutes: 120,
    titleImageURL: null, categoryId: 1, rating: 4.5, reviewsNumber: 3, cityId: 10, countryId: 99,
    meetingPoint: { es: "Zócalo" }, includes: [], POIs: null, images: [], videoURL: null, isActive: true as const, lastSeenAt: now,
  },
  translations: ["en", "es", "pt", "de", "fr", "it"].map((language) => ({ language, title: `t-${language}`, brief: null, description: null, url: "u" })) as never,
});

describe("tourStatements", () => {
  const ids = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n"];
  let n = 0;
  const newId = () => ids[n++ % ids.length];

  it("guarda primero los tours y luego sus traducciones (que apuntan al tour por proveedor y externalId)", () => {
    const stmts = tourStatements([row(6782)], now, newId);
    expect(stmts[0].sql).toMatch(/^INSERT INTO "Tour"/);
    expect(stmts[0].sql).toContain('ON CONFLICT ("providerId", "externalId") DO UPDATE');
    expect(stmts[0].sql).not.toMatch(/SET .*"id" = excluded/);
    expect(stmts[0].sql).not.toMatch(/"createdAt" = excluded/);
    const tr = stmts[stmts.length - 1];
    expect(tr.sql).toMatch(/^INSERT INTO "TourTranslation"/);
    expect(tr.sql).toContain('(SELECT "id" FROM "Tour" WHERE "providerId" = ? AND "externalId" = ?)');
    expect(tr.sql).toContain('ON CONFLICT ("tourId", "language") DO UPDATE');
  });

  it("una página completa (100 tours) nunca pasa de 100 parámetros por sentencia y queda en pocas sentencias", () => {
    const stmts = tourStatements(Array.from({ length: 100 }, (_, i) => row(i + 1)), now, newId);
    expect(stmts.every((s) => s.params.length <= MAX_PARAMS)).toBe(true);
    expect(stmts.length).toBeLessThan(200);
  });
});

describe("sync blindado: sentencias", () => {
  let n = 0;
  const newId = () => `id${n++}`;

  it("REQ-073: publicar un tour guarda también su contentHash", () => {
    const stmts = publishTourStatements([{ ...row(5), hash: "h5" }], now, newId);
    expect(stmts[0].sql).toMatch(/^INSERT INTO "Tour"/);
    expect(stmts[0].sql).toContain('"contentHash" = excluded."contentHash"');
    expect(stmts[0].params).toContain("h5");
    expect(stmts.every((s) => s.params.length <= MAX_PARAMS)).toBe(true);
  });

  it("REQ-073: un cambio solo de calificación actualiza rating y reseñas sin tocar updatedAt", () => {
    const [s] = ratingStatements([{ externalId: 5, rating: 4.9, reviewsNumber: 10 }]);
    expect(s.sql).toBe('UPDATE "Tour" SET "rating" = ?, "reviewsNumber" = ? WHERE "providerId" = ? AND "externalId" = ?');
    expect(s.params).toEqual([4.9, 10, "freetour", 5]);
  });

  it("REQ-071: el staging guarda por corrida y no toca Tour", () => {
    const stmts = stageStatements("run1", [{ externalId: 5, hash: "h", kind: "same", payload: null }], now);
    expect(stmts).toHaveLength(1);
    expect(stmts[0].sql).toMatch(/^INSERT INTO "TourStage"/);
    expect(stmts[0].sql).toContain('ON CONFLICT ("runId", "externalId") DO UPDATE');
    expect(stmts.some((s) => s.sql.includes('"Tour"'))).toBe(false);
  });

  it("REQ-072: el respaldo guarda la fila anterior en TourStage.previous", () => {
    const [s] = backupStatements("run1", [{ externalId: 5, previous: { providerTitle: "viejo" } }]);
    expect(s.sql).toBe('UPDATE "TourStage" SET "previous" = ? WHERE "runId" = ? AND "externalId" = ?');
    expect(s.params).toEqual(['{"providerTitle":"viejo"}', "run1", 5]);
  });

  it("REQ-074: las transiciones de presencia se agrupan por estado sin pasar de 100 parámetros", () => {
    const updates = Array.from({ length: 250 }, (_, i) => ({ externalId: i + 1, syncStatus: "missing" as const, missingRuns: 1, isActive: true }));
    updates.push({ externalId: 999, syncStatus: "removed" as never, missingRuns: 3, isActive: false });
    const stmts = presenceStatements(updates);
    expect(stmts.every((s) => s.params.length <= MAX_PARAMS)).toBe(true);
    expect(stmts[0].sql).toMatch(/^UPDATE "Tour" SET "syncStatus" = \?, "missingRuns" = \?, "isActive" = \? WHERE "providerId" = \? AND "externalId" IN \(/);
    const ids = stmts.flatMap((s) => s.params.slice(4));
    expect(ids).toHaveLength(251);
    const removed = stmts.find((s) => s.params[0] === "removed")!;
    expect(removed.params).toEqual(["removed", 3, 0, "freetour", 999]);
  });

  it("REQ-072: el paso final publica, aplica presencia, cierra la corrida y avanza el checkpoint en el mismo batch, en ese orden", () => {
    const stmts = publishBatch({
      runId: "run1",
      startedAt: now,
      now,
      newId,
      tours: [{ ...row(5), hash: "h5" }],
      ratings: [{ externalId: 6, rating: 4, reviewsNumber: 2 }],
      backups: [{ externalId: 5, previous: {} }],
      cursor: 6,
      finalize: {
        updates: [{ externalId: 7, syncStatus: "missing", missingRuns: 1, isActive: true }],
        counts: { missing: 1, removed: 0, reactivated: 0 },
        seen: 2,
        totalPages: 1,
      },
    });
    const idx = (re: RegExp) => stmts.findIndex((s) => re.test(s.sql));
    expect(idx(/^UPDATE "TourStage" SET "previous"/)).toBe(0);
    expect(idx(/^UPDATE "TourStage" SET "previous"/)).toBeLessThan(idx(/^INSERT INTO "Tour" /));
    expect(idx(/^INSERT INTO "Tour" /)).toBeLessThan(idx(/^UPDATE "Tour" SET "syncStatus"/));
    expect(idx(/^UPDATE "Tour" SET "syncStatus"/)).toBeLessThan(idx(/^UPDATE "SyncRun" SET "status" = 'succeeded'/));
    expect(idx(/^INSERT INTO "SyncMetadata"/)).toBeGreaterThan(idx(/^UPDATE "SyncRun"/));
    expect(stmts[idx(/^INSERT INTO "SyncMetadata"/)].params).toContain("completed");
  });

  it("REQ-072: un paso intermedio solo publica y avanza el cursor; no toca presencia ni el checkpoint", () => {
    const stmts = publishBatch({ runId: "run1", startedAt: now, now, newId, tours: [], ratings: [], backups: [], cursor: 100, finalize: null });
    expect(stmts).toHaveLength(1);
    expect(stmts[0].sql).toBe('UPDATE "SyncRun" SET "publishCursor" = ?, "updatedAt" = ? WHERE "id" = ?');
  });
});

describe("slugs del sync blindado", () => {
  it("REQ-086: solo llena el slug vacío; nunca sobrescribe uno guardado", () => {
    const [st] = slugStatements([{ externalId: 7, slug: "tour-7" }]);
    expect(st.sql).toBe('UPDATE "Tour" SET "slug" = ? WHERE "providerId" = ? AND "externalId" = ? AND "slug" IS NULL');
    expect(st.params).toEqual(["tour-7", "freetour", 7]);
  });

  it("REQ-086: el batch de publicación escribe los slugs después de insertar los tours", () => {
    const stmts = publishBatch({
      runId: "r1", startedAt: new Date(0), now: new Date(0), newId: () => "x", ratings: [], backups: [], cursor: 7, finalize: null,
      tours: [], slugs: [{ externalId: 7, slug: "tour-7" }],
    });
    expect(stmts.some((s) => s.sql.startsWith('UPDATE "Tour" SET "slug"'))).toBe(true);
  });
});

describe("estado de indexación de ciudades", () => {
  it("REQ-090: una sentencia por ciudad, fechas como las guarda Prisma y null para borrar", () => {
    const [st] = cityIndexStatements([{ id: 20, indexableSince: null, failingSince: "2026-11-04T09:09:00.000Z" }]);
    expect(st.sql).toBe('UPDATE "City" SET "indexableSince" = ?, "failingSince" = ? WHERE "id" = ?');
    expect(st.params).toEqual([null, "2026-11-04T09:09:00.000+00:00", 20]);
  });
});

// ───────────── REQ-3461 / REQ-3462: el escritor es por proveedor ─────────────

describe("REQ-3461: un tour se identifica por (providerId, externalId)", () => {
  let n = 0;
  const newId = () => `id${n++}`;
  const tangol = (externalId: number) => {
    const r = row(externalId);
    return { ...r, tour: { ...r.tour, providerId: "tangol", providerTitle: "Travel Puzzle" } };
  };

  it("REQ-3461: Freetour sigue escribiéndose igual — misma tabla y providerId 'freetour' explícito", () => {
    const stmts = tourStatements([row(6782)], now, newId);
    expect(stmts[0].sql).toMatch(/^INSERT INTO "Tour" \("id", "providerId", "externalId"/);
    expect(stmts[0].sql).toContain('ON CONFLICT ("providerId", "externalId") DO UPDATE');
    // El proveedor y el número son la llave: nunca se actualizan a sí mismos.
    expect(stmts[0].sql).not.toMatch(/SET .*"providerId" = excluded/);
    expect(stmts[0].sql).not.toMatch(/SET .*"externalId" = excluded/);
    expect(stmts[0].sql).not.toMatch(/SET .*"id" = excluded/);
    expect(stmts[0].sql).not.toMatch(/"createdAt" = excluded/);
    // Una fila de Freetour (sin providerId propio) se guarda como "freetour", igual que el DEFAULT de la columna.
    expect(stmts[0].params[1]).toBe("freetour");
    expect(stmts[0].params[2]).toBe(6782);
  });

  it("REQ-3461: las traducciones buscan su tour por (proveedor, número), no solo por número", () => {
    const stmts = tourStatements([row(6782)], now, newId);
    const tr = stmts[stmts.length - 1];
    expect(tr.sql).toMatch(/^INSERT INTO "TourTranslation"/);
    expect(tr.sql).toContain('(SELECT "id" FROM "Tour" WHERE "providerId" = ? AND "externalId" = ?)');
    expect(tr.params[1]).toBe("freetour");
    expect(tr.params[2]).toBe(6782);
    expect(tr.params.length).toBeLessThanOrEqual(MAX_PARAMS);
  });

  it("REQ-3461: un tour de Tangol con el mismo externalId que uno de Freetour convive (dos filas, dos proveedores)", () => {
    const stmts = tourStatements([row(1234), tangol(1234)], now, newId);
    const insert = stmts.find((s) => s.sql.startsWith('INSERT INTO "Tour" '))!;
    // Las dos filas van en la MISMA sentencia y solo se distinguen por el proveedor.
    expect(insert.params.filter((p) => p === "freetour" || p === "tangol")).toEqual(["freetour", "tangol"]);
    expect(insert.sql).toContain('ON CONFLICT ("providerId", "externalId") DO UPDATE');
    // Nada en el SQL resuelve el conflicto solo por número (eso es lo que impedía cargar Tangol).
    expect(stmts.every((s) => !s.sql.includes('ON CONFLICT ("externalId")'))).toBe(true);
    // Y cada traducción apunta a su propio proveedor.
    const traducciones = stmts.filter((s) => s.sql.startsWith('INSERT INTO "TourTranslation"'));
    expect(traducciones.map((s) => s.params[1])).toEqual(["freetour", "tangol"]);
  });

  it("REQ-3461: una página completa de 100 tours sigue por debajo de 100 parámetros por sentencia", () => {
    const stmts = tourStatements(Array.from({ length: 100 }, (_, i) => row(i + 1)), now, newId);
    expect(stmts.every((s) => s.params.length <= MAX_PARAMS)).toBe(true);
    expect(stmts.length).toBeLessThan(200);
  });

  it("REQ-3461: publicar con contentHash (sync blindado) también va por (proveedor, número)", () => {
    const stmts = publishTourStatements([{ ...row(5), hash: "h5" }], now, newId);
    expect(stmts[0].sql).toContain('ON CONFLICT ("providerId", "externalId") DO UPDATE');
    expect(stmts[0].sql).toContain('"contentHash" = excluded."contentHash"');
  });

  it("REQ-3461: calificación, slug y presencia también apuntan a un solo proveedor", () => {
    const [slug] = slugStatements([{ externalId: 7, slug: "tour-7" }]);
    expect(slug.sql).toBe('UPDATE "Tour" SET "slug" = ? WHERE "providerId" = ? AND "externalId" = ? AND "slug" IS NULL');
    expect(slug.params).toEqual(["tour-7", "freetour", 7]);

    const [presence] = presenceStatements([{ externalId: 9, syncStatus: "missing", missingRuns: 1, isActive: true }]);
    expect(presence.sql).toMatch(/WHERE "providerId" = \? AND "externalId" IN \(\?\)$/);
    expect(presence.params).toEqual(["missing", 1, 1, "freetour", 9]);
  });

  it("REQ-3461: el mismo escritor sirve a otro proveedor sin tocar al de Freetour", () => {
    const [rating] = ratingStatements([{ externalId: 5, rating: null, reviewsNumber: 0 }], "tangol");
    expect(rating.params).toEqual([null, 0, "tangol", 5]);
    const [presence] = presenceStatements([{ externalId: 9, syncStatus: "removed", missingRuns: 3, isActive: false }], "tangol");
    expect(presence.params).toEqual(["removed", 3, 0, "tangol", 9]);
    const [slug] = slugStatements([{ externalId: 9, slug: "s" }], "tangol");
    expect(slug.params).toEqual(["s", "tangol", 9]);
  });
});

describe("REQ-3462: el alta de países escribe iso2 y nunca lo borra", () => {
  it("REQ-3462: un país nuevo se guarda con su iso2", () => {
    const [st] = countryStatements([{ id: 9_000_001, code: "PY", iso2: "PY", translations: { es: "Paraguay", en: "Paraguay" } }]);
    expect(st.sql).toMatch(/^INSERT INTO "Country" \("id", "code", "iso2", "translations"\) VALUES \(\?, \?, \?, \?\)/);
    expect(st.sql).toContain('ON CONFLICT ("id") DO UPDATE');
    expect(st.params).toEqual([9_000_001, "PY", "PY", '{"es":"Paraguay","en":"Paraguay"}']);
  });

  it("REQ-3462: un país de Freetour sin iso2 no borra el iso2 que ya está guardado", () => {
    const [st] = countryStatements([{ id: 1, code: "ES", translations: { es: "España" } }]);
    expect(st.sql).toContain('"iso2" = COALESCE(excluded."iso2", "Country"."iso2")');
    expect(st.sql).not.toMatch(/"iso2" = excluded\."iso2"/);
    expect(st.params).toEqual([1, "ES", null, '{"es":"España"}']);
  });

  it("REQ-3462: una lista larga se parte en sentencias de 100 parámetros como máximo", () => {
    const rows = Array.from({ length: 200 }, (_, i) => ({ id: i + 1, code: `C${i + 1}`, iso2: null, translations: {} }));
    const stmts = countryStatements(rows);
    expect(stmts.every((s) => s.params.length <= MAX_PARAMS)).toBe(true);
    expect(stmts.flatMap((s) => s.params)).toHaveLength(800);
  });

  it("REQ-3462: sin países no hay sentencias", () => {
    expect(countryStatements([])).toEqual([]);
  });
});
