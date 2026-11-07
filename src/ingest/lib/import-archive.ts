/**
 * REQ-545: copia exacta de los imports por archivo (imports/*.json) y de su documento original. Puro.
 * Guarda el item COMPLETO tal cual está en el archivo (ref, status, hold, source, taxonomia, photos, trip, …), no solo lo
 * que el gestor acepta. Lo corre src/scripts/import-trips.ts: escribe los objetos y el SQL del índice en una carpeta
 * local que NO se sube como artefacto; el workflow solo los sube a R2 privado con escribir=true y la bandera encendida.
 */
import { planArchive, type ArchivePlan, type ProviderRecordRow } from "./archive-plan";
import { sha256Hex } from "./raw-hash";
import { sourceKey } from "./raw-keys";
import { idFor } from "@/trips/lib/bulk-import";
import { declaredOf, originalOf } from "./originals";

/** Agency.id del archivo de carga → proveedor (mapeo de taxonomía y prefijo de R2). */
export const AGENCY_PROVIDER: Record<string, string> = {
  "ag-ext": "extime",
  "ag-exe": "exoticescapes",
  "ag-bbt": "bigbus",
  "ag-iwp": "incaworld",
  "ag-dco": "destinocolombia",
  "ag-fch": "fantasticachina",
  "ag-tas": "turismoasiatico",
};

export function providerOfAgency(agencyId: string): string | null {
  return AGENCY_PROVIDER[agencyId] ?? null;
}

export interface ImportBundleLike {
  agency: { id: string; initials: string };
  trips: { ref: string; source?: unknown; taxonomia?: unknown; original?: { pagina?: unknown; categoria?: unknown } }[];
}

export interface SourceDocument { key: string; provider: string; fileName: string; sha256: string; bytes: number; contentType: string; receivedAt: string; data: Uint8Array }

const TYPES: Record<string, string> = { ".pdf": "application/pdf", ".html": "text/html", ".htm": "text/html", ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".json": "application/json", ".txt": "text/plain" };

// REQ-545
export async function documentFor(provider: string, fileName: string, data: Uint8Array, now: Date): Promise<SourceDocument> {
  const sha256 = await sha256Hex(data);
  const key = sourceKey(provider, fileName, sha256);
  const ext = (/\.[a-z0-9]+$/.exec(key)?.[0] ?? "").toLowerCase();
  return { key, provider, fileName, sha256, bytes: data.length, contentType: TYPES[ext] ?? "application/octet-stream", receivedAt: now.toISOString(), data };
}

// REQ-545
export async function planImportArchive(
  bundle: ImportBundleLike, ctx: { runId: string; now: Date; doc?: SourceDocument | null },
): Promise<ArchivePlan & { provider: string }> {
  const provider = providerOfAgency(bundle.agency.id);
  if (!provider) throw new Error(`agencia ${bundle.agency.id} sin proveedor declarado (src/ingest/lib/import-archive.ts)`);
  const items = bundle.trips.map((e) => ({
    externalId: e.ref,
    body: e,
    experience: { kind: "trip" as const, id: idFor(bundle.agency.initials, e.ref) },
    sourceRef: typeof e.source === "string" ? e.source : null,
    sourceDocKey: ctx.doc?.key ?? null,
    sourcePage: typeof e.original?.pagina === "number" ? e.original.pagina : null,
    original: originalOf(provider, e), // REQ-553
    declared: declaredOf(e), // REQ-554
  }));
  // Sin leer D1: el SQL es idempotente (ON CONFLICT) y una versión que vuelve solo actualiza lastSeenAt.
  const plan = await planArchive(provider, items, new Map(), { runId: ctx.runId, now: ctx.now.toISOString() });
  return { ...plan, provider };
}

const q = (v: unknown): string => (v === null || v === undefined ? "NULL" : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const COLS = ["id", "provider", "externalId", "experienceKind", "experienceId", "rawHash", "r2Key", "bytes", "schemaOk", "fetchedAt", "lastSeenAt", "providerUpdatedAt", "sourceRef", "sourceDocKey", "sourcePage", "originalField", "originalCategory", "declaredTaxonomy", "runId"] as const;

/** SQL del índice (tabla ProviderRecord de la migración propuesta 0022). Idempotente. */
// REQ-545
export function recordSql(rows: ProviderRecordRow[], doc?: SourceDocument | null): string[] {
  const out: string[] = [];
  if (doc) {
    out.push(`INSERT INTO "ProviderDocument" ("key","provider","fileName","sha256","bytes","contentType","receivedAt") VALUES (${[doc.key, doc.provider, doc.fileName, doc.sha256, doc.bytes, doc.contentType, doc.receivedAt].map(q).join(",")}) ON CONFLICT("key") DO NOTHING;`);
  }
  for (const r of rows) {
    out.push(`INSERT INTO "ProviderRecord" (${COLS.map((c) => `"${c}"`).join(",")}) VALUES (${COLS.map((c) => q(r[c])).join(",")}) ON CONFLICT("provider","externalId","rawHash") DO UPDATE SET "lastSeenAt"=excluded."lastSeenAt","runId"=excluded."runId";`);
  }
  return out;
}
