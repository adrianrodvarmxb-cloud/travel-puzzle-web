/**
 * Diccionario y mapeos por defecto, validados con Zod al importarse (REQ-401, REQ-404).
 * Agregar un proveedor = agregar `mapping/{proveedor}.json` y registrarlo aquí; el clasificador no cambia.
 * Nada de esto se conecta todavía a la UI ni a la base (fase T2 en adelante).
 */
import { parseDictionary, parseMapping, type Dictionary, type Mapping } from "../schemas/dictionary";
import rawDictionary from "./dictionary.json";
import rawFreetour from "./mapping/freetour.json";
import rawPropios from "./mapping/propios.json";

export const DEFAULT_DICTIONARY: Dictionary = parseDictionary(rawDictionary);
export const DEFAULT_MAPPINGS: Record<string, Mapping> = Object.fromEntries(
  [rawFreetour, rawPropios].map((raw) => { const m = parseMapping(raw); return [m.proveedor, m]; }),
);
