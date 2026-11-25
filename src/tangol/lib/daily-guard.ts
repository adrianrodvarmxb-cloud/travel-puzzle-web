/**
 * REQ-10876: tope del sync diario de Tangol (plan de actualización diaria, etapa D1).
 * Si la corrida trae menos del 80 % de los tours del día anterior, no retira nada y avisa:
 * un fallo de Tangol no debe vaciar el catálogo. Pura: no lee ni escribe nada.
 */
export const TOPE_DIARIO = 0.8;

export type MotivoTope = "sin-referencia" | "dentro-del-tope" | "bajo-el-tope";

export interface DecisionTope {
  permitirRetiros: boolean;
  motivo: MotivoTope;
  avisar: boolean;
  mensaje: string;
}

export function decidirTopeDiario({ ayer, hoy }: { ayer: number; hoy: number }): DecisionTope {
  // Sin dato de hoy válido nunca se permite retirar (un dato roto no es permiso para vaciar).
  if (!Number.isFinite(hoy) || hoy < 0) {
    return { permitirRetiros: false, motivo: "bajo-el-tope", avisar: true, mensaje: "La corrida no trajo un conteo válido: no se retira nada." };
  }
  if (!Number.isFinite(ayer) || ayer <= 0) {
    return { permitirRetiros: true, motivo: "sin-referencia", avisar: false, mensaje: "Sin corrida anterior con la cual comparar." };
  }
  if (hoy >= ayer * TOPE_DIARIO) {
    return { permitirRetiros: true, motivo: "dentro-del-tope", avisar: false, mensaje: `${hoy} de ${ayer} tours: dentro del tope.` };
  }
  return {
    permitirRetiros: false,
    motivo: "bajo-el-tope",
    avisar: true,
    mensaje: `Tangol trajo ${hoy} de ${ayer} tours (menos del ${TOPE_DIARIO * 100} %): no se retira nada y se avisa al PO.`,
  };
}
