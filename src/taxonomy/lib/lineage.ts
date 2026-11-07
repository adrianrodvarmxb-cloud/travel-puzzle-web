/**
 * Ola R2 · reclasificación con linaje (REQ-751, REQ-753, REQ-754). Puro: sin red, base, reloj ni azar.
 * - REQ-751: cada término lleva su procedencia estructurada: campo del proveedor, valor original, palabra o código que
 *   coincidió y huella del crudo (ProviderRecord.rawHash). Los términos son exactamente los del clasificador de hoy.
 * - REQ-753: los viajes importados se clasifican PRIMERO con la denominación original del proveedor (mapeo de la
 *   agencia); si no hay o el mapeo no la conoce, con el mapeo propio (trip.kind), y el linaje lo dice.
 * - REQ-754: precedencia manual (ExperienceTaxonomyOverride) > regla (clasificador) > valor que declara el registro.
 * Nunca escribe en campos del proveedor (REQ-409): esto solo arma filas de la tabla propia ExperienceTaxonomy.
 */
import type { Dictionary, Mapping, TerminoAtributo, TerminoFormato, TerminoTema } from "../schemas/dictionary";
import { classify } from "./classify";
import { formatoTerm } from "./format";
import { DEFAULT_GATES, type Gates } from "./gates";
import { keywordRegex, norm, without } from "./text";
import { rowsFor, tourToInput, tripToInput, type TaxonomyRow, type TourRowForTaxonomy, type TripRowForTaxonomy } from "./run-plan";
import { FORMATOS, TEMAS, type ClassifyInput, type FormatoOEstado } from "./types";

export type Origen = "manual" | "regla" | "proveedor";
export interface LineageRow extends TaxonomyRow {
  origin: Origen; sourceField: string | null; sourceValue: string | null; matchedTerm: string | null; sourceRawHash: string | null;
}

/** REQ-754: bandera del recálculo con linaje (requiere TAXONOMY_SYNC_ENABLED y las migraciones 0022 y 0023). */
export function taxonomyLineageEnabled(env: { TAXONOMY_LINEAGE_ENABLED?: string }): boolean {
  return env.TAXONOMY_LINEAGE_ENABLED === "true";
}

/** Nombre del campo del proveedor detrás de cada dato que usa el clasificador. */
interface Campos { categoria: string; titulo: string; resumen: string; precio: string; minutos: string; dias: string; fuente: string; idiomas: string; modos: string; vuelo: string; resenas: string }
const TOUR_CAMPOS: Campos = {
  categoria: "categoryId", titulo: "title.es|title.en", resumen: "title|brief", precio: "price.value", minutos: "length", dias: "length",
  fuente: "categoryId", idiomas: "guideLanguages", modos: "", vuelo: "", resenas: "rating|reviewsNumber",
};
const TRIP_CAMPOS: Campos = {
  categoria: "trip.kind", titulo: "trip.titleEs|trip.titleEn", resumen: "trip.titleEs|trip.titleEn", precio: "trip.priceFrom", minutos: "trip.durationDays",
  dias: "trip.durationDays", fuente: "trip.category", idiomas: "trip.languages", modos: "trip.options[].mode", vuelo: "trip.flightsIncluded", resenas: "",
};

/** La primera palabra clave (tal cual está en el diccionario) que coincide con el texto normalizado. */
// REQ-751
export function firstKeyword(words: readonly string[] | undefined, normalizedText: string): string | null {
  for (const w of words ?? []) { const rx = keywordRegex([w]); if (rx && rx.test(normalizedText)) return w; }
  return null;
}

type Src = Pick<LineageRow, "sourceField" | "sourceValue" | "matchedTerm">;
const none: Src = { sourceField: null, sourceValue: null, matchedTerm: null };

