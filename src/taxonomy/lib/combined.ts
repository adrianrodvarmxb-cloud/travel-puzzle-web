/**
 * REQ-867…869 (PO, 6 nov 2026, 22:36: «decide como los referentes»): actividades combinadas en un título
 * («Sabores de Madrid y Show de Flamenco», «Tour por Temple Bar con Cata de Cerveza»). Se parte el título por sus
 * conectores («y», «con», «+», «&», «and», «with»…) y cada parte se reconoce como espectáculo, clase, gastronomía o
 * recorrido (en ese orden de prioridad dentro de una parte: «Ruta de tapas» es gastronomía, no recorrido).
 * Regla: lo gastronómico (catas, tapas, food tour, mercado) nunca domina: va como tema. Entre recorrido, espectáculo
 * y clase domina lo que abre el título (no hay duración por parte). Comidas incluidas («con almuerzo») no cuentan.
 * Sin listas en código: todo sale de `combinado` del término `experiencia-unica` del diccionario. Puro.
 */
import type { Dictionary, TerminoFormato } from "../schemas/dictionary";
import { matches, norm } from "./text";
import type { Tema } from "./types";

export type Actividad = "espectaculo" | "clase" | "gastronomia" | "recorrido";
const ORDEN: readonly Actividad[] = ["espectaculo", "clase", "gastronomia", "recorrido"];

/** Tema que aporta la actividad secundaria (el recorrido no aporta tema propio). */
export const TEMA_DE_ACTIVIDAD: Record<Actividad, Tema | null> = {
  espectaculo: "noche-espectaculos", clase: "talleres-aprendizaje", gastronomia: "gastronomia", recorrido: null,
};

export interface Combinado { principal: Exclude<Actividad, "gastronomia">; secundarias: Actividad[]; partes: Actividad[] }

// REQ-867, REQ-868, REQ-869
export function combinado(titulo: string, dict: Dictionary): Combinado | null {
  const eu = dict.terminos.find((t): t is TerminoFormato => t.eje === "formato" && t.slug === "experiencia-unica");
  const c = eu?.combinado;
  if (!c) return null;
  // Solo el primer idioma del título («es | en»): las dos versiones repetirían las mismas actividades.
  const primero = norm(titulo.split(" | ")[0] ?? "");
  const sep = new RegExp(c.separadores.join("|"), "i");
  const partes = primero.split(sep).filter((x) => x && x.trim() && !/^(y|e|con|and|with|plus|mas)$/.test(x.trim()));
  const kinds: Actividad[] = [];
  for (const p of partes) {
    const k = ORDEN.find((a) => matches(c[a], p));
    if (k) kinds.push(k);
  }
  if (new Set(kinds).size < 2) return null;
  const principal = kinds.find((k): k is Combinado["principal"] => k !== "gastronomia");
  if (!principal) return null;
  const secundarias = [...new Set(kinds.filter((k) => k !== principal))];
  return { principal, secundarias, partes: kinds };
}
