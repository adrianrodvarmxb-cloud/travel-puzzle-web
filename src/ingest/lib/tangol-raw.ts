/**
 * REQ-3472, REQ-3473: copia exacta de lo que devuelve Tangol y las filas de su índice `ProviderRecord`
 * (ola 2 de `docs/plan-tangol.md`). PURO: sin red, sin R2, sin D1 y sin reloj (la fecha llega por parámetro).
 *
 * Extiende el archivador que ya existe para FREETOUR (REQ-740…748); no lo reinventa: la llave sale de `rawKey`
 * y la huella de `rawHash`, así las dos copias se leen igual. El plan de qué se escribe sigue siendo
 * `planArchive` (`lib/archive-plan.ts`): versión nueva solo cuando cambia la huella.
 *
 * ── DECISIÓN MARCADA PARA EL PO (candado, pendiente de su firma) ──────────────────────────────────────────────
 * Qué se guarda: la respuesta ÍNTEGRA, tal cual llegó de la pasarela, INCLUIDOS el neto y la utilidad
 * (`Utilidad`, `NetRate*`) que el esquema Zod del sitio descarta a propósito (REQ-1543). Sin el neto la copia no
 * sirve para lo que el PO pidió: auditar de dónde salió un precio. Dónde vive: SOLO en el bucket R2 PRIVADO
 * `travel-puzzle-raw` (binding `RAW_ARCHIVE`, sin dominio propio, sin `r2.dev`, sin acceso público) bajo
 * `raw/tangol/…`; ninguna página, API pública ni worker lo lee (REQ-747) y el puerto del bucket solo tiene `put`.
 * Quién la ve: quien entra a la cuenta de Cloudflare (el PO) y el código de `src/ingest` más el cron del sync.
 * En `ProviderRecord` NO va ningún campo de dinero: solo huella, llave, bytes y metadatos.
 * Si el PO decide que el neto no se guarde, el recorte se agrega aquí (vista previa al hashear) y las huellas
 * se recalculan: es un cambio de una función pura con sus pruebas.
 */
import { planArchive, type KnownVersions, type ProviderRecordRow, type RawItem } from "./archive-plan";
import { rawHash } from "./raw-hash";
import { rawKey } from "./raw-keys";
import { countrySchema, destinationSchema, infoTourSchema, parseTourRates } from "@/tangol/lib/schemas";

export const TANGOL_PROVIDER = "tangol";

/** Las 4 lecturas de la ola 1 (`src/tangol/api.ts`). Una operación nueva entra aquí o no se archiva. */
export type TangolOperation = "getCountries" | "getDestinations" | "getTourList" | "getTourRates";

type Record_ = Record<string, unknown>;

/**
 * Forma de cada respuesta: de dónde sale la lista de registros, cómo se identifica cada uno y si el registro
 * habla de una experiencia (un tour).
 *
 * El `externalId` del tour de `getTourList` es el `TourId` pelado, igual que FREETOUR usa su `id`: así
 * «¿de dónde salió este tour?» se responde con una igualdad contra `Tour.externalId` (REQ-1623, llave por
 * proveedor). Lo demás va con prefijo para que nunca choque con un id de tour ni se mezclen dos registros
 * distintos en la misma carpeta de R2.
 */
const SHAPES: Record<TangolOperation, {
  list: string | null;
  externalId: (r: Record_) => string | null;
  experience: boolean;
  original?: (r: Record_) => { field: string; value: string } | null;
}> = {
  getCountries: {
    list: "ListCountries",
    externalId: (r) => (text(r.IsoCode) ? `pais-${text(r.IsoCode)}` : null),
    experience: false,
  },
  getDestinations: {
    list: "ListDestinations",
    externalId: (r) => (id(r.Id) ? `destino-${id(r.Id)}` : null),
    experience: false,
  },
  getTourList: {
    list: "ListTours",
    externalId: (r) => id(r.TourId),
    experience: true,
    // REQ-753: denominación original del proveedor, para la reclasificación con linaje.
    original: (r) => (text(r.TypeCode) ? { field: "TypeCode", value: text(r.TypeCode)! } : null),
  },
  getTourRates: {
    // La respuesta de tarifas ES un registro (no una lista): se guarda completa, con sus opciones y fechas.
    list: null,
    externalId: (r) => (id(r.TourId) ? `tarifas-${id(r.TourId)}` : null),
    experience: true,
  },
};

