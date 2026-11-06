/** Encabezado de la ficha: el H1 es el título real del proveedor. Puro. */
import { PRIMERA_PIEZA_LABEL } from "./menu";

export interface TourHeading { h1: string; provider: string | null; collection: string | null }

// REQ-094: «La Primera Pieza» solo nombra la colección; nunca reemplaza ni se agrega al título.
export function tourHeading({ title, provider, isFreeTour }: { title: string; provider: string | null; isFreeTour: boolean }): TourHeading {
  return {
    h1: title.replace(/\s+/g, " ").trim(),
    provider: provider?.trim() || null,
    collection: isFreeTour ? PRIMERA_PIEZA_LABEL : null,
  };
}
