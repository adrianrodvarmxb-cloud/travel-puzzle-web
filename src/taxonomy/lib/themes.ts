/**
 * REQ-403, REQ-411: Eje B, de 0 a 3 temas por producto presencial. Fuentes, en orden de prioridad del diccionario:
 * temas que implica la categoría del proveedor (o `Trip.category`) y palabras del título; si no sale ninguno,
 * palabras del título más el resumen. Frases excluidas por tema («game of thrones», «casa cueva»). Puro.
 */
import type { Categoria, Dictionary, Mapping, TerminoTema } from "../schemas/dictionary";
import { matches, norm, without } from "./text";
import { MAX_TEMAS, type ClassifyInput, type Decision, type FormatoOEstado, type Tema } from "./types";

export function temaTerms(dict: Dictionary): TerminoTema[] {
  return dict.terminos.filter((t): t is TerminoTema => t.eje === "tema").sort((a, b) => a.prioridad - b.prioridad);
}

export function classifyTemas(
  input: ClassifyInput, formato: FormatoOEstado, dict: Dictionary, mapping: Mapping | undefined, cat: Categoria | undefined,
): Decision<Tema>[] {
  if (formato === "fuera" || formato === "por-revisar") return [];
  const implicados = new Map<Tema, string>();
  for (const t of cat?.temas ?? []) implicados.set(t, `categoría ${mapping?.proveedor}:${cat?.id}`);
  for (const f of input.fuentesTema ?? []) for (const t of mapping?.temasPorFuente?.[f] ?? []) if (!implicados.has(t)) implicados.set(t, `fuente ${f}`);

  const titulo = norm(input.titulo);
  const todo = norm(`${input.titulo} ${input.resumen ?? ""}`);
  const terms = temaTerms(dict);
  const out: Decision<Tema>[] = [];
  for (const t of terms) {
    const slug = t.slug as Tema;
    if (implicados.has(slug)) out.push({ valor: slug, regla: implicados.get(slug)! });
    else if (matches(t.palabras, without(titulo, t.excluir))) out.push({ valor: slug, regla: "palabra en el título" });
  }
  if (out.length === 0) {
    for (const t of terms) if (matches(t.palabras, without(todo, t.excluir))) out.push({ valor: t.slug as Tema, regla: "palabra en el resumen" });
  }
  return out.slice(0, MAX_TEMAS);
}

/** Temas que pueden ser chip (REQ-411: «Ciudad y barrios» es base, no filtro). */
export function temasConChip(dict: Dictionary): Tema[] {
  return temaTerms(dict).filter((t) => t.chip).map((t) => t.slug as Tema);
}