function provenance(row: TaxonomyRow, input: ClassifyInput, dict: Dictionary, c: Campos, category: { field: string; value: string; matched: string | null }): Src {
  const r = row.ruleId;
  const titulo = norm(input.titulo);
  const todo = norm(`${input.titulo} ${input.resumen ?? ""}`);
  const fmt = (slug: FormatoOEstado) => dict.terminos.find((t): t is TerminoFormato => t.eje === "formato" && t.slug === slug);
  const tema = (slug: string) => dict.terminos.find((t): t is TerminoTema => t.eje === "tema" && t.slug === slug);
  const attr = (slug: string) => dict.terminos.find((t): t is TerminoAtributo => t.eje === "atributo" && t.slug === slug);
  const cat: Src = { sourceField: category.field, sourceValue: category.value, matchedTerm: category.matched };
  const enTitulo = (words: readonly string[] | undefined, text = titulo): Src => ({ sourceField: c.titulo, sourceValue: input.titulo, matchedTerm: firstKeyword(words, text) });

  if (row.axis === "seccion") return none; // se deriva del formato
  if (row.axis === "formato") {
    if (/^#6 precio 0/.test(r)) return { sourceField: c.precio, sourceValue: String(input.precio), matchedTerm: null };
    if (/^#7 ≥1440 min|^#8 ≥360 min \(G-T7 B\)/.test(r)) return { sourceField: c.minutos, sourceValue: String(input.durationMinutes ?? input.durationDays), matchedTerm: null };
    if (/^#7 2\+ días/.test(r)) return { sourceField: c.dias, sourceValue: String(input.durationDays), matchedTerm: null };
    if (/^#7 «N días»/.test(r)) return enTitulo(fmt("circuito")?.palabras);
    if (/^#8 .*palabra de salida/.test(r)) return enTitulo(fmt("excursion-dia")?.palabras);
    if (/^#1 palabra traslado/.test(r)) return { ...enTitulo(fmt("traslado")?.palabras, todo), sourceField: `${c.titulo}+${c.resumen}` };
    if (/^#2 palabra/.test(r)) return enTitulo(fmt("transporte")?.palabras);
    if (/^#4 palabra/.test(r)) return enTitulo(fmt("entradas")?.palabras);
    if (/^#10 clase o taller/.test(r)) return { ...enTitulo(fmt("experiencia-unica")?.palabras, todo), sourceField: `${c.titulo}+${c.resumen}` };
    return cat; // base, fijo, #0 o «sin mapeo»: la categoría del proveedor
  }
  if (row.axis === "tema") {
    if (r.startsWith("categoría ")) return cat;
    if (r.startsWith("fuente ")) return { sourceField: c.fuente, sourceValue: r.slice("fuente ".length), matchedTerm: null };
    const t = tema(row.term);
    if (r === "palabra en el título") return enTitulo(t?.palabras, without(titulo, t?.excluir));
    if (r === "palabra en el resumen") return { ...enTitulo(t?.palabras, without(todo, t?.excluir)), sourceField: `${c.titulo}+${c.resumen}` };
    return none;
  }
  // atributos
  if (r.startsWith("categoría ")) return cat;
  if (r === "palabra en el título") {
    if (row.term.startsWith("medio:")) return enTitulo(attr("medio")?.valores?.find((v) => v.slug === row.term.slice(6))?.palabras);
    return enTitulo(attr(row.term)?.palabras);
  }
  if (r === "idioma declarado") return { sourceField: c.idiomas, sourceValue: (input.idiomas ?? []).join(","), matchedTerm: "es" };
  if (r === "opción privada del viaje") return { sourceField: c.modos, sourceValue: "private", matchedTerm: null };
  if (r === "reseñas reales" || r.startsWith("G-T1")) return { sourceField: c.resenas, sourceValue: `${input.calificacion ?? ""}|${input.resenas ?? ""}`, matchedTerm: null };
  if (r === "flightsIncluded") return { sourceField: c.vuelo, sourceValue: "true", matchedTerm: null };
  return none;
}

function withLineage(rows: TaxonomyRow[], input: ClassifyInput, dict: Dictionary, c: Campos, category: { field: string; value: string; matched: string | null }, rawHash: string | null): LineageRow[] {
  return rows.map((row) => ({ ...row, origin: "regla" as const, ...provenance(row, input, dict, c, category), sourceRawHash: rawHash }));
}

// REQ-751
export function lineageForTour(t: TourRowForTaxonomy, dict: Dictionary, mappings: Record<string, Mapping>, o: { rawHash?: string | null; gates?: Gates }): LineageRow[] {
  const input = tourToInput(t);
  const rows = rowsFor("tour", t.id, classify(input, dict, mappings, o.gates ?? DEFAULT_GATES));
  return withLineage(rows, input, dict, TOUR_CAMPOS, { field: "categoryId", value: String(t.categoryId), matched: null }, o.rawHash ?? null);
}

export interface TripOriginal { provider: string; field: string; value: string; matchedTerm: string | null; rawHash: string | null }

// REQ-751, REQ-753
export function lineageForTrip(
  t: TripRowForTaxonomy, original: TripOriginal | null, dict: Dictionary, mappings: Record<string, Mapping>, agency: Record<string, Mapping>, o: { gates?: Gates },
): LineageRow[] {
  const gates = o.gates ?? DEFAULT_GATES;
  const base = tripToInput(t);
  const am = original ? agency[original.provider] : undefined;
  const known = am?.categorias.find((x) => x.id === original!.value && x.formato !== "por-revisar");
  if (original && am && known) {
    // El mapeo de la agencia hereda las fuentes de tema del propio (Trip.category sigue sumando temas).
    const merged = { ...mappings, [am.proveedor]: { ...am, temasPorFuente: { ...(mappings.propios?.temasPorFuente ?? {}), ...(am.temasPorFuente ?? {}) } } };
    const input: ClassifyInput = { ...base, proveedor: am.proveedor, categoriaId: original.value };
    const r = classify(input, dict, merged, gates);
    if (r.formato !== "por-revisar") {
      return withLineage(rowsFor("trip", t.id, r), input, dict, TRIP_CAMPOS, { field: original.field, value: original.value, matched: original.matchedTerm }, original.rawHash);
    }
  }
  const rows = rowsFor("trip", t.id, classify(base, dict, mappings, gates));
  return withLineage(rows, base, dict, TRIP_CAMPOS, { field: "trip.kind", value: t.kind, matched: null }, original?.rawHash ?? null);
}

export interface OverrideLike { axis: TaxonomyRow["axis"]; term: string; action: "add" | "remove"; by: string; note: string }
export interface Declared { formato?: string; temas?: string[] }

const isFormato = (s: string) => (FORMATOS as readonly string[]).includes(s);
const isTema = (s: string) => (TEMAS as readonly string[]).includes(s);

/** REQ-754: aplica lo que declara el registro (si no hubo regla) y luego los overrides manuales. */
// REQ-754
export function applyPrecedence(rows: LineageRow[], dict: Dictionary, o: { declared?: Declared | null; overrides?: OverrideLike[] }): LineageRow[] {
  if (rows.length === 0) return rows;
  const head = rows[0];
  const mk = (axis: TaxonomyRow["axis"], term: string, origin: Origen, ruleId: string, src: Partial<Src> = {}): LineageRow => ({
    experienceKind: head.experienceKind, experienceId: head.experienceId, axis, term, ruleId, origin,
    sourceField: src.sourceField ?? null, sourceValue: src.sourceValue ?? null, matchedTerm: src.matchedTerm ?? null, sourceRawHash: head.sourceRawHash,
  });
  const setFormato = (list: LineageRow[], row: LineageRow) => {
    const rest = list.filter((r) => r.axis !== "formato" && r.axis !== "seccion");
    return [row, mk("seccion", formatoTerm(dict, row.term as FormatoOEstado).seccion, row.origin, `formato ${row.term}`), ...rest];
  };
  let out = [...rows];
  const formato = () => out.find((r) => r.axis === "formato")?.term;

  const d = o.declared;
  if (d?.formato && isFormato(d.formato) && formato() === "por-revisar") {
    out = setFormato(out, mk("formato", d.formato, "proveedor", "declarado por el registro", { sourceField: "taxonomia.formato", sourceValue: d.formato }));
  }
  const f = formato();
  if (d?.temas?.length && f !== "fuera" && f !== "por-revisar" && !out.some((r) => r.axis === "tema")) {
    for (const t of d.temas.filter(isTema).slice(0, 3)) out.push(mk("tema", t, "proveedor", "declarado por el registro", { sourceField: "taxonomia.temas", sourceValue: t }));
  }

  for (const ov of o.overrides ?? []) {
    const rule = `manual: ${ov.by}${ov.note ? ` · ${ov.note}` : ""}`;
    if (ov.action === "remove") { out = out.filter((r) => !(r.axis === ov.axis && r.term === ov.term)); continue; }
    if (ov.axis === "formato") { if (isFormato(ov.term) || ov.term === "fuera") out = setFormato(out, mk("formato", ov.term, "manual", rule)); continue; }
    out = out.filter((r) => !(r.axis === ov.axis && r.term === ov.term));
    out.push(mk(ov.axis, ov.term, "manual", rule));
  }
  return out;
}
