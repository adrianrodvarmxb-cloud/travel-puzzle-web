import { describe, it, expect, vi } from "vitest";
import { runGuardedSyncStep, type GuardedRepo, type RunPatch } from "./guarded-sync";
import type { RunState } from "./lib/guard-plan";
import type { StagedRow } from "./lib/sql";
import type { StageKind } from "./lib/content-hash";
import {
  BASE_CATALOG, RENAMED_CATALOG, DELETED_CATALOG, RATING_ONLY_CATALOG, DROPPED_CATALOG, EMPTY_FEED,
  pagedFeed, feedTour, error500, error429, loginRejected, type FeedTour,
} from "./fixtures/freetour-feeds";

/** Base de datos en memoria con la misma semántica que el repositorio de D1. */
function memoryRepo() {
  const tours = new Map<number, { title: string; contentHash: string | null; rating: number | null; reviewsNumber: number; syncStatus: string; missingRuns: number; isActive: boolean }>();
  const runs: (RunState & Record<string, unknown>)[] = [];
  const stages = new Map<string, Map<number, StagedRow & { previous?: unknown }>>();
  const meta: { checkpoint: Date | null } = { checkpoint: null };
  let tourWrites = 0;
  let failPublish = false;

  const repo: GuardedRepo = {
    existingCityIds: async (ids) => ids,
    existingCountryIds: async (ids) => ids,
    upsertCountries: async () => {},
    upsertCities: async () => {},
    latestRun: async () => (runs.length ? { ...runs[runs.length - 1] } : null),
    lastSuccess: async () => {
      const ok = runs.filter((r) => r.status === "succeeded");
      const last = ok[ok.length - 1];
      return last ? { finishedAt: last.finishedAt as Date, seen: last.seen as number } : null;
    },
    activeCount: async () => [...tours.values()].filter((t) => t.isActive).length,
    createRun: async ({ id, startedAt, baseline }) => {
      runs.push({ id, status: "staging", startedAt, nextPage: 1, totalPages: 0, failures: 0, notBefore: null, publishCursor: 0, baseline, abortReason: null, seen: 0 });
      stages.set(id, new Map());
    },
    updateRun: async (id, patch: RunPatch) => { Object.assign(runs.find((r) => r.id === id)!, patch); },
    cleanupStages: async () => {},
    storedTours: async (ids) => new Map(ids.filter((id) => tours.has(id)).map((id) => [id, tours.get(id)!])),
    stage: async (runId, rows) => { for (const r of rows) stages.get(runId)!.set(r.externalId, { ...r }); },
    stageCounts: async (runId) => {
      const c: Record<StageKind, number> = { new: 0, changed: 0, rating: 0, same: 0 };
      for (const r of stages.get(runId)!.values()) c[r.kind]++;
      return c;
    },
    nextChunk: async (runId, after, limit) =>
      [...stages.get(runId)!.values()].filter((r) => r.kind !== "same" && r.externalId > after).sort((a, b) => a.externalId - b.externalId).slice(0, limit),
    presenceInputs: async (runId) =>
      [...tours.entries()].map(([externalId, t]) => ({ externalId, syncStatus: t.syncStatus, missingRuns: t.missingRuns, isActive: t.isActive, seen: stages.get(runId)!.has(externalId) })),
    publish: async ({ runId, tours: rows, ratings, cursor, finalize, now }) => {
      if (failPublish) throw new Error("D1 batch falló");
      for (const r of rows) {
        const prev = tours.get(r.tour.externalId);
        if (prev) stages.get(runId)!.get(r.tour.externalId)!.previous = { ...prev };
        tours.set(r.tour.externalId, {
          title: r.translations[0]?.title ?? "", contentHash: r.hash, rating: r.tour.rating, reviewsNumber: r.tour.reviewsNumber,
          syncStatus: prev?.syncStatus ?? "active", missingRuns: prev?.missingRuns ?? 0, isActive: true,
        });
        tourWrites++;
      }
      for (const r of ratings) { Object.assign(tours.get(r.externalId)!, { rating: r.rating, reviewsNumber: r.reviewsNumber }); tourWrites++; }
      const run = runs.find((x) => x.id === runId)!;
      run.publishCursor = cursor;
      if (finalize) {
        for (const u of finalize.updates) { Object.assign(tours.get(u.externalId)!, { syncStatus: u.syncStatus, missingRuns: u.missingRuns, isActive: u.isActive }); tourWrites++; }
        Object.assign(run, { status: "succeeded", finishedAt: now, ...finalize.counts });
        meta.checkpoint = now;
      }
    },
  };
  return {
    repo, tours, runs, stages, meta,
    writes: () => tourWrites,
    failPublishes: (v: boolean) => { failPublish = v; },
  };
}

