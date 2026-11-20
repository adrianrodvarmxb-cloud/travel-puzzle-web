/**
 * REQ-10826 · Lector de correos y voucher: núcleo común + lo que la confirmación repite. Dictamen punto 10 (REQ-10794):
 * el voucher y el correo de confirmación nombran SIEMPRE al operador en destino («Servicio operado en destino por: …»);
 * si el modelo no trae operador, la línea no sale (nunca se inventa). Puro.
 */
import type { FichaModel } from "../model";
import { commonFacts, type CommonFacts, type ReaderContext } from "./common";

const OPERATED: Record<string, string> = { es: "Servicio operado en destino por", en: "Service operated locally by", pt: "Serviço operado no destino por", fr: "Service opéré sur place par", de: "Vor Ort durchgeführt von", it: "Servizio operato in loco da" };

export interface EmailRead {
  common: CommonFacts;
  /** Línea literal del operador para voucher y confirmación; null si el modelo no lo trae. */
  operatorLine: string | null;
  whatToBring: string[];
  requirements: string[];
  notes: string[];
}

// REQ-10826
export function readEmail(f: FichaModel, ctx: ReaderContext): EmailRead {
  const common = commonFacts(f, ctx);
  return {
    common,
    operatorLine: common.operator ? `${OPERATED[f.lang] ?? OPERATED.en}: ${common.operator}` : null,
    whatToBring: f.whatToBring,
    requirements: f.requirements,
    notes: f.notes,
  };
}
