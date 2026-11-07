/**
 * Diccionario y mapeos por defecto, validados con Zod al importarse (REQ-401, REQ-404).
 * Agregar un proveedor = agregar `mapping/{proveedor}.json` y registrarlo aquí; el clasificador no cambia.
 * Nada de esto se conecta todavía a la UI ni a la base (fase T2 en adelante).
 */
import { parseDictionary, parseMapping, type Dictionary, type Mapping } from "../schemas/dictionary";
import rawDictionary from "./dictionary.json";
import rawFreetour from "./mapping/freetour.json";
import rawPropios from "./mapping/propios.json";
import rawExtime from "./mapping/extime.json";
import rawExoticEscapes from "./mapping/exoticescapes.json";
import rawBigBus from "./mapping/bigbus.json";
import rawIncaWorld from "./mapping/incaworld.json";
import rawDestinoColombia from "./mapping/destinocolombia.json";
import rawFantasticaChina from "./mapping/fantasticachina.json";
import rawTurismoAsiatico from "./mapping/turismoasiatico.json";

export const DEFAULT_DICTIONARY: Dictionary = parseDictionary(rawDictionary);
export const DEFAULT_MAPPINGS: Record<string, Mapping> = Object.fromEntries(
  [rawFreetour, rawPropios].map((raw) => { const m = parseMapping(raw); return [m.proveedor, m]; }),
);

/**
 * REQ-552 (Ola R2): mapeos por agencia desde la denominación ORIGINAL del proveedor (documento o código). Solo los usa
 * el recálculo con linaje (TAXONOMY_LINEAGE_ENABLED, apagada); con la bandera apagada todo sigue con DEFAULT_MAPPINGS.
 */
export const AGENCY_MAPPINGS: Record<string, Mapping> = Object.fromEntries(
  [rawExtime, rawExoticEscapes, rawBigBus, rawIncaWorld, rawDestinoColombia, rawFantasticaChina, rawTurismoAsiatico].map((raw) => { const m = parseMapping(raw); return [m.proveedor, m]; }),
);