function feedApi(source: (page: number) => unknown) {
  return { get: vi.fn(async (path: string) => {
    if (path.startsWith("/tours?page=")) {
      const r = source(Number(path.split("=")[1]));
      if (r instanceof Error) throw r;
      return r;
    }
    return { data: [] };
  }) };
}

const countries = [{ id: 99, shortTitle: "mx", title: { en: "Mexico", es: "México", pt: "", de: "", fr: "", it: "" } }];
const day = (n: number) => new Date(Date.UTC(2026, 10, n, 9, 5)); // 3:05 CDMX
let seq = 0;
const newId = () => `run${++seq}`;

/** Corre minuto a minuto hasta que la corrida termine o aborte. */
async function runDay(db: ReturnType<typeof memoryRepo>, source: (page: number) => unknown, start: Date, chunkSize?: number) {
  const api = feedApi(source);
  const results: Record<string, unknown>[] = [];
  for (let i = 0; i < 60; i++) {
    const now = new Date(start.getTime() + i * 60_000);
    const res = await runGuardedSyncStep({ api, repo: db.repo, countries: countries as never, now, newId, chunkSize });
    results.push(res);
    if (res.action === "finish" || res.action === "abort") break;
  }
  return results;
}

const last = (r: Record<string, unknown>[]) => r[r.length - 1];

async function seeded() {
  const db = memoryRepo();
  await runDay(db, pagedFeed(BASE_CATALOG), day(1));
  return db;
}

describe("runGuardedSyncStep: corrida normal", () => {
  it("REQ-072: primera corrida: lee las páginas al staging, cierra, publica y avanza el checkpoint", async () => {
    const db = memoryRepo();
    const results = await runDay(db, pagedFeed(BASE_CATALOG), day(1));
    expect(results.map((r) => r.action)).toEqual(["start", "page", "page", "close", "finish"]);
    expect(db.tours.size).toBe(6);
    expect(db.runs[0]).toMatchObject({ status: "succeeded", seen: 6, added: 6, changed: 0 });
    expect(db.meta.checkpoint).toEqual(results.length && new Date(day(1).getTime() + 4 * 60_000));
  });

  it("REQ-071: mientras la corrida está en staging, Tour no se toca", async () => {
    const db = memoryRepo();
    const api = feedApi(pagedFeed(BASE_CATALOG));
    await runGuardedSyncStep({ api, repo: db.repo, countries: countries as never, now: day(1), newId });
    expect(db.writes()).toBe(0);
    expect(db.stages.get(db.runs[0].id)!.size).toBe(2);
  });

  it("REQ-073: doble corrida sin cambios = 0 escrituras en Tour", async () => {
    const db = await seeded();
    const before = db.writes();
    const results = await runDay(db, pagedFeed(BASE_CATALOG), day(2));
    expect(last(results)).toMatchObject({ action: "finish", missing: 0, removed: 0, reactivated: 0 });
    expect(db.writes()).toBe(before);
    expect(db.runs[1]).toMatchObject({ status: "succeeded", seen: 6, added: 0, changed: 0, ratingUpdates: 0 });
  });

  it("REQ-073: tour renombrado: solo se reescribe ese tour y se respalda su versión anterior", async () => {
    const db = await seeded();
    const before = db.writes();
    await runDay(db, pagedFeed(RENAMED_CATALOG), day(2));
    expect(db.writes() - before).toBe(1);
    expect(db.tours.get(2)!.title).toBe("Tour 2 · nuevo nombre");
    expect(db.stages.get(db.runs[1].id)!.get(2)!.previous).toMatchObject({ title: "Tour 2" });
    expect(db.runs[1]).toMatchObject({ changed: 1, added: 0 });
  });

  it("REQ-073: un cambio solo de calificación se actualiza sin contar como cambio de contenido", async () => {
    const db = await seeded();
    const hash = db.tours.get(3)!.contentHash;
    await runDay(db, pagedFeed(RATING_ONLY_CATALOG), day(2));
    expect(db.tours.get(3)).toMatchObject({ rating: 4.1, reviewsNumber: 101, contentHash: hash });
    expect(db.runs[1]).toMatchObject({ changed: 0, ratingUpdates: 1 });
  });
});

