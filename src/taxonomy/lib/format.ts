/**
 * REQ-402, REQ-406, REQ-407: Eje A, un solo formato por producto con la precedencia 0–12 de
 * docs/taxonomia.md §4.1 (gana la primera regla que se cumple). Sin código por proveedor: todo sale del
 * mapeo (formato base, reglas por palabra permitidas, precio 0) y de las palabras del diccionario. Puro.
 */
import type { Categoria, Dictionary, Mapping, TerminoFormato } from "../schemas/dictionary";
import { CIRCUITO_MIN_MINUTOS, EXCURSION_MIN_MINUTOS, type Gates } from "./gates";
import { matches, norm } from "./text";
import type { ClassifyInput, Decision, FormatoOEstado } from "./types";

/** Formatos cuyo formato base gana antes que Free tour (precedencia 0–5). */
const ANTES_DE_FREE: ReadonlySet<FormatoOEstado> = new Set(["fuera", "traslado", "transporte", "alquiler", "entradas", "autoguiado"]);

export function formatoTerm(dict: Dictionary, slug: FormatoOEstado): TerminoFormato {
  const t = dict.terminos.find((x): x is TerminoFormato => x.eje === "formato" && x.slug === slug);
  if (!t) throw new Error(`formato sin término: ${slug}`);
  return t;
}

export function findCategoria(mapping: Mapping | undefined, id: ClassifyInput["categoriaId"]): Categoria | undefined {
  if (!mapping || id === null || id === undefined) return undefined;
  return mapping.categorias.find((c) => c.id === String(id));
}

export function classifyFormato(input: ClassifyInput, dict: Dictionary, mapping: Mapping | undefined, gates: Gates): Decision<FormatoOEstado> {
  const cat = findCategoria(mapping, input.categoriaId);
  if (!mapping || !cat || cat.formato === "por-revisar") return { valor: "por-revisar", regla: mapping ? `sin mapeo: ${mapping.proveedor}:${input.categoriaId}` : `proveedor sin mapeo: ${input.proveedor}` };
  const b = cat.formato;
  const id = `${mapping.proveedor}:${cat.id}`;
  if (b === "fuera") return { valor: "fuera", regla: `#0 base ${id}` };
  if (cat.fijo) return { valor: b, regla: `fijo ${id}` };

  const titulo = norm(input.titulo);
  const todo = norm(`${input.titulo} ${input.resumen ?? ""}`);
  const kw = (slug: FormatoOEstado, text: string) => matches(formatoTerm(dict, slug).palabras, text);
  const precio = input.precio;
  const free = mapping.precioCeroEsPiezaLibre && precio === 0;
  const palabrasPermitidas = gates.palabrasAntesDeFree || !free;

  // 1 traslado
  if (b === "traslado") return { valor: "traslado", regla: `#1 base ${id}` };
  if (palabrasPermitidas && cat.reglasPorPalabra.includes("traslado") && kw("traslado", todo) && !matches(formatoTerm(dict, "traslado").palabrasNoEnTitulo, titulo)) {
    return { valor: "traslado", regla: `#1 palabra traslado en ${id}` };
  }
  // 2 transporte
  if (b === "transporte") return { valor: "transporte", regla: `#2 base ${id}` };
  if (palabrasPermitidas && kw("transporte", titulo)) return { valor: "transporte", regla: "#2 palabra hop-on en el título" };
  // 3 alquiler
  if (b === "alquiler") return { valor: "alquiler", regla: `#3 base ${id}` };
  // 4 entradas
  if (b === "entradas") return { valor: "entradas", regla: `#4 base ${id}` };
  if (palabrasPermitidas && cat.reglasPorPalabra.includes("entradas") && kw("entradas", titulo)) return { valor: "entradas", regla: `#4 palabra entrada en ${id}` };
  // 5 autoguiado
  if (b === "autoguiado") return { valor: "autoguiado", regla: `#5 base ${id}` };
  // 6 Free tour (Pieza libre): precio 0 en un proveedor de free tours, salvo las bases 0–5 de arriba
  if (free) return { valor: "pieza-libre", regla: `#6 precio 0 en ${id}` };
  // 7 circuito
  const min = input.durationMinutes ?? null;
  const dias = input.durationDays ?? null;
  if ((min !== null && min >= CIRCUITO_MIN_MINUTOS) || (dias !== null && dias >= 2) || kw("circuito", titulo)) {
    return { valor: "circuito", regla: min !== null && min >= CIRCUITO_MIN_MINUTOS ? "#7 ≥1440 min" : dias !== null && dias >= 2 ? "#7 2+ días" : "#7 «N días» en el título" };
  }
  // 8 excursión de un día (gate G-T7)
  if (b === "excursion-dia") return { valor: "excursion-dia", regla: `#8 base ${id}` };
  const diaCompleto = (min !== null && min >= EXCURSION_MIN_MINUTOS) || (min === null && dias === 1);
  if (diaCompleto && (gates.excursion === "B" || kw("excursion-dia", titulo))) {
    return { valor: "excursion-dia", regla: gates.excursion === "B" ? "#8 ≥360 min (G-T7 B)" : "#8 ≥360 min y palabra de salida (G-T7 A)" };
  }
  // 9 caminata (gate G2 A: solo de pago; el free a pie ya salió en #6)
  if (b === "caminata") return { valor: "caminata", regla: `#9 base ${id}` };
  // 10 Momentos de autor
  if (b === "experiencia-unica") return { valor: "experiencia-unica", regla: `#10 base ${id}` };
  if (cat.reglasPorPalabra.includes("experiencia-unica") && kw("experiencia-unica", todo)) return { valor: "experiencia-unica", regla: `#10 clase o taller en ${id}` };
  // 11 tour · 12 a la medida · crucero (sin regla)
  return { valor: b, regla: `#${b === "tour" ? 11 : b === "a-la-medida" ? 12 : "—"} base ${id}` };
}

/** Gate G2: qué cuenta como «Caminata» al filtrar (T4). El formato del producto no cambia. */
export function cuentaComoCaminata(r: { formato: FormatoOEstado; atributos: string[]; temas: string[] }, gate: Gates["caminata"]): boolean {
  if (gate === "A") return r.formato === "caminata";
  if (gate === "B") return r.formato === "caminata" || (r.formato === "pieza-libre" && r.atributos.includes("medio:a-pie"));
  return r.temas.includes("montana-senderismo");
}

/** Las categorías de un mapeo cuyo precio 0 NO es Free tour (su base gana antes, precedencia 0–5). */
export function piezaLibreExcepciones(mapping: Mapping): string[] {
  if (!mapping.precioCeroEsPiezaLibre) return mapping.categorias.map((c) => c.id);
  return mapping.categorias.filter((c) => ANTES_DE_FREE.has(c.formato)).map((c) => c.id);
}
