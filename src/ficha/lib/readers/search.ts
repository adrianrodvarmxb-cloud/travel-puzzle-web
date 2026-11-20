/** REQ-10826 · Lector del buscador y las tarjetas: núcleo común + lo que cabe en una tarjeta. Puro. */
import type { FichaModel, FichaRating, FichaTerm } from "../model";
import { commonFacts, type CommonFacts, type ReaderContext } from "./common";

export interface SearchRead {
  common: CommonFacts;
  image: string | null;
  /** Nota pública o null (decisión 18: la de Tangol no llega a la tarjeta). */
  rating: FichaRating | null;
  tipo: FichaTerm | null;
  section: FichaModel["section"];
}

// REQ-10826
export function readSearch(f: FichaModel, ctx: ReaderContext): SearchRead {
  return { common: commonFacts(f, ctx), image: f.gallery[0]?.url ?? null, rating: f.rating && f.rating.value !== null ? f.rating : null, tipo: f.taxonomy.tipo, section: f.section };
}
