/**
 * REQ-405: clasificador puro. classify(input, diccionario, mapeos, gates) → formato, temas[], atributos[] y la regla
 * que decidió cada uno. Sin red, base, reloj ni azar; no lee ni devuelve slug ni content_hash (la clasificación
 * vive fuera del registro del proveedor, REQ-409). Un proveedor nuevo es un mapeo nuevo (REQ-404).
 */
import type { Dictionary, Mapping } from "../schemas/dictionary";
import { classifyAtributos } from "./attributes";
import { esDecision9, temasDecision9 } from "./aventura-senderismo";
import { classifyFormato, findCategoria, formatoTerm } from "./format";
import { DEFAULT_GATES, type Gates } from "./gates";
import { classifyTemas } from "./themes";
import type { ClassifyInput, ClassifyResult } from "./types";

export function classify(
  input: ClassifyInput, dict: Dictionary, mappings: Record<string, Mapping>, gates: Gates = DEFAULT_GATES,
): ClassifyResult {
  const mapping = mappings[input.proveedor];
  const cat = findCategoria(mapping, input.categoriaId);
  const f = classifyFormato(input, dict, mapping, gates);
  // REQ-10662: lo que cambió por la decisión 9 lleva Aventura y Montaña y senderismo al frente.
  const temas = esDecision9(f.regla) ? temasDecision9(classifyTemas(input, f.valor, dict, mapping, cat)) : classifyTemas(input, f.valor, dict, mapping, cat);
  const { atributos, avisos } = classifyAtributos(input, f.valor, dict, mapping, cat, gates);
  if (f.valor === "por-revisar") avisos.push(`por-revisar: ${input.proveedor}:${input.categoriaId ?? "sin categoría"}`);
  return {
    formato: f.valor,
    reglaFormato: f.regla,
    seccion: formatoTerm(dict, f.valor).seccion,
    temas: temas.map((t) => t.valor),
    reglasTemas: temas,
    atributos: atributos.map((a) => a.valor),
    reglasAtributos: atributos,
    avisos,
  };
}
