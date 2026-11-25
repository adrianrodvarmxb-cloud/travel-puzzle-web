/**
 * Cierre de la corrida diaria de Tangol (plan de actualización diaria, etapa D1). Puro: recibe las filas exportadas
 * de D1 y la fecha de inicio de la corrida; devuelve qué cambia y qué se avisa. No lee ni escribe nada.
 *
 * - REQ-10876 (tope del 80 %): `ayer` = tours de Tangol activos; `hoy` = los vistos en esta corrida (`lastSeenAt` ≥
 *   inicio). Con menos del 80 %, no se retira nada y se avisa al PO (un fallo de Tangol no vacía el catálogo).
 * - REQ-10877 (G-D2, firma «Tras dos corridas», REQ-10674): un tour que Tangol dejó de mandar pasa a `missing` en la
 *   primera corrida sin verlo y se oculta (`isActive = false`, `syncStatus = removed`) en la segunda. Reversible y sin
 *   borrar: si reaparece, el upsert del sync lo vuelve a `active`. Misma máquina de presencia que FREETOUR
 *   (`src/catalog/lib/presence.ts`, REQ-074) con umbral 2 en vez de 3.
 */
import { presenceTransitions, type PresenceInput, type PresenceUpdate } from "@/catalog/lib/presence";
import { decidirTopeDiario, type DecisionTope } from "./daily-guard";

/** G-D2: corridas seguidas sin el tour para ocultarlo. */
export const TANGOL_OCULTAR_TRAS_CORRIDAS = 2;

/** Fila de `Tour` de Tangol tal como la exporta el workflow en solo lectura. */
export interface TourPresenciaRow {
  externalId: number | string;
  syncStatus?: string | null;
  missingRuns?: number | string | null;
  isActive?: number | boolean | string | null;
  lastSeenAt?: string | number | null;
}

export interface AvisoTope { asunto: string; texto: string; whatsapp: string }

export interface CierreTangol {
  decision: DecisionTope;
  conteo: { ayer: number; hoy: number };
  updates: PresenceUpdate[];
  counts: { missing: number; removed: number; reactivated: number };
  aviso: AvisoTope | null;
  resumen: string;
}

function fecha(v: string | number | null | undefined): Date | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return new Date(v);
  if (/^\d{11,}$/.test(v)) return new Date(Number(v));
  const d = new Date(v.includes("T") || v.endsWith("Z") ? v : v.replace(" ", "T") + "Z");
  return Number.isNaN(d.getTime()) ? null : d;
}

const activo = (v: TourPresenciaRow["isActive"]): boolean => v === true || v === 1 || v === "1" || v === "true";

/** Filas de presencia: visto = `lastSeenAt` en o después del inicio de la corrida. */
// REQ-10877
export function toPresenciaTangol(rows: readonly TourPresenciaRow[], runStartedAt: Date): PresenceInput[] {
  return rows.map((r) => {
    const seenAt = fecha(r.lastSeenAt);
    return {
      externalId: Number(r.externalId),
      syncStatus: String(r.syncStatus ?? "active"),
      missingRuns: Number(r.missingRuns ?? 0) || 0,
      isActive: activo(r.isActive),
      seen: seenAt !== null && seenAt.getTime() >= runStartedAt.getTime(),
    };
  });
}

// REQ-10876, REQ-10877
export function planCierreTangol(i: { tours: readonly TourPresenciaRow[]; runStartedAt: Date | null; hoy?: string }): CierreTangol {
  const dia = i.hoy ?? (i.runStartedAt ?? new Date(0)).toISOString().slice(0, 10);
  const sinCambios = { updates: [] as PresenceUpdate[], counts: { missing: 0, removed: 0, reactivated: 0 } };
  if (!i.runStartedAt) {
    const decision = decidirTopeDiario({ ayer: i.tours.filter((t) => activo(t.isActive)).length, hoy: Number.NaN });
    const texto = `Sync diario de Tangol (${dia}): la corrida no tiene fecha de inicio, así que no se puede saber qué tours se vieron. No se retira nada. Revisa el workflow «Tangol sync de tours».`;
    return { decision, conteo: { ayer: 0, hoy: 0 }, ...sinCambios, aviso: { asunto: `Tangol: corrida sin fecha de inicio (${dia})`, texto, whatsapp: texto }, resumen: decision.mensaje };
  }
  const presencia = toPresenciaTangol(i.tours, i.runStartedAt);
  const ayer = presencia.filter((p) => p.isActive).length;
  const hoy = presencia.filter((p) => p.seen).length;
  const decision = decidirTopeDiario({ ayer, hoy });
  if (!decision.permitirRetiros) {
    const texto = `Sync diario de Tangol (${dia}): Tangol trajo ${hoy} de ${ayer} tours activos (menos del 80 %). No se retira nada ni se oculta ningún tour; el catálogo queda como estaba. Si Tangol tuvo una falla, la siguiente corrida lo corrige sola; si no, revisa el workflow «Tangol sync de tours».`;
    return {
      decision, conteo: { ayer, hoy }, ...sinCambios,
      aviso: decision.avisar ? { asunto: `Tangol: corrida bajo el tope (${hoy} de ${ayer} tours, ${dia})`, texto, whatsapp: texto } : null,
      resumen: decision.mensaje,
    };
  }
  const { updates, counts } = presenceTransitions(presencia, { removeAfter: TANGOL_OCULTAR_TRAS_CORRIDAS });
  const resumen = `${decision.mensaje} Presencia: ${counts.missing} faltante(s) por primera vez, ${counts.removed} oculto(s) tras ${TANGOL_OCULTAR_TRAS_CORRIDAS} corridas, ${counts.reactivated} de vuelta.`;
  return { decision, conteo: { ayer, hoy }, updates, counts, aviso: null, resumen };
}
