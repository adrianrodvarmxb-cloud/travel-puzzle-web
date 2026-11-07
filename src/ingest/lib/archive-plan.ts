/**
 * REQ-742: qué se escribe del archivo crudo en una corrida. Puro (sin red, base ni reloj: todo llega por parámetro).
 * - huella nueva para ese externalId → objeto R2 nuevo + fila ProviderRecord nueva;
 * - misma huella que la versión vigente → nada;
 * - vuelve a una versión ya vista (A → B → A) → no se reescribe el objeto (es inmutable), solo se actualiza lastSeenAt.
 */
import { rawHash } from "./raw-hash";
import { rawKey } from "./raw-keys";

export interface RawItem {
  externalId: string | null;
  /** El item tal cual llegó (se guarda íntegro). */
  body: unknown;
  providerUpdatedAt?: string | null;
  experience?: { kind: "tour" | "trip"; id: string | null } | null;
  sourceRef?: string | null;
  sourceDocKey?: string | null;
  sourcePage?: number | null;
  schemaOk?: boolean;
}

export interface ProviderRecordRow {
  id: string; provider: string; externalId: string; experienceKind: "tour" | "trip" | null; experienceId: string | null;
  rawHash: string; r2Key: string; bytes: number; schemaOk: 0 | 1; fetchedAt: string; lastSeenAt: string;
  providerUpdatedAt: string | null; sourceRef: string | null; sourceDocKey: string | null; sourcePage: number | null;
  originalField: string | null; originalCategory: string | null; declaredTaxonomy: string | null; runId: string;
}

export interface KnownVersions { latest: string | null; all: Set<string> }

export interface ArchivePlan {
  writes: { key: string; body: string; row: ProviderRecordRow }[];
  /** Versiones ya archivadas que vuelven a ser la vigente (solo lastSeenAt). */
  revisits: ProviderRecordRow[];
  same: number;
}

export const EXTERNAL_ID_SIN_ID = "_sin-id";

// REQ-742
export async function planArchive(
  provider: string, items: RawItem[], known: Map<string, KnownVersions>, ctx: { runId: string; now: string },
): Promise<ArchivePlan> {
  const plan: ArchivePlan = { writes: [], revisits: [], same: 0 };
  const seen = new Set<string>();
  for (const it of items) {
    const hash = await rawHash(provider, it.body);
    const ext = it.externalId ?? EXTERNAL_ID_SIN_ID;
    const dedup = `${ext}\u0000${hash}`;
    if (seen.has(dedup)) { plan.same++; continue; } // el mismo item repetido en la misma corrida
    seen.add(dedup);
    const k = known.get(ext);
    if (k?.latest === hash) { plan.same++; continue; }
    const key = rawKey(provider, it.externalId, hash);
    const body = JSON.stringify(it.body);
    const row: ProviderRecordRow = {
      id: key, provider, externalId: ext, experienceKind: it.experience?.kind ?? null, experienceId: it.experience?.id ?? null,
      rawHash: hash, r2Key: key, bytes: new TextEncoder().encode(body).length, schemaOk: it.schemaOk === false ? 0 : 1,
      fetchedAt: ctx.now, lastSeenAt: ctx.now, providerUpdatedAt: it.providerUpdatedAt ?? null, sourceRef: it.sourceRef ?? null,
      sourceDocKey: it.sourceDocKey ?? null, sourcePage: it.sourcePage ?? null, originalField: null, originalCategory: null, declaredTaxonomy: null, runId: ctx.runId,
    };
    if (k?.all.has(hash)) plan.revisits.push(row);
    else plan.writes.push({ key, body, row });
  }
  return plan;
}
