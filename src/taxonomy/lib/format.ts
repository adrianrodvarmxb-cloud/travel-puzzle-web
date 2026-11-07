/**
 * REQ-402, REQ-406, REQ-407: Eje A, un solo formato por producto con la precedencia 0–12 de
 * docs/taxonomia.md §4.1 (gana la primera regla que se cumple). Sin código por proveedor: todo sale del
 * mapeo (formato base, reglas por palabra permitidas, precio 0) y de las palabras del diccionario. Puro.
 */
import type { Categoria, Dictionary, Mapping, TerminoFormato } from "../schemas/dictionary";
import { CIRCUITO_MIN_MINUTOS, EXCURSION_MIN_MINUTOS, type Gates } from "./gates";
import { matches, norm } from "./text";
import { combinado } from "./combined";
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
  let b: FormatoOEstado = cat.formato;
  const id = `${mapping.proveedor}:${cat.id}`;
  if (b === "fuera") return { valor: "fuera", regla: `#0 base ${id}` };
  if (cat.fijo) return { valor: b, regla: `fijo ${id}` };

  const titulo = norm(input.titulo);
  const todo = norm(`${input.titulo} ${input.resumen ?? ""}`);
  const kw = (slug: FormatoOEstado, text: string) => matches(formatoTerm(dict, slug).palabras, text);
  const resumen = norm(input.resumen ?? "");
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
  // REQ-540 (PO 6-11 21:14): boletos solo SIN guía. Con guía en el título o el resumen es visita guiada (la entrada va
  // como atributo «entrada-incluida»); una base «entradas» con guía se trata como «tour» en el resto de las reglas.
  const conGuia = matches(formatoTerm(dict, "entradas").palabrasConGuia, todo);
  if (b === "entradas" && !conGuia) return { valor: "entradas", regla: `#4 base ${id}` };
  if (b === "entradas") b = "tour";
  if (palabrasPermitidas && cat.reglasPorPalabra.includes("entradas") && kw("entradas", titulo) && !conGuia) return { valor: "entradas", regla: `#4 palabra entrada en ${id}` };
  // 5 autoguiado
  if (b === "autoguiado") return { valor: "autoguiado", regla: `#5 base ${id}` };
  // REQ-533: audioguía, app, «auto guiado» o «por tu cuenta» en el título = sin guía en persona, de cualquier categoría.
  if (palabrasPermitidas && kw("autoguiado", titulo)) return { valor: "autoguiado", regla: `#5 palabra autoguiado en ${id}` };
  // 6 Free tour (Pieza libre): precio 0 en un proveedor de free tours, salvo las bases 0–5 de arriba
  // REQ-406: una base «entradas» (24, 20, 28, 35) nunca es pieza libre, aunque sea guiada (REQ-540).
  if (free && cat.formato !== "entradas") return { valor: "pieza-libre", regla: `#6 precio 0 en ${id}` };
  // 7 circuito
  const min = input.durationMinutes ?? null;
  const dias = input.durationDays ?? null;
  if ((min !== null && min >= CIRCUITO_MIN_MINUTOS) || (dias !== null && dias >= 2) || kw("circuito", titulo)) {
    return { valor: "circuito", regla: min !== null && min >= CIRCUITO_MIN_MINUTOS ? "#7 ≥1440 min" : dias !== null && dias >= 2 ? "#7 2+ días" : "#7 «N días» en el título" };
  }
  // 8 excursión de un día (gate G-T7)
  // REQ-534: la base «excursión» (FREETOUR cat. 4) exige ≥ 6 h cuando se conoce la duración (la regla práctica del PO:
  // 1 día o 6 a 14 h fuera de la ciudad). Con menos, cae a caminata (si es a pie) o visita guiada.
  const exc = formatoTerm(dict, "excursion-dia");
  const corta = min !== null && min < EXCURSION_MIN_MINUTOS;
  // REQ-545: «excursiones en {ciudad}» no dice que salga de la ciudad.
  // REQ-542 (PO 6-11 21:14): solo salidas desde la ciudad base; «city tour», «en {ciudad}», «París en un día» no salen.
  const enCiudad = matches(exc.palabrasEnCiudad, titulo) && !matches(exc.palabrasSaleSiempre, titulo);
  const tituloSale = kw("excursion-dia", titulo) && !matches(exc.palabrasNoEnTitulo, titulo) && !enCiudad;
  // REQ-865/866 (PO 6-11 22:36, como GetYourGuide: excursión = sale de la ciudad base): una base «excursión» de 6 h o
  // más solo sigue como excursión si el título o el resumen dicen que sale («desde», «excursión … a X», «day trip»,
  // transporte o recogida incluidos, «cerca de X»). Sin señal es visita guiada (o caminata si es a pie) con «dia-completo».
  const salida = (matches(exc.palabrasSalidaTitulo, titulo) && !enCiudad) || matches(exc.palabrasSalidaResumen, resumen);
  const largaSinSalida = b === "excursion-dia" && min !== null && min >= EXCURSION_MIN_MINUTOS && min < CIRCUITO_MIN_MINUTOS && !salida;
  // Si el título lo dice («Excursión…», «desde…»), la duración corta se toma como dato mal cargado.
  if (b === "excursion-dia" && !enCiudad && !largaSinSalida && (!corta || tituloSale)) return { valor: "excursion-dia", regla: `#8 base ${id}` };
  // REQ-535: «Excursión de un día» o «day trip» en el título bastan aunque la duración no lo diga.
  const fuerte = matches(exc.palabrasSinDuracion, titulo);
  const diaCompleto = fuerte || (min !== null && min >= EXCURSION_MIN_MINUTOS) || (min === null && dias === 1);
  // REQ-535: además del título, el resumen puede decir que sale de la ciudad base («transporte desde París», «Sal de…»).
  const sale = tituloSale || (!enCiudad && matches(exc.palabrasEnResumen, resumen));
  if (diaCompleto && !largaSinSalida && (gates.excursion === "B" || sale)) {
    return { valor: "excursion-dia", regla: gates.excursion === "B" ? "#8 ≥360 min (G-T7 B)" : "#8 ≥360 min y palabra de salida (G-T7 A)" };
  }
  // 9 caminata (gate G2 A: solo de pago; el free a pie ya salió en #6)
  // REQ-532: solo si es a pie: con barco, bici o vehículo en el título es visita guiada.
  const otroMedio = enOtroMedio(dict, titulo);
  // REQ-865: base excursión de 6 h o más sin señal de salida → visita guiada (caminata si es a pie, REQ-541/542).
  if (largaSinSalida) {
    return matches(medioPalabras(dict, "a-pie"), titulo) && !otroMedio
      ? { valor: "caminata", regla: `#9 base excursión ≥6 h sin salida y a pie (${id})` }
      : { valor: "tour", regla: `#11 base excursión ≥6 h sin salida de la ciudad (${id})` };
  }
  // REQ-867…869: dos actividades en el título. Espectáculo o clase al frente (o con solo gastronomía al lado) = Momentos
  // de autor; un recorrido al frente = caminata (a pie) o visita guiada, aunque la base o una palabra digan otra cosa.
  const comb = combinado(input.titulo, dict);
  if (comb && comb.principal !== "recorrido") return { valor: "experiencia-unica", regla: `#10 combinado: domina ${comb.principal} (${comb.secundarias.join(", ")})` };
  if (comb) {
    const aPie = (b === "caminata" || matches(medioPalabras(dict, "a-pie"), titulo)) && !otroMedio;
    return aPie ? { valor: "caminata", regla: `#9 combinado: domina el recorrido a pie (${comb.secundarias.join(", ")})` } : { valor: "tour", regla: `#11 combinado: domina el recorrido (${comb.secundarias.join(", ")})` };
  }
  if (b === "caminata" && !otroMedio) return { valor: "caminata", regla: `#9 base ${id}` };
  if (b === "caminata") return { valor: "tour", regla: `#9 base caminata con otro medio en el título (${id})` };
  if (b === "excursion-dia" && (corta || enCiudad)) {
    return matches(medioPalabras(dict, "a-pie"), titulo) && !otroMedio
      ? { valor: "caminata", regla: `#9 base excursión de menos de 6 h y a pie (${id})` }
      : { valor: "tour", regla: `#11 base excursión de menos de 6 h (${id})` };
  }
  // 10 Momentos de autor
  if (b === "experiencia-unica") return { valor: "experiencia-unica", regla: `#10 base ${id}` };
  // REQ-541 (PO 6-11 21:14): solo talleres, clases, catas sentadas y espectáculos; un recorrido con degustación no.
  const eu = formatoTerm(dict, "experiencia-unica");
  const recorrido = matches(eu.palabrasRecorrido, titulo) && !matches(eu.palabrasFuertes, titulo);
  if (cat.reglasPorPalabra.includes("experiencia-unica") && kw("experiencia-unica", todo) && !recorrido) return { valor: "experiencia-unica", regla: `#10 clase o taller en ${id}` };
  // REQ-541: un tour a pie (food tour, ruta a pie) es caminata, sin otro medio en el título.
  if (b === "tour" && matches(medioPalabras(dict, "a-pie"), titulo) && !otroMedio) return { valor: "caminata", regla: `#9 a pie en el título (${id})` };
  // 11 tour · 12 a la medida · crucero (sin regla)
  return { valor: b, regla: `#${b === "tour" ? 11 : b === "a-la-medida" ? 12 : "—"} base ${id}` };
}

/** Palabras de un valor del atributo «medio» (bici, barco, vehiculo, a-pie) del diccionario. */
function medioPalabras(dict: Dictionary, valor: string): string[] {
  const medio = dict.terminos.find((t) => t.eje === "atributo" && t.slug === "medio") as { valores?: { slug: string; palabras?: string[] }[] } | undefined;
  return medio?.valores?.find((v) => v.slug === valor)?.palabras ?? [];
}

/** REQ-532: ¿el título dice barco, bici o vehículo? */
function enOtroMedio(dict: Dictionary, titulo: string): boolean {
  return ["barco", "bici", "vehiculo"].some((m) => matches(medioPalabras(dict, m), titulo));
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
