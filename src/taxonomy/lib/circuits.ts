/**
 * REQ-421: Eje D, facetas de circuitos (solo viajes propios). Tipo de grupo desde las opciones y el kind;
 * dificultad 1–5 desde los 3 valores del gestor (gate G-T8); rango de días 1–5 · 6–9 · 10–14 · 15+.
 * Sin dato no se devuelve nada (nunca «sin dato»). Confort, tipo de guía, perfil y altitud: tras bandera, sin cálculo. Puro.
 */
import type { Dictionary, TerminoFacetaCircuito } from "../schemas/dictionary";
import { DEFAULT_GATES, DIFICULTAD_DESDE_GESTOR, type Gates } from "./gates";

export type TipoGrupo = "en-grupo" | "privado" | "a-la-medida";

export function tipoGrupo(trip: { kind: string; modos?: ("group" | "private")[] }): TipoGrupo[] {
  const out: TipoGrupo[] = [];
  if (trip.modos?.includes("group")) out.push("en-grupo");
  if (trip.modos?.includes("private")) out.push("privado");
  if (trip.kind === "personalizado") out.push("a-la-medida");
  return out;
}

function faceta(dict: Dictionary, slug: string): TerminoFacetaCircuito {
  const f = dict.terminos.find((t): t is TerminoFacetaCircuito => t.eje === "faceta-circuito" && t.slug === slug);
  if (!f) throw new Error(`faceta sin término: ${slug}`);
  return f;
}

export interface Dificultad { nivel: 1 | 2 | 3 | 4 | 5; termino_es: string; definicion_es: string }

/** Desde `Trip.difficulty` (facil · moderada · exigente) o un nivel 1–5 declarado por el operador. */
export function dificultad(valor: string | number | null | undefined, dict: Dictionary, gate: Gates["dificultad"] = DEFAULT_GATES.dificultad): Dificultad | null {
  let nivel: number | null = null;
  if (typeof valor === "number" && Number.isInteger(valor) && valor >= 1 && valor <= 5) nivel = valor;
  else if (typeof valor === "string" && gate === "A" && valor in DIFICULTAD_DESDE_GESTOR) nivel = DIFICULTAD_DESDE_GESTOR[valor as keyof typeof DIFICULTAD_DESDE_GESTOR];
  if (nivel === null) return null;
  const n = faceta(dict, "circuito-dificultad").niveles?.find((x) => x.nivel === nivel);
  return n ? { nivel: n.nivel as Dificultad["nivel"], termino_es: n.termino_es, definicion_es: n.definicion_es } : null;
}

/** Rango de días; sin dato o fuera de rango, null. */
export function rangoDias(dias: number | null | undefined, dict: Dictionary): string | null {
  if (typeof dias !== "number" || !Number.isInteger(dias) || dias < 1) return null;
  const v = faceta(dict, "dur-dias").valores?.find((r) => dias >= (r.min ?? 1) && (r.max === null || r.max === undefined || dias <= r.max));
  return v?.slug ?? null;
}
