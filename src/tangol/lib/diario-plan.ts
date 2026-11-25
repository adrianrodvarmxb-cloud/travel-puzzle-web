/**
 * REQ-10878 · Ciclo diario de Tangol (plan de actualización diaria, etapa D2; G-D1 «1:00 a. m.», REQ-10673). El
 * workflow diario repite los pasos por lotes (export → plan → escribir) hasta que el sync cierre la corrida (`finish`)
 * o no tenga nada que hacer (`idle`). Puro: decide si se sigue con otro lote; no corre nada.
 * Candados: nunca se sigue tras un paso abortado o sin reporte; no se arranca otro lote desde las 8:45 UTC para no
 * pisar el sync de FREETOUR (3:00 CDMX = 9:00 UTC); tope de pasos como red de seguridad.
 */

/** Hora UTC a partir de la cual no se arranca otro lote (2:45 CDMX). */
export const TOPE_HORA_UTC = { hora: 8, minuto: 45 } as const;
/** Red de seguridad: pasos (lotes) por corrida. Con lotes de 10 destinos, ~184 destinos son 19 pasos. */
export const TOPE_PASOS_DIARIO = 60;

export type AccionPaso = "start" | "continue" | "finish" | "idle" | "abort" | null;

export interface DecisionDiaria { seguir: boolean; motivo: string }

// REQ-10878
export function siguientePasoDiario(i: { accion: AccionPaso; paso: number; ahora: Date; inicio: Date }): DecisionDiaria {
  if (i.accion === null) return { seguir: false, motivo: "paso sin reporte: no se sigue" };
  if (i.accion === "abort") return { seguir: false, motivo: "paso abortado: no se sigue" };
  if (i.accion === "finish") return { seguir: false, motivo: "corrida cerrada (finish)" };
  if (i.accion === "idle") return { seguir: false, motivo: "nada que hacer (idle)" };
  if (i.paso >= TOPE_PASOS_DIARIO) return { seguir: false, motivo: `tope de ${TOPE_PASOS_DIARIO} pasos: se revisa el workflow` };
  const minutos = i.ahora.getUTCHours() * 60 + i.ahora.getUTCMinutes();
  if (minutos >= TOPE_HORA_UTC.hora * 60 + TOPE_HORA_UTC.minuto) {
    return { seguir: false, motivo: `tope de hora (${TOPE_HORA_UTC.hora}:${String(TOPE_HORA_UTC.minuto).padStart(2, "0")} UTC): la corrida arranca de nuevo mañana sin pisar el sync de las 3:00 CDMX` };
  }
  return { seguir: true, motivo: "lote escrito; sigue el siguiente" };
}
