/**
 * REQ-406: regla corregida de La Primera Pieza. Precio 0 → Free tour (`pieza-libre`) salvo las categorías cuyo
 * formato base gana antes: FREETOUR 8, 17, 20, 24, 26, 28, 29, 30, 31 y 35 (hoy main no excluye ninguna). La insignia
 * «Tú decides cuánto vale» sigue saliendo por evento con fullPricePerGroup = 0 (REQ-095) y no cambia. Puro.
 */
import type { Dictionary, Mapping } from "../schemas/dictionary";
import { classify } from "./classify";
import { DEFAULT_GATES, type Gates } from "./gates";
import type { ClassifyInput } from "./types";

export function isPiezaLibre(input: ClassifyInput, dict: Dictionary, mappings: Record<string, Mapping>, gates: Gates = DEFAULT_GATES): boolean {
  return classify(input, dict, mappings, gates).formato === "pieza-libre";
}

export { piezaLibreExcepciones } from "./format";
