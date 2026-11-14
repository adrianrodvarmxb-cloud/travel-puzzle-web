/**
 * REQ-3474: enganche del archivo crudo al sync de Tangol. APAGADO POR OMISIÓN.
 *
 * El sync no decide nada: recibe el archivador por parámetro y, si no viene (bandera `RAW_ARCHIVE_ENABLED`
 * apagada o sin binding, `lib/flags.ts` + `deps.ts`), esta función no archiva nada y devuelve `null`.
 * Si viene, archiva la respuesta TAL CUAL antes de validarla o transformarla, y NUNCA lanza: una falla de R2 o de
 * D1 se registra, se devuelve en el reporte y la corrida sigue. Es la misma regla que FREETOUR cumple hoy en
 * `src/catalog/guarded-sync.ts` (REQ-743, REQ-744), verificada en `src/catalog/guarded-sync.test.ts`.
 *
 * La conexión final con el sync de Tangol es un PASO POSTERIOR: otro frente está escribiendo ese sync
 * (`feat/tangol-sync-escritura`). Cuando exista, su paso de lectura llama así, con el archivador que ya le pasa
 * el cron, y mete `tangolRawField(report)` en el resumen de la corrida:
 *
 *   const body = await api.callRaw("getTourList", { destinationId });            // la respuesta íntegra
 *   const raw = await archiveTangolResponse(rawArchive, {
 *     operation: "getTourList", body, params: { destinationId }, runId: run.id, now,
 *   });
 *   // …recién aquí se valida y se transforma (parseEach / toTourRows)…
 *   return { …, ...tangolRawField(raw) };
 *
 * Nota para ese frente: `src/tangol/api.ts` hoy devuelve lo ya validado por Zod, que descarta el neto y la
 * utilidad; para archivar la respuesta íntegra el sync tiene que pasar por aquí el cuerpo de la pasarela antes
 * de validarlo (de eso depende poder auditar de dónde salió un precio).
 */
import { archiveRawItems, type ArchiveReport, type RawArchive } from "./raw-archive";
import { TANGOL_PROVIDER, tangolRawBatch, type TangolOperation } from "./lib/tangol-raw";

const VACIO: ArchiveReport = { written: 0, revisited: 0, same: 0, failed: 0, errors: [] };

export interface TangolArchiveCall {
  operation: TangolOperation;
  /** La respuesta de la pasarela, íntegra y sin validar. */
  body: unknown;
  params?: Record<string, string | number | null | undefined>;
  /** Corrida del sync (queda en `ProviderRecord.runId`). */
  runId: string;
  now: Date;
}

/**
 * Archiva la copia exacta de una respuesta de Tangol. `null` = no hay archivador (bandera apagada): el sync
 * sigue exactamente igual que hoy. Nunca lanza.
 */
// REQ-3474
export async function archiveTangolResponse(archive: RawArchive | undefined, call: TangolArchiveCall): Promise<ArchiveReport | null> {
  if (!archive) return null;
  try {
    const batch = tangolRawBatch({ operation: call.operation, body: call.body, params: call.params, now: call.now });
    if (!batch.items.length) return { ...VACIO };
    return await archiveRawItems(archive, { provider: TANGOL_PROVIDER, items: batch.items, runId: call.runId, now: call.now });
  } catch (e) {
    const detalle = (e as Error)?.message ?? String(e);
    console.error(`[archivo-crudo] tangol ${String(call.operation)}: no se pudo armar la copia (${detalle}); la corrida sigue`);
    return { ...VACIO, failed: 1, errors: [detalle] };
  }
}

/** El campo `raw` del resumen de la corrida (vacío si no hubo archivado), igual que en el sync de FREETOUR. */
// REQ-3474
export function tangolRawField(report: ArchiveReport | null) {
  if (!report) return {};
  const { written, revisited, same, failed } = report;
  return { raw: { written, revisited, same, failed } };
}
