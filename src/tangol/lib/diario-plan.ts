/**
 * REQ-10878 · Ciclo diario de Tangol (plan de actualización diaria, etapa D2; G-D1 «1:00 a. m.», REQ-10673). El
 * workflow diario repite los pasos por lotes (export → plan → escribir) hasta que el sync cierre la corrida (`finish`)
 * o no tenga nada que hacer (`idle`). Puro: decide si se sigue con otro lote; no corre nada.
 * Candados: nunca se sigue tras un paso abortado o sin reporte; no se arranca otro lote dentro de la ventana del sync
 * de FREETOUR (8:45–12:15 UTC: arranca a las 3:00 CDMX = 9:00 UTC y a las 12:10 UTC ya se da por cerrado, REQ-586);
 * tope de pasos como red de seguridad.
 * REQ-10957 (28-11-2026): la pausa por FREETOUR era un tope abierto («desde las 8:45 UTC») y GitHub dispara el cron
 * diario con ~10 h de retraso (26-11 17:27 UTC, 27-11 17:07 UTC; el 28-11 a las 8:40 UTC aún no había corrido), así
 * que cada corrida escribía un solo lote y paraba (27-11: 299 tours, `nextPage` 11 de 180). Ahora la pausa es una
 * ventana y, además, hay un presupuesto de tiempo por corrida para terminar en verde (con `continue` guardado en
 * `SyncMetadata`) antes del `timeout-minutes: 120` del job, en vez de que GitHub la corte a medias.
 */

/** Ventana UTC del sync de FREETOUR: dentro no se arranca otro lote de Tangol (2:45–6:15 CDMX). */
export const VENTANA_FREETOUR_UTC = { desde: { hora: 8, minuto: 45 }, hasta: { hora: 12, minuto: 15 } } as const;
/** Hora UTC a partir de la cual no se arranca otro lote (2:45 CDMX). Se conserva: es el inicio de la ventana. */
export const TOPE_HORA_UTC = VENTANA_FREETOUR_UTC.desde;
/** Minutos desde el inicio de la corrida tras los cuales no se arranca otro lote (job de 120 min; lote ~10, humo ~10). */
export const PRESUPUESTO_MINUTOS_CORRIDA = 90;
/** Red de seguridad: pasos (lotes) por corrida. Con lotes de 10 destinos, ~184 destinos son 19 pasos. */
export const TOPE_PASOS_DIARIO = 60;

export type AccionPaso = "start" | "continue" | "finish" | "idle" | "abort" | null;

export interface DecisionDiaria { seguir: boolean; motivo: string }

const hhmm = (h: { hora: number; minuto: number }) => `${h.hora}:${String(h.minuto).padStart(2, "0")}`;
const minutosDelDia = (d: Date) => d.getUTCHours() * 60 + d.getUTCMinutes();
const aMinutos = (h: { hora: number; minuto: number }) => h.hora * 60 + h.minuto;

/** Verdadero si el instante cae dentro de la ventana del sync de FREETOUR (inicio incluido, fin excluido). */
// REQ-10957
export function enVentanaFreetour(ahora: Date): boolean {
  const m = minutosDelDia(ahora);
  return m >= aMinutos(VENTANA_FREETOUR_UTC.desde) && m < aMinutos(VENTANA_FREETOUR_UTC.hasta);
}

const SIGUE_LUEGO = "no se arranca otro lote; la corrida sigue en la próxima (programada o a mano)";

// REQ-10878, REQ-10957
export function siguientePasoDiario(i: { accion: AccionPaso; paso: number; ahora: Date; inicio: Date }): DecisionDiaria {
  if (i.accion === null) return { seguir: false, motivo: "paso sin reporte: no se sigue" };
  if (i.accion === "abort") return { seguir: false, motivo: "paso abortado: no se sigue" };
  if (i.accion === "finish") return { seguir: false, motivo: "corrida cerrada (finish)" };
  if (i.accion === "idle") return { seguir: false, motivo: "nada que hacer (idle)" };
  if (i.paso >= TOPE_PASOS_DIARIO) return { seguir: false, motivo: `tope de ${TOPE_PASOS_DIARIO} pasos: se revisa el workflow` };
  if (enVentanaFreetour(i.ahora)) {
    return { seguir: false, motivo: `ventana de FREETOUR (${hhmm(VENTANA_FREETOUR_UTC.desde)}–${hhmm(VENTANA_FREETOUR_UTC.hasta)} UTC): ${SIGUE_LUEGO}` };
  }
  const transcurrido = (i.ahora.getTime() - i.inicio.getTime()) / 60_000;
  if (transcurrido >= PRESUPUESTO_MINUTOS_CORRIDA) {
    return { seguir: false, motivo: `presupuesto de la corrida (${PRESUPUESTO_MINUTOS_CORRIDA} min): ${SIGUE_LUEGO}` };
  }
  return { seguir: true, motivo: "lote escrito; sigue el siguiente" };
}