const text = (v: unknown): string | null => (typeof v === "string" && v !== "" ? v : null);
const id = (v: unknown): string | null =>
  typeof v === "number" && Number.isFinite(v) ? String(v) : typeof v === "string" && v !== "" ? v : null;

/** `externalId` del índice para una operación y un id del proveedor. */
// REQ-3473
export function tangolExternalId(operation: TangolOperation, providerId: string | number): string {
  const fake = {
    getCountries: { IsoCode: providerId },
    getDestinations: { Id: providerId },
    getTourList: { TourId: providerId },
    getTourRates: { TourId: providerId },
  }[operation];
  const ext = SHAPES[operation].externalId(fake as Record_);
  if (!ext) throw new Error(`id inválido para ${operation}: ${String(providerId)}`);
  return ext;
}

/** Los `externalId` del índice que hablan de un tour de Tangol: su ficha y sus tarifas. */
// REQ-3473
export function tangolTourExternalIds(tourId: string | number): string[] {
  return [tangolExternalId("getTourList", tourId), tangolExternalId("getTourRates", tourId)];
}

/** `true` si el registro pasa el esquema del sitio. No filtra nada: la copia se guarda igual, marcada. */
// REQ-3472
export function tangolSchemaOk(operation: TangolOperation, record: unknown): boolean {
  try {
    switch (operation) {
      case "getCountries": return countrySchema.safeParse(record).success;
      case "getDestinations": return destinationSchema.safeParse(record).success;
      case "getTourList": return infoTourSchema.safeParse(record).success;
      case "getTourRates": parseTourRates(record); return true;
    }
  } catch {
    return false;
  }
}

/** Referencia legible de la llamada, determinista (parámetros ordenados): `tangol:getTourList?destinationId=12`. */
// REQ-3472
export function tangolSourceRef(operation: TangolOperation, params?: Record<string, string | number | null | undefined>): string {
  const pairs = Object.entries(params ?? {})
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `${k}=${String(v)}`)
    .sort();
  return `tangol:${operation}${pairs.length ? `?${pairs.join("&")}` : ""}`;
}

export interface TangolRawBatch {
  provider: typeof TANGOL_PROVIDER;
  operation: TangolOperation;
  /** Referencia de la llamada (queda en `ProviderRecord.sourceRef`). */
  sourceRef: string;
  /** Fecha de la lectura, en ISO. */
  fetchedAt: string;
  /** Cuántos registros trajo la respuesta (todos se archivan; la copia no se filtra). */
  records: number;
  items: RawItem[];
}

/**
 * Los registros crudos de una respuesta de Tangol, tal cual llegaron, ANTES de validarlos o transformarlos, con
 * los metadatos del lote (proveedor, operación, fecha, cuántos registros). Una respuesta ilegible da 0 registros.
 */
// REQ-3472
export function tangolRawBatch(input: {
  operation: TangolOperation;
  /** La respuesta de la pasarela, íntegra. */
  body: unknown;
  params?: Record<string, string | number | null | undefined>;
  now: Date;
}): TangolRawBatch {
  const shape = SHAPES[input.operation];
  if (!shape) throw new Error(`operación ${String(input.operation)} sin forma declarada (src/ingest/lib/tangol-raw.ts)`);
  const sourceRef = tangolSourceRef(input.operation, input.params);
  const fetchedAt = input.now.toISOString();
  const records = recordsOf(shape.list, input.body);
  const items: RawItem[] = records.map((raw) => {
    const r = (raw ?? {}) as Record_;
    return {
      externalId: shape.externalId(r),
      body: raw, // íntegro, con neto y utilidad (decisión del encabezado)
      // Tangol no manda marca de tiempo del registro: no hay `providerUpdatedAt` que guardar aparte.
      providerUpdatedAt: null,
      // El id de Travel Puzzle se crea al publicar; el enlace es Tour(providerId='tangol', externalId=TourId).
      experience: shape.experience ? { kind: "tour" as const, id: null } : null,
      sourceRef,
      schemaOk: tangolSchemaOk(input.operation, raw),
      original: shape.original?.(r) ?? null,
    };
  });
  return { provider: TANGOL_PROVIDER, operation: input.operation, sourceRef, fetchedAt, records: items.length, items };
}

