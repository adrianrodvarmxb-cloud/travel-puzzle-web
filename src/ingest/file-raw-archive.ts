/**
 * REQ-3518: copia exacta para el sync que corre en GitHub (Tangol), donde no hay binding de R2 ni de D1.
 *
 * Implementa el mismo puerto `RawArchive` que el Worker (REQ-742), así `archiveTangolResponse` y
 * `archiveRawItems` no cambian:
 * - `knownVersions` sale del export de SOLO LECTURA de `ProviderRecord` (lo que ya está archivado);
 * - `put` entrega cada objeto a `writeObject` (el script lo escribe en una carpeta FUERA del artefacto
 *   público; el workflow lo sube después al bucket R2 PRIVADO `travel-puzzle-raw`);
 * - `record` junta las filas del índice y `sql()` las devuelve como archivo para `wrangler d1 execute`,
 *   que el workflow aplica SOLO después de subir los objetos.
 * Sin red ni disco propios: la escritura se inyecta.
 */
import type { RawArchive } from "./raw-archive";
import { PROVIDER_RECORD_COLUMNS } from "./raw-archive";
import type { KnownVersions, ProviderRecordRow } from "./lib/archive-plan";
import { upsertRows } from "@/lib/d1/batch";
import { renderSqlFile } from "@/lib/d1/sql-file";

type ExportRow = { provider?: unknown; externalId?: unknown; rawHash?: unknown; lastSeenAt?: unknown };

/** Acepta las filas tal cual o la salida de `wrangler d1 execute --json` ([{ results: [...] }]). */
function rowsOf(raw: unknown): ExportRow[] {
  if (Array.isArray(raw) && raw.length > 0 && Array.isArray((raw[0] as { results?: unknown })?.results)) {
    return (raw as { results: ExportRow[] }[]).flatMap((r) => r.results);
  }
  return Array.isArray(raw) ? (raw as ExportRow[]) : [];
}

// REQ-3518
export function createFileRawArchive({
  exportRows,
  writeObject,
}: {
  exportRows: unknown;
  writeObject: (key: string, body: string | Uint8Array) => void | Promise<void>;
}) {
  const known = new Map<string, KnownVersions>();
  const sorted = rowsOf(exportRows)
    .filter((r) => r.externalId != null && r.rawHash != null)
    .sort((a, b) => String(a.lastSeenAt ?? "").localeCompare(String(b.lastSeenAt ?? "")));
  for (const r of sorted) {
    const ext = String(r.externalId);
    const k = known.get(ext) ?? { latest: null, all: new Set<string>() };
    k.all.add(String(r.rawHash));
    k.latest = String(r.rawHash);
    known.set(ext, k);
  }

  const keys: string[] = [];
  const rows: ProviderRecordRow[] = [];

  const archive: RawArchive = {
    async knownVersions(_provider, externalIds) {
      const out = new Map<string, KnownVersions>();
      for (const id of externalIds) {
        const k = known.get(id);
        if (k) out.set(id, k);
      }
      return out;
    },
    async put(key, body) {
      await writeObject(key, body);
      keys.push(key);
    },
    async record(newRows) {
      rows.push(...newRows);
    },
  };

  return {
    archive,
    /** Llaves escritas en esta corrida (lo que el workflow sube a R2). */
    keys: () => [...keys],
    rows: () => [...rows],
    /** El índice como archivo SQL; vacío si no hubo nada nuevo. */
    sql(header = "") {
      if (!rows.length) return "";
      const values = rows.map((r) => PROVIDER_RECORD_COLUMNS.map((c) => r[c]));
      return renderSqlFile(
        upsertRows("ProviderRecord", [...PROVIDER_RECORD_COLUMNS], values, ["provider", "externalId", "rawHash"], ["lastSeenAt", "runId"]),
        header,
      );
    },
  };
}
