/**
 * REQ-10820 · Ficha única, ola 6 (plan §2: `lib/prefill.ts`, «lectura de ?fecha&adultos&ninos&opcion»).
 * Lee lo que Mila o una liga ponen en la URL de la ficha para dejar listos el calendario, las personas y la opción.
 * Extiende REQ-150 (`leerPrellenado`: fecha ISO válida, 1–20 adultos, 0–20 niños solo junto a fecha o adultos)
 * con `opcion`, que solo se acepta si la ficha tiene más de una opción y el id coincide exacto (plan: «rechaza
 * valores inválidos»). Puro: sin Next, sin reloj, sin I/O.
 */
import { leerPrellenado, type Prellenado } from "@/agente/lib/catalogo";
import type { FichaModel } from "./model";

export type Query = Record<string, string | string[] | undefined>;

export interface FichaPrefill extends Prellenado {
  /** Id de la opción elegida (`FichaOption.id`); solo si existe en la ficha. */
  opcion?: string;
}

const uno = (q: Query, k: string): string | undefined => (Array.isArray(q[k]) ? q[k]![0] : q[k]);

/** Lo que la URL trae y es válido para esta ficha; lo demás se ignora en silencio. */
// REQ-10820
export function leerPrefill(q: Query, ficha: Pick<FichaModel, "options">): FichaPrefill {
  const out: FichaPrefill = { ...leerPrellenado(q) };
  const op = uno(q, "opcion");
  if (op && ficha.options.length > 1 && ficha.options.some((o) => o.id === op)) out.opcion = op;
  return out;
}

/** Cadena de consulta con lo válido, en orden fijo (fecha, adultos, ninos, opcion); "" si no hay nada. */
// REQ-10820
export function prefillQuery(p: FichaPrefill): string {
  const qs = new URLSearchParams();
  if (p.fecha) qs.set("fecha", p.fecha);
  if (p.adultos !== undefined) qs.set("adultos", String(p.adultos));
  if (p.ninos !== undefined) qs.set("ninos", String(p.ninos));
  if (p.opcion) qs.set("opcion", p.opcion);
  return qs.toString();
}
