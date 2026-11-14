/**
 * REQ-3463/REQ-3464: repositorio del sync de Tangol que NO habla con la base. Recibe lo que ya se
 * exportó de D1 en solo lectura (países, ciudades y el estado de la corrida) y, en vez de escribir,
 * junta las sentencias que habría que correr.
 *
 * Así el workflow a mano queda igual que los demás workflows de datos del repo (`importar-viajes`,
 * `respaldo-crudo`): el ensayo solo cuenta, y escribir es aplicar un archivo .sql con `wrangler`, en
 * un paso aparte, con la casilla marcada y el OK del PO. Ninguna sesión ni agente escribe en D1.
 *
 * El repositorio sobre D1 para el cron diario es otro frente: este PR no toca el cron.
 */
import { cityStatements, countryStatements, tourStatements } from "@/catalog/lib/sql";
import { upsertRows, sqlValue, type Stmt } from "@/lib/d1/batch";
import { renderSqlFile } from "@/lib/d1/sql-file";
import type { ExistingCountry } from "@/catalog/lib/provider-countries";
import type { ExistingCity } from "./lib/cities";
import { TANGOL_PROVIDER_ID } from "./lib/tour-rows";
import { tangolExtraStatementsAcotadas } from "./lib/extra-sql";
import { cityTranslations, type TangolSyncRepo } from "./sync";
import type { TangolSyncState } from "./lib/sync-plan";

/** Lo que el workflow exporta de D1 en solo lectura antes de planear. */
export interface TangolExport {
  countries: readonly ExistingCountry[];
  cities: readonly ExistingCity[];
  state: TangolSyncState | null;
}

export interface SqlRepo extends TangolSyncRepo {
  /** Sentencias que se escribirían, en el orden en que deben correr. */
  statements(): Stmt[];
  /** Las mismas sentencias como archivo .sql para `wrangler d1 execute --file`. */
  sql(header?: string): string;
}

/**
 * REQ-3464: repositorio que junta sentencias en vez de escribir. `newId` entra por parámetro para
 * que el SQL de una misma entrada sea reproducible en las pruebas.
 */
// REQ-3464
export function createTangolSqlRepo(data: TangolExport, newId: () => string = () => crypto.randomUUID()): SqlRepo {
  const stmts: Stmt[] = [];

  return {
    async getState() {
      return data.state;
    },

    async saveState(s) {
      // Mismo checkpoint que Freetour: una fila de SyncMetadata por proveedor.
      stmts.push(
        ...upsertRows(
          "SyncMetadata",
          ["id", "provider", "lastSyncAt", "toursCount", "status", "nextPage", "totalPages", "runStartedAt"],
          [[
            newId(), TANGOL_PROVIDER_ID, s.lastSyncAt ?? new Date(), s.toursCount ?? 0, s.status ?? "in_progress",
            s.nextPage ?? 1, s.totalPages ?? 0, s.runStartedAt ?? null,
          ]],
          ["provider"],
          ["lastSyncAt", "status", "nextPage", "totalPages", "runStartedAt"],
        ),
      );
    },

    async existingCountries() {
      return [...data.countries];
    },

    async existingCities() {
      return [...data.cities];
    },

    // REQ-3462
    async upsertCountries(rows) {
      stmts.push(...countryStatements(rows));
    },

    // REQ-3463
    async upsertCities(rows) {
      stmts.push(
        ...cityStatements(
          rows.map((c) => ({ id: c.id, countryId: c.countryId, translations: cityTranslations(c.name), slug: c.slug, geonameid: c.geonameid })),
        ),
      );
    },

    // REQ-3461, REQ-10514
    async upsertTours(rows) {
      stmts.push(...tourStatements([...rows], new Date(), newId));
      // REQ-10514: columnas de la 0031 y guideLanguages, que el escritor común no conoce.
      // REQ-10525: ninguna sentencia pasa el límite de D1; un tour con reglas enormes no tumba la escritura.
      const extra = tangolExtraStatementsAcotadas(rows.map((r) => r.tour));
      if (extra.recortados.length) console.warn(`[tangol] availabilityRules recortadas a NULL por tamaño en ${extra.recortados.length} tour(s): ${extra.recortados.join(", ")}`);
      stmts.push(...extra.stmts);
    },

    statements() {
      return [...stmts];
    },

    sql(header = "") {
      return renderSqlFile(stmts, header);
    },
  };
}

/** Acepta un arreglo o la salida de `wrangler d1 execute --json` ([{ results: [...] }]). */
// REQ-3464
export function readExportRows<T>(raw: unknown): T[] {
  if (Array.isArray(raw) && raw.length > 0 && Array.isArray((raw[0] as { results?: unknown })?.results)) {
    return (raw as { results: T[] }[]).flatMap((r) => r.results);
  }
  return Array.isArray(raw) ? (raw as T[]) : [];
}

const texto = (v: unknown) => (v === null || v === undefined || v === "" ? null : String(v));
const numero = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));

/** REQ-3464: filas de `Country` del export (id, code, iso2). */
// REQ-3464
export function toExistingCountries(rows: readonly Record<string, unknown>[]): ExistingCountry[] {
  return rows.map((r) => ({ id: Number(r.id), code: String(r.code ?? ""), iso2: texto(r.iso2) }));
}

/**
 * REQ-3464: filas de `City` del export, con el `iso2` de su país ya unido (la consulta del workflow
 * hace el JOIN) y las traducciones como objeto, vengan como texto JSON o ya convertidas.
 */
// REQ-3464
export function toExistingCities(rows: readonly Record<string, unknown>[]): ExistingCity[] {
  return rows.map((r) => ({
    id: Number(r.id),
    countryId: Number(r.countryId),
    iso2: texto(r.iso2),
    slug: texto(r.slug),
    stateCode: texto(r.stateCode),
    geonameid: numero(r.geonameid),
    translations: typeof r.translations === "string" ? safeJson(r.translations) : (r.translations ?? null),
  }));
}

/** REQ-3464: la fila de `SyncMetadata` del proveedor, o null si todavía no hay corrida. */
// REQ-3464
export function toSyncState(rows: readonly Record<string, unknown>[]): TangolSyncState | null {
  const row = rows[0];
  if (!row) return null;
  const started = texto(row.runStartedAt);
  return {
    status: String(row.status ?? ""),
    nextPage: Number(row.nextPage ?? 1),
    totalPages: Number(row.totalPages ?? 0),
    runStartedAt: started ? new Date(started) : null,
  };
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Para que `sqlValue` quede a mano de quien arme sentencias sueltas sobre este repo. */
export { sqlValue };