function recordsOf(list: string | null, body: unknown): unknown[] {
  if (body === null || typeof body !== "object") return [];
  if (list === null) return [body];
  const value = (body as Record_)[list];
  return Array.isArray(value) ? value : [];
}

export interface TangolRawEntry {
  externalId: string;
  /** Llave del objeto en el bucket privado: `raw/tangol/<externalId>/<huella>.json`. */
  key: string;
  /** Huella del contenido: sha-256 hex del JSON canónico (mismo criterio que FREETOUR). */
  rawHash: string;
  bytes: number;
  /** El JSON exacto que se sube a R2. */
  body: string;
}

/**
 * La entrada de la copia de cada registro del lote: llave, huella del contenido y tamaño. No toca red ni R2:
 * es la vista «qué se escribiría», que usan el reporte de ensayo y las pruebas. Quién decide si de verdad se
 * escribe (y quién lo escribe) es `planArchive` + `archiveRawItems`.
 */
// REQ-3472
export async function tangolRawEntries(batch: TangolRawBatch): Promise<TangolRawEntry[]> {
  return Promise.all(
    batch.items.map(async (item) => {
      const hash = await rawHash(TANGOL_PROVIDER, item.body);
      const body = JSON.stringify(item.body);
      return {
        externalId: item.externalId ?? "_sin-id",
        key: rawKey(TANGOL_PROVIDER, item.externalId, hash),
        rawHash: hash,
        bytes: new TextEncoder().encode(body).length,
        body,
      };
    }),
  );
}

/**
 * Las filas del índice `ProviderRecord` de un lote de Tangol, con `provider='tangol'`. NO escribe en la base:
 * quien las escribe es `RawArchive.record` (hoy `createR2RawArchive`, un upsert por `(provider, externalId,
 * rawHash)` en D1) cuando `archiveRawItems` ya subió el objeto a R2; en los guiones de ensayo las imprime
 * `recordSql` (`lib/import-archive.ts`). Con `known` (las huellas ya archivadas de esos `externalId`) una
 * respuesta igual a la vigente no produce fila ni objeto nuevo.
 */
// REQ-3473
export async function tangolRecordRows(
  batch: TangolRawBatch,
  ctx: { runId: string; known?: Map<string, KnownVersions> },
): Promise<ProviderRecordRow[]> {
  const plan = await planArchive(TANGOL_PROVIDER, batch.items, ctx.known ?? new Map(), { runId: ctx.runId, now: batch.fetchedAt });
  return [...plan.writes.map((w) => w.row), ...plan.revisits];
}

/**
 * «¿De dónde salió este tour?»: las filas del índice que respaldan un tour de Tangol (su ficha y sus tarifas).
 * En D1 es la misma consulta:
 *   SELECT "r2Key","rawHash","fetchedAt","sourceRef" FROM "ProviderRecord"
 *    WHERE "provider"='tangol' AND "externalId" IN (?, ?) ORDER BY "lastSeenAt" DESC;
 * con los dos ids de `tangolTourExternalIds(tour.externalId)`.
 */
// REQ-3473
export function tangolRecordsOfTour(rows: readonly ProviderRecordRow[], tourId: string | number): ProviderRecordRow[] {
  const ids = tangolTourExternalIds(tourId);
  return rows.filter((r) => r.provider === TANGOL_PROVIDER && ids.includes(r.externalId));
}
