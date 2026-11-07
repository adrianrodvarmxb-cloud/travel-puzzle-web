/**
 * REQ-417, REQ-419: Eje C. Atributos activos solo con dato (privado, nocturno, medio, en español, calificación,
 * favorito, vuelo incluido); los que no tienen dato hoy salen solo con la bandera encendida Y una casilla declarada
 * (nunca se infieren). Pares excluyentes: guiado/autoguiado, privado/grupo pequeño, familias/solo adultos. Puro.
 */
import type { Categoria, Dictionary, Mapping, TerminoAtributo, TerminoFormato } from "../schemas/dictionary";
import { CIRCUITO_MIN_MINUTOS, EXCURSION_MIN_MINUTOS, FAVORITO_CRITERIO, type Gates } from "./gates";
import { matches, norm } from "./text";
import { ATRIBUTOS_EXTRA, MEDIOS, type ClassifyInput, type Decision, type FormatoOEstado } from "./types";

/** Pares que nunca salen juntos: si chocan, se queda `queda` (el que promete menos) y se registra un aviso. */
export const PARES_EXCLUYENTES = [
  { queda: "autoguiado", sale: "guiado" },
  { queda: "privado", sale: "grupo-pequeno" },
  { queda: "solo-adultos", sale: "familias" },
] as const;

function atributo(dict: Dictionary, slug: string): TerminoAtributo | undefined {
  return dict.terminos.find((t): t is TerminoAtributo => t.eje === "atributo" && t.slug === slug);
}

export function esFavorito(input: Pick<ClassifyInput, "calificacion" | "resenas">, gate: Gates["favorito"]): boolean {
  const c = FAVORITO_CRITERIO[gate];
  return (input.calificacion ?? 0) >= c.minCalificacion && (input.resenas ?? 0) >= c.minResenas;
}

export function classifyAtributos(
  input: ClassifyInput, formato: FormatoOEstado, dict: Dictionary, mapping: Mapping | undefined, cat: Categoria | undefined, gates: Gates,
): { atributos: Decision<string>[]; avisos: string[] } {
  if (formato === "fuera" || formato === "por-revisar") return { atributos: [], avisos: [] };
  const titulo = norm(input.titulo);
  const out = new Map<string, string>();
  const add = (slug: string, regla: string) => { if (!out.has(slug)) out.set(slug, regla); };

  if (matches(atributo(dict, "privado")?.palabras, titulo)) add("privado", "palabra en el título");
  if (input.modos?.includes("private")) add("privado", "opción privada del viaje");

  if (cat?.atributos.includes("nocturno")) add("nocturno", `categoría ${mapping?.proveedor}:${cat.id}`);
  else if (matches(atributo(dict, "nocturno")?.palabras, titulo)) add("nocturno", "palabra en el título");

  const medio = atributo(dict, "medio");
  const porPalabra = MEDIOS.find((m) => matches(medio?.valores?.find((v) => v.slug === m)?.palabras, titulo));
  const porCategoria = cat?.atributos.find((a) => a.startsWith("medio:"));
  if (porPalabra) add(`medio:${porPalabra}`, "palabra en el título");
  else if (porCategoria) add(porCategoria, `categoría ${mapping?.proveedor}:${cat!.id}`);

  if (input.idiomas?.includes("es")) add("idioma-es", "idioma declarado");
  if ((input.resenas ?? 0) > 0 && typeof input.calificacion === "number") add("calificacion", "reseñas reales");
  if (esFavorito(input, gates.favorito)) add("favorito", `G-T1 ${gates.favorito}`);
  if (input.vueloIncluido === true) add("vuelo-incluido", "flightsIncluded");

  // REQ-540 / REQ-542 (PO 6-11 21:14): atributos que complementan el tipo principal; facetas del filtro.
  const todo = norm(`${input.titulo} ${input.resumen ?? ""}`);
  const conGuia = dict.terminos.some((t) => t.eje === "formato" && t.slug === formato && (t as TerminoFormato).guiaEnPersona);
  if (conGuia && matches(atributo(dict, "entrada-incluida")?.palabras, todo)) add("entrada-incluida", "visita guiada con entrada");
  const min = input.durationMinutes ?? null;
  const largo = (min !== null && min >= EXCURSION_MIN_MINUTOS && min < CIRCUITO_MIN_MINUTOS) || matches(atributo(dict, "dia-completo")?.palabras, todo);
  if ((formato === "tour" || formato === "visita-guiada" || formato === "caminata") && largo) add("dia-completo", "día completo sin salir de la ciudad");

  const fmt = dict.terminos.find((t): t is TerminoFormato => t.eje === "formato" && t.slug === formato);
  if (formato === "autoguiado") add("autoguiado", "formato autoguiado");
  else if (fmt?.guiaEnPersona) add("guiado", `formato ${formato}`);
  if (matches(atributo(dict, "autoguiado")?.palabras, titulo)) add("autoguiado", "palabra en el título");

  if (gates.atributosExtra) {
    for (const slug of ATRIBUTOS_EXTRA) {
      if (input.declarados?.[slug] !== true) continue;
      if (slug === "confirmacion-inmediata" && !mapping?.permiteConfirmacionInmediata) continue;
      add(slug, "casilla declarada");
    }
  }

  const avisos: string[] = [];
  for (const p of PARES_EXCLUYENTES) {
    if (out.has(p.queda) && out.has(p.sale)) { out.delete(p.sale); avisos.push(`choque ${p.queda}/${p.sale}: queda ${p.queda}`); }
  }
  return { atributos: [...out].map(([valor, regla]) => ({ valor, regla })), avisos };
}
