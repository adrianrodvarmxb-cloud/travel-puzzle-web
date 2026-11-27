/**
 * REQ-10780 · Plan §3: qué bloques de los 21 salen y en qué orden, decidido por dato (nunca por proveedor) y por las
 * reglas firmadas que sí dependen del proveedor: «En breve» oculto en FREETOUR (REQ-570), preguntas frecuentes en
 * FREETOUR solo tras la revisión de cumplimiento (plan, punto abierto 1), Mila apagada en FREETOUR (decisión 42),
 * Kiwitaxi nunca en FREETOUR (decisión 29). Si falta el dato, el bloque no sale; nunca «N/D». Puro.
 */
import type { FichaModel } from "./model";

export const BLOCK_ORDER = [
  "migas", "galeria", "titulo", "taxonomia", "datos-clave", "en-breve", "destacado", "descripcion", "itinerario",
  "incluye", "punto-de-encuentro", "opciones", "antes-de-ir", "condiciones", "informacion-importante",
  "preguntas", "mila", "resenas", "completa-tu-viaje", "otras-experiencias", "garantias",
] as const;
export type BlockId = (typeof BLOCK_ORDER)[number];

export const FREETOUR_PROVIDER = "freetour";

export interface BlockContext {
  /** Hay reseñas cargadas para pintar (llegan aparte del modelo). */
  reviews: number;
  /** Preguntas armadas con datos reales (lib/faq.ts); menos de tres, oculto. */
  faq: number;
  /** Tarjetas de «Completa tu viaje» (transporte por ubicación) y de otras experiencias. */
  crossSell: number;
  others: number;
  /** Banderas: Mila en la ficha; preguntas en FREETOUR tras la revisión de cumplimiento. */
  milaEnabled: boolean;
  freetourFaqEnabled: boolean;
}

export const FAQ_MIN = 3;

const has = (v: unknown[] | string | null | undefined) => (Array.isArray(v) ? v.length > 0 : !!v);

/** ¿Sale el bloque para esta ficha? Una regla por bloque, por dato. */
// REQ-10780
export function blockVisible(id: BlockId, f: FichaModel, c: BlockContext): boolean {
  const freetour = f.provider === FREETOUR_PROVIDER;
  switch (id) {
    case "migas": return true;
    case "galeria": return f.gallery.length > 0;
    case "titulo": return true;
    case "taxonomia": return !!f.taxonomy.tipo || f.taxonomy.temas.length > 0 || f.taxonomy.atributos.length > 0;
    case "datos-clave": return f.facts.durationMinutes !== null || !!f.facts.schedule || f.facts.languages.length > 0 || !!f.facts.season || f.facts.difficulty !== null || !!f.facts.ages;
    case "en-breve": return !freetour && has(f.brief);
    case "destacado": return f.highlights.length > 0;
    case "descripcion": return has(f.descriptionHtml);
    case "itinerario": return f.itinerary.length > 0;
    case "incluye": return f.includes.length > 0 || f.excludes.length > 0;
    case "punto-de-encuentro": return f.meeting.kind !== "none" || has(f.meeting.title);
    case "opciones": return f.options.length > 1;
    case "antes-de-ir": return f.whatToBring.length > 0 || f.requirements.length > 0;
    case "condiciones": return true; // una sola cancelación y «Cómo funciona tu reserva» (decisiones 33 y 34) siempre
    case "informacion-importante": return f.notes.length > 0 || !!f.operator;
    case "preguntas": return c.faq >= FAQ_MIN && (!freetour || c.freetourFaqEnabled);
    case "mila": return c.milaEnabled && !freetour;
    case "resenas": return c.reviews > 0;
    case "completa-tu-viaje": return c.crossSell > 0;
    case "otras-experiencias": return c.others > 0;
    case "garantias": return true;
  }
}

/** Bloques visibles en el orden fijo del plan. */
// REQ-10780
export function visibleBlocks(f: FichaModel, c: BlockContext): BlockId[] {
  return BLOCK_ORDER.filter((id) => blockVisible(id, f, c));
}

/** Los traslados usan la misma plantilla con menos bloques (plan §3): sin itinerario, opciones ni antes de ir. */
export const TRANSFER_HIDDEN: ReadonlySet<BlockId> = new Set(["itinerario", "antes-de-ir"]);

// REQ-10780
export function blocksFor(f: FichaModel, c: BlockContext): BlockId[] {
  const all = visibleBlocks(f, c);
  return f.section === "traslados" ? all.filter((b) => !TRANSFER_HIDDEN.has(b)) : all;
}
