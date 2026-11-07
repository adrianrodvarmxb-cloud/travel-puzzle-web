/**
 * REQ-742, REQ-744: puerto RawArchive (archivo crudo en R2 PRIVADO + índice ProviderRecord en D1) y la orquestación
 * de una corrida. Las dependencias llegan por parámetro; la lógica de qué escribir es pura (lib/archive-plan.ts).
 * Orden: primero R2 y luego D1. No es atómico, pero la clave lleva la huella: reintentar es idempotente y un objeto
 * huérfano en R2 es inofensivo. Si algo falla se registra y se devuelve en el reporte: NUNCA lanza (el sync sigue).
 */
import { planArchive, type KnownVersions, type ProviderRecordRow, type RawItem } from "./lib/archive-plan";
import { upsertRows, runBatch, type D1Like } from "@/lib/d1/batch";

export interface RawArchive {
  /** Huella vigente y todas las huellas ya archivadas de esos externalId. */
  knownVersions(provider: string, externalIds: string[]): Promise<Map<string, KnownVersions>>;
  put(key: string, body: string | Uint8Array, contentType: string, meta?: Record<string, string>): Promise<void>;
  /** Inserta filas nuevas; si la versión ya existe solo actualiza lastSeenAt y runId. */
  record(rows: ProviderRecordRow[]): Promise<void>;
}

export interface ArchiveReport { written: number; revisited: number; same: number; failed: number; errors: string[] }

/** Puts en paralelo, de a pocos (límite de subpeticiones del Worker). */
const PUT_CONCURRENCY = 10;

// REQ-742, REQ-744
export async function archiveRawItems(
  archive: RawArchive, input: { provider: string; items: RawItem[]; runId: string; now: Date },
): Promise<ArchiveReport> {
  const report: ArchiveReport = { written: 0, revisited: 0, same: 0, failed: 0, errors: [] };
  try {
    const ids = [...new Set(input.items.map((i) => i.externalId ?? "_sin-id"))];
    const known = await archive.knownVersions(input.provider, ids);
    const plan = await planArchive(input.provider, input.items, known, { runId: input.runId, now: input.now.toISOString() });
    report.same = plan.same;
    const ok: ProviderRecordRow[] = [];
    for (let i = 0; i < plan.writes.length; i += PUT_CONCURRENCY) {
      const chunk = plan.writes.slice(i, i + PUT_CONCURRENCY);
      const results = await Promise.allSettled(chunk.map((w) => archive.put(w.key, w.body, "application/json", { rawHash: w.row.rawHash })));
      results.forEach((r, j) => {
        if (r.status === "fulfilled") ok.push(chunk[j].row);
        else { report.failed++; report.errors.push(`${chunk[j].key}: ${(r.reason as Error)?.message ?? r.reason}`); }
      });
    }
    await archive.record([...ok, ...plan.revisits]);
    report.written = ok.length;
    report.revisited = plan.revisits.length;
  } catch (e) {
    report.failed = Math.max(report.failed, 1);
    report.errors.push((e as Error).message);
  }
  if (report.errors.length) console.error(`[archivo-crudo] ${input.provider}: ${report.failed} fallas; la corrida sigue`, report.errors.slice(0, 5));
  return report;
}

/** Lo mínimo que se usa de un bucket R2. */
export interface R2PutLike {
  put(key: string, body: string | Uint8Array, opts: { httpMetadata: { contentType: string }; customMetadata?: Record<string, string> }): Promise<unknown>;
}
type Stmt = { bind(...v: unknown[]): { all(): Promise<{ results: Record<string, unknown>[] }> } };
export interface RawArchiveD1 extends D1Like { prepare(sql: string): Stmt & ReturnType<D1Like["prepare"]> }

export const PROVIDER_RECORD_COLUMNS = [
  "id", "provider", "externalId", "experienceKind", "experienceId", "rawHash", "r2Key", "bytes", "schemaOk", "fetchedAt", "lastSeenAt",
  "providerUpdatedAt", "sourceRef", "sourceDocKey", "sourcePage", "originalField", "originalCategory", "declaredTaxonomy", "runId",
] as const;

/** Implementación real: bucket R2 privado (binding RAW_ARCHIVE) + tabla ProviderRecord (migración propuesta 0022). */
// REQ-742
export function createR2RawArchive({ bucket, db }: { bucket: R2PutLike; db: RawArchiveD1 }): RawArchive {
  return {
    async knownVersions(provider, externalIds) {
      const out = new Map<string, KnownVersions>();
      for (let i = 0; i < externalIds.length; i += 90) {
        const ids = externalIds.slice(i, i + 90);
        const rows = (await db.prepare(
          `SELECT "externalId","rawHash","lastSeenAt" FROM "ProviderRecord" WHERE "provider"=? AND "externalId" IN (${ids.map(() => "?").join(",")}) ORDER BY "lastSeenAt"`,
        ).bind(provider, ...ids).all()).results;
        for (const r of rows) {
          const ext = String(r.externalId);
          const k = out.get(ext) ?? { latest: null, all: new Set<string>() };
          k.all.add(String(r.rawHash));
          k.latest = String(r.rawHash); // ordenado por lastSeenAt: la última gana
          out.set(ext, k);
        }
      }
      return out;
    },
    async put(key, body, contentType, meta) {
      await bucket.put(key, body, { httpMetadata: { contentType }, customMetadata: meta });
    },
    async record(rows) {
      const values = rows.map((r) => PROVIDER_RECORD_COLUMNS.map((c) => r[c]));
      await runBatch(db, upsertRows("ProviderRecord", [...PROVIDER_RECORD_COLUMNS], values, ["provider", "externalId", "rawHash"], ["lastSeenAt", "runId"]));
    },
  };
}

/** Fake en memoria para pruebas (y para el modo ensayo de los scripts). */
export function createMemoryRawArchive(opts: { failPut?: (key: string) => boolean; failRecord?: boolean } = {}) {
  const objects = new Map<string, { body: string | Uint8Array; contentType: string; meta?: Record<string, string> }>();
  const records = new Map<string, ProviderRecordRow>();
  const archive: RawArchive = {
    async knownVersions(provider, externalIds) {
      const out = new Map<string, KnownVersions>();
      const rows = [...records.values()].filter((r) => r.provider === provider && externalIds.includes(r.externalId)).sort((a, b) => a.lastSeenAt.localeCompare(b.lastSeenAt));
      for (const r of rows) {
        const k = out.get(r.externalId) ?? { latest: null, all: new Set<string>() };
        k.all.add(r.rawHash); k.latest = r.rawHash; out.set(r.externalId, k);
      }
      return out;
    },
    async put(key, body, contentType, meta) {
      if (opts.failPut?.(key)) throw new Error("R2 no disponible");
      objects.set(key, { body, contentType, meta });
    },
    async record(rows) {
      if (opts.failRecord) throw new Error("D1 no disponible");
      for (const r of rows) {
        const k = `${r.provider}|${r.externalId}|${r.rawHash}`;
        const prev = records.get(k);
        records.set(k, prev ? { ...prev, lastSeenAt: r.lastSeenAt, runId: r.runId } : r);
      }
    },
  };
  return { archive, objects, records };
}
