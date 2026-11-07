/**
 * Ola R3 · contrato obligatorio de ingesta (REQ-760, REQ-761, REQ-762). Puro.
 * Ningún proveedor escribe en Travel Puzzle sin: esquema Zod del crudo (tolerante a campos nuevos), `normalize()` puro,
 * mapeo de taxonomía, campos volátiles declarados, clave del archivo crudo y linaje (denominación original o el hueco
 * registrado en la línea base). `ProviderAdapter` (src/cart) es del carrito; esto es solo la ingesta.
 */
import { z } from "zod";
import type { Mapping } from "@/taxonomy/schemas/dictionary";
import { AGENCY_MAPPINGS, DEFAULT_MAPPINGS } from "@/taxonomy/data";
import { toTourRows } from "@/catalog/lib/tour-rows";
import { tripInputSchema } from "@/trips/schemas/trip";
import type { TourAPI } from "@/types";
import { VOLATILE_FIELDS } from "./raw-hash";
import { rawKey } from "./raw-keys";
import { originalOf, type Original } from "./originals";
import { AGENCY_PROVIDER } from "./import-archive";

export interface IngestAdapter<Raw = unknown, Out = unknown> {
  provider: string;
  kind: "api" | "archivo";
  /** Esquema del crudo: valida lo mínimo para identificar el registro y tolera campos nuevos (passthrough). */
  rawSchema: z.ZodType<Raw>;
  externalId(raw: Raw): string | null;
  /** Transformación pura del crudo a la forma de Travel Puzzle. Lanza si el registro no sirve. */
  normalize(raw: Raw): Out;
  /** Denominación original del proveedor (linaje de la taxonomía). */
  original(raw: Raw): Original | null;
  mapping: Mapping | undefined;
  volatileFields: readonly string[] | undefined;
}

// REQ-760: esquemas del crudo
export const freetourRawSchema = z.object({
  id: z.number(),
  categoryId: z.number(),
  title: z.record(z.string(), z.string()),
  URLs: z.record(z.string(), z.string()),
  price: z.object({ value: z.number(), currency: z.string() }).passthrough(),
  updatedAt: z.string().optional(),
}).passthrough();

export const importEntrySchema = z.object({
  ref: z.string().min(1),
  status: z.enum(["draft", "published"]),
  photos: z.array(z.unknown()),
  trip: z.record(z.string(), z.unknown()),
  source: z.string().optional(),
  hold: z.string().optional(),
  taxonomia: z.object({ formato: z.string().optional(), temas: z.array(z.string()).optional() }).passthrough().optional(),
  /** Denominación y ubicación en el documento original (gate 4). */
  original: z.object({ categoria: z.string().min(1).optional(), pagina: z.number().int().positive().optional() }).passthrough().optional(),
}).passthrough();
export type ImportEntry = z.infer<typeof importEntrySchema>;

// REQ-761: adaptadores
export const freetourAdapter: IngestAdapter<z.infer<typeof freetourRawSchema>, ReturnType<typeof toTourRows>> = {
  provider: "freetour",
  kind: "api",
  rawSchema: freetourRawSchema,
  externalId: (r) => String(r.id),
  normalize: (r) => toTourRows(r as unknown as TourAPI, new Date(0)),
  original: (r) => ({ field: "categoryId", value: String(r.categoryId), matchedTerm: null }),
  mapping: DEFAULT_MAPPINGS.freetour,
  volatileFields: VOLATILE_FIELDS.freetour,
};

export function importAdapter(provider: string): IngestAdapter<ImportEntry, z.infer<typeof tripInputSchema>> {
  return {
    provider,
    kind: "archivo",
    rawSchema: importEntrySchema,
    externalId: (e) => e.ref,
    normalize: (e) => tripInputSchema.parse({ ...e.trip, images: [] }),
    original: (e) => originalOf(provider, e),
    mapping: AGENCY_MAPPINGS[provider],
    volatileFields: VOLATILE_FIELDS[provider],
  };
}

/** Todos los adaptadores registrados. Un proveedor nuevo entra aquí o no entra. */
export const INGEST_ADAPTERS: IngestAdapter[] = [freetourAdapter as IngestAdapter, ...Object.values(AGENCY_PROVIDER).map((p) => importAdapter(p) as IngestAdapter)];

export function adapterFor(provider: string): IngestAdapter | undefined {
  return INGEST_ADAPTERS.find((a) => a.provider === provider);
}

export interface ContractIssue { provider: string; externalId: string | null; kind: "adaptador" | "esquema" | "normalize" | "mapeo" | "volatiles" | "archivo" | "linaje"; detail: string }

const H = "0".repeat(64);

/** REQ-762: revisa el adaptador y cada muestra. `linaje` es el único hueco tolerable (y solo si está en la línea base). */
// REQ-762
export function checkContract(adapter: IngestAdapter | undefined, provider: string, samples: unknown[]): ContractIssue[] {
  if (!adapter) return [{ provider, externalId: null, kind: "adaptador", detail: "proveedor sin adaptador de ingesta (src/ingest/lib/contract.ts)" }];
  const out: ContractIssue[] = [];
  const add = (externalId: string | null, kind: ContractIssue["kind"], detail: string) => out.push({ provider, externalId, kind, detail });
  if (!adapter.mapping) add(null, "mapeo", "sin mapeo de taxonomía en src/taxonomy/data/mapping/");
  if (!adapter.volatileFields) add(null, "volatiles", "sin campos volátiles declarados (src/ingest/lib/raw-hash.ts)");
  for (const s of samples) {
    const parsed = adapter.rawSchema.safeParse(s);
    const guessId = (s as { id?: unknown; ref?: unknown })?.ref ?? (s as { id?: unknown })?.id;
    const id0 = guessId === undefined || guessId === null ? null : String(guessId);
    if (!parsed.success) { add(id0, "esquema", parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")} ${i.message}`).join("; ")); continue; }
    const raw = parsed.data;
    const id = adapter.externalId(raw);
    try { rawKey(provider, id, H); } catch (e) { add(id, "archivo", (e as Error).message); }
    try { adapter.normalize(raw); } catch (e) { add(id, "normalize", (e as Error).message.slice(0, 300)); }
    const o = adapter.original(raw);
    if (!o) add(id, "linaje", "sin denominación original del proveedor (capturar original.categoria desde el documento)");
    else if (adapter.mapping && !adapter.mapping.categorias.some((c) => c.id === o.value)) add(id, "linaje", `denominación «${o.value}» sin categoría en el mapeo`);
  }
  return out;
}

export type GapBaseline = Record<string, string[]>;

/** Huecos que bloquean: todo lo que no sea linaje, y el linaje que no está en la línea base. */
// REQ-762
export function blockingIssues(issues: ContractIssue[], baseline: GapBaseline): ContractIssue[] {
  return issues.filter((i) => i.kind !== "linaje" || !(baseline[i.provider] ?? []).includes(i.externalId ?? ""));
}