describe("runGuardedSyncStep: presencia", () => {
  it("REQ-074: tour eliminado: missing, y removed tras 3 corridas exitosas sin él; si reaparece vuelve a active", async () => {
    const db = await seeded();
    await runDay(db, pagedFeed(DELETED_CATALOG), day(2));
    expect(db.tours.get(6)).toMatchObject({ syncStatus: "missing", missingRuns: 1, isActive: true });
    await runDay(db, pagedFeed(DELETED_CATALOG), day(3));
    expect(db.tours.get(6)).toMatchObject({ syncStatus: "missing", missingRuns: 2, isActive: true });
    const r = await runDay(db, pagedFeed(DELETED_CATALOG), day(4));
    expect(last(r)).toMatchObject({ action: "finish", removed: 1 });
    expect(db.tours.get(6)).toMatchObject({ syncStatus: "removed", missingRuns: 3, isActive: false });
    const back = await runDay(db, pagedFeed(BASE_CATALOG), day(5));
    expect(last(back)).toMatchObject({ action: "finish", reactivated: 1 });
    expect(db.tours.get(6)).toMatchObject({ syncStatus: "active", missingRuns: 0, isActive: true });
  });

  it("REQ-074: una corrida abortada no cuenta como ausencia", async () => {
    const db = await seeded();
    await runDay(db, pagedFeed(DELETED_CATALOG), day(2));
    await runDay(db, EMPTY_FEED, day(3));
    expect(db.tours.get(6)).toMatchObject({ syncStatus: "missing", missingRuns: 1 });
  });
});

describe("runGuardedSyncStep: barrera de cordura", () => {
  it("REQ-071: feed vacío aborta sin tocar Tour ni el checkpoint", async () => {
    const db = await seeded();
    const before = db.writes();
    const checkpoint = db.meta.checkpoint;
    const r = await runDay(db, EMPTY_FEED, day(2));
    expect(last(r)).toMatchObject({ action: "abort", reason: "empty" });
    expect(db.writes()).toBe(before);
    expect(db.meta.checkpoint).toEqual(checkpoint);
    expect(db.runs[1]).toMatchObject({ status: "aborted" });
    expect(String(db.runs[1].abortReason)).toMatch(/^empty/);
    expect([...db.tours.values()].every((t) => t.isActive)).toBe(true);
  });

  it("REQ-071: más de 20 % menos tours que la última corrida exitosa aborta al cerrar", async () => {
    const db = await seeded();
    const before = db.writes();
    const r = await runDay(db, pagedFeed(DROPPED_CATALOG), day(2));
    expect(last(r)).toMatchObject({ action: "abort", reason: "drop" });
    expect(db.writes()).toBe(before);
    expect(db.tours.get(6)).toMatchObject({ syncStatus: "active", isActive: true });
    expect(db.runs[1]).toMatchObject({ status: "aborted", seen: 4 });
  });

  it("REQ-071: después de un aborto, la línea base sigue siendo la última corrida exitosa", async () => {
    const db = await seeded();
    await runDay(db, EMPTY_FEED, day(2));
    await runDay(db, pagedFeed(BASE_CATALOG), day(3));
    expect(db.runs[2]).toMatchObject({ baseline: 6, status: "succeeded" });
  });
});

describe("runGuardedSyncStep: errores de la API", () => {
  it("REQ-077: un 500 espera y reintenta la misma página; luego sigue", async () => {
    const db = await seeded();
    let calls = 0;
    const source = (page: number) => (page === 2 && calls++ === 0 ? error500() : pagedFeed(BASE_CATALOG)(page));
    const r = await runDay(db, source, day(2));
    // La espera mínima es 1 minuto: el siguiente minuto ya reintenta.
    expect(r.map((x) => x.action)).toEqual(["start", "retry", "page", "page", "close", "finish"]);
    expect(db.runs[1]).toMatchObject({ status: "succeeded", failures: 0 });
  });

  it("REQ-077: cinco 500 seguidos abortan la corrida sin tocar Tour", async () => {
    const db = await seeded();
    const before = db.writes();
    const r = await runDay(db, (page) => (page === 1 ? pagedFeed(BASE_CATALOG)(1) : error500()), day(2));
    expect(last(r)).toMatchObject({ action: "abort", reason: "error" });
    expect(r.filter((x) => x.action === "retry")).toHaveLength(4);
    expect(db.writes()).toBe(before);
  });

  it("REQ-077: un 429 espera lo que pide Retry-After", async () => {
    const db = await seeded();
    let calls = 0;
    const source = (page: number) => (page === 1 && calls++ === 0 ? error429("180") : pagedFeed(BASE_CATALOG)(page));
    const r = await runDay(db, source, day(2));
    expect(r[0]).toMatchObject({ action: "retry", status: 429, notBefore: new Date(day(2).getTime() + 180_000).toISOString() });
    expect(r.slice(1, 3).map((x) => x.action)).toEqual(["wait", "wait"]);
    expect(last(r)).toMatchObject({ action: "finish" });
  });

  it("REQ-077: un login rechazado aborta sin reintentar y bloquea las demás lecturas del día", async () => {
    const db = await seeded();
    const api = feedApi(() => loginRejected());
    const first = await runGuardedSyncStep({ api, repo: db.repo, countries: countries as never, now: day(2), newId });
    expect(first).toMatchObject({ action: "abort", reason: "login" });
    const next = await runGuardedSyncStep({ api, repo: db.repo, countries: countries as never, now: new Date(day(2).getTime() + 60_000), newId });
    expect(next).toMatchObject({ action: "idle", loginBlocked: true });
    expect(api.get).toHaveBeenCalledTimes(1);
  });
});

