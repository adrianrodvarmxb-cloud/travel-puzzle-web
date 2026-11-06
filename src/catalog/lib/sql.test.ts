import { describe, it, expect } from "vitest";
import { tourStatements, publishTourStatements, ratingStatements, stageStatements, backupStatements, presenceStatements, publishBatch, slugStatements } from "./sql";
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

  it("guarda primero los tours y luego sus traducciones (que apuntan al tour por externalId)", () => {
    const stmts = tourStatements([row(6782)], now, newId);
    expect(stmts[0].sql).toMatch(/^INSERT INTO "Tour"/);
    expect(stmts[0].sql).toContain('ON CONFLICT ("externalId") DO UPDATE');
    expect(stmts[0].sql).not.toMatch(/SET .*"id" = excluded/);
    expect(stmts[0].sql).not.toMatch(/"createdAt" = excluded/);
    const tr = stmts[stmts.length - 1];
    expect(tr.sql).toMatch(/^INSERT INTO "TourTranslation"/);
    expect(tr.sql).toContain('(SELECT "id" FROM "Tour" WHERE "externalId" = ?)');
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
    expect(s.sql).toBe('UPDATE "Tour" SET "rating" = ?, "reviewsNumber" = ? WHERE "externalId" = ?');
    expect(s.params).toEqual([4.9, 10, 5]);
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
    expect(stmts[0].sql).toMatch(/^UPDATE "Tour" SET "syncStatus" = \?, "missingRuns" = \?, "isActive" = \? WHERE "externalId" IN \(/);
    const ids = stmts.flatMap((s) => s.params.slice(3));
    expect(ids).toHaveLength(251);
    const removed = stmts.find((s) => s.params[0] === "removed")!;
    expect(removed.params).toEqual(["removed", 3, 0, 999]);
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
    expect(st.sql).toBe('UPDATE "Tour" SET "slug" = ? WHERE "externalId" = ? AND "slug" IS NULL');
    expect(st.params).toEqual(["tour-7", 7]);
  });

  it("REQ-086: el batch de publicación escribe los slugs después de insertar los tours", () => {
    const stmts = publishBatch({
      runId: "r1", startedAt: new Date(0), now: new Date(0), newId: () => "x", ratings: [], backups: [], cursor: 7, finalize: null,
      tours: [], slugs: [{ externalId: 7, slug: "tour-7" }],
    });
    expect(stmts.some((s) => s.sql.startsWith('UPDATE "Tour" SET "slug"'))).toBe(true);
  });
});