describe("runGuardedSyncStep: publicación", () => {
  it("REQ-072: muchas filas se publican en pasos; presencia y checkpoint solo en el último", async () => {
    const big = Array.from({ length: 250 }, (_, i) => feedTour(i + 1));
    const db = memoryRepo();
    await runDay(db, pagedFeed(big, 100), day(1));
    const changed = big.map((t) => ({ ...t, price: { value: 5, currency: "EUR" } })).filter((t) => t.id !== 250);
    const api = feedApi(pagedFeed(changed, 100));
    const actions: string[] = [];
    for (let i = 0; i < 10; i++) {
      const res = await runGuardedSyncStep({ api, repo: db.repo, countries: countries as never, now: new Date(day(2).getTime() + i * 60_000), newId });
      actions.push(res.action);
      if (res.action === "publish") {
        expect(db.runs[1].status).toBe("publishing");
        expect(db.tours.get(250)).toMatchObject({ syncStatus: "active" });
        expect(db.meta.checkpoint).toEqual(new Date(day(1).getTime() + 6 * 60_000));
      }
      if (res.action === "finish") break;
    }
    expect(actions).toEqual(["start", "page", "page", "close", "publish", "publish", "finish"]);
    expect(db.tours.get(250)).toMatchObject({ syncStatus: "missing" });
    expect(db.runs[1]).toMatchObject({ status: "succeeded", changed: 249, missing: 1 });
  });

  it("REQ-072: si el batch de publicación falla, la corrida sigue en publishing y el checkpoint no avanza", async () => {
    const db = await seeded();
    const checkpoint = db.meta.checkpoint;
    db.failPublishes(true);
    const api = feedApi(pagedFeed(RENAMED_CATALOG));
    for (let i = 0; i < 4; i++) await runGuardedSyncStep({ api, repo: db.repo, countries: countries as never, now: new Date(day(2).getTime() + i * 60_000), newId });
    await expect(runGuardedSyncStep({ api, repo: db.repo, countries: countries as never, now: new Date(day(2).getTime() + 4 * 60_000), newId })).rejects.toThrow("D1");
    expect(db.runs[1].status).toBe("publishing");
    expect(db.meta.checkpoint).toEqual(checkpoint);
    db.failPublishes(false);
    const ok = await runGuardedSyncStep({ api, repo: db.repo, countries: countries as never, now: new Date(day(2).getTime() + 5 * 60_000), newId });
    expect(ok).toMatchObject({ action: "finish" });
    expect(db.tours.get(2)!.title).toBe("Tour 2 · nuevo nombre");
  });

  it("REQ-072: una corrida en staging de ayer se marca como superada al arrancar la del día", async () => {
    const db = await seeded();
    const api = feedApi(pagedFeed(BASE_CATALOG));
    await runGuardedSyncStep({ api, repo: db.repo, countries: countries as never, now: day(2), newId });
    await runDay(db, pagedFeed(BASE_CATALOG), day(3));
    expect(db.runs[1]).toMatchObject({ status: "aborted", abortReason: "superseded" });
    expect(db.runs[2]).toMatchObject({ status: "succeeded" });
  });
});

describe("runGuardedSyncStep: log y salud", () => {
  it("REQ-078: cada respuesta trae las horas desde el último sync exitoso y la alerta de 26 h", async () => {
    const db = await seeded();
    const api = feedApi(EMPTY_FEED);
    const res = await runGuardedSyncStep({ api, repo: db.repo, countries: countries as never, now: new Date(day(2).getTime() + 22 * 3_600_000), newId });
    expect(res.health).toMatchObject({ alert: true });
    expect(res.health.hoursSinceLastSuccess).toBeGreaterThan(26);
    const fresh = await seeded();
    const ok = await runGuardedSyncStep({ api, repo: fresh.repo, countries: countries as never, now: new Date(day(1).getTime() + 3_600_000), newId });
    expect(ok.health).toMatchObject({ alert: false, hoursSinceLastSuccess: 0.9 });
  });

  it("REQ-078: la corrida registra vistos, altas, cambios, ausentes, removidos y motivo de aborto", async () => {
    const db = await seeded();
    await runDay(db, pagedFeed(RENAMED_CATALOG.filter((t: FeedTour) => t.id !== 6)), day(2));
    expect(db.runs[1]).toMatchObject({ seen: 5, added: 0, changed: 1, missing: 1, removed: 0, status: "succeeded" });
    await runDay(db, EMPTY_FEED, day(3));
    expect(db.runs[2]).toMatchObject({ status: "aborted" });
    expect(db.runs[2].abortReason).toBeTruthy();
  });
});
