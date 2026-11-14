/**
 * REQ-522: formato (Eje A de la taxonomía) de cada tarjeta, con el clasificador oficial (src/taxonomy/lib/format.ts),
 * el diccionario y los mapeos por defecto. Puro, pero importa los JSON de la taxonomía: se llama en el servidor
 * (inicio, /destinos, acción de /tours, tarjetas de viajes) y al cliente solo llega el slug.
 */
import { DEFAULT_DICTIONARY, DEFAULT_MAPPINGS } from "@/taxonomy/data";
import { classifyFormato } from "@/taxonomy/lib/format";
import { DEFAULT_GATES } from "@/taxonomy/lib/gates";
import type { FormatoOEstado } from "@/taxonomy/lib/types";

export interface CatalogTourFormatInput {
  categoryId: number | null | undefined;
  price: number | string | null | undefined;
  durationMinutes: number | null | undefined;
  /** Títulos que haya (es, en…); se juntan para las reglas por palabra. */
  titles: readonly (string | null | undefined)[];
  /** REQ-1253: nombres de la ciudad base. */
  cities?: readonly string[];
}

const joinTitles = (titles: readonly (string | null | undefined)[]) => titles.filter((t): t is string => !!t && !!t.trim()).join(" · ");

/** REQ-10515: proveedor con mapeo propio; sin mapeo (o sin proveedor), el de FREETOUR (valor por defecto de la base). */
// REQ-10515
export function mappedProvider(provider: string | null | undefined): string {
  return provider && DEFAULT_MAPPINGS[provider] ? provider : "freetour";
}

// REQ-522: tours del catálogo (FREETOUR por defecto; REQ-10515: cualquier providerId con mapeo, p. ej. «tangol»).
export function catalogTourFormat(t: CatalogTourFormatInput, provider: string | null | undefined = "freetour"): FormatoOEstado {
  const price = t.price === null || t.price === undefined ? null : Number(t.price);
  const p = mappedProvider(provider);
  return classifyFormato(
    { proveedor: p, categoriaId: t.categoryId ?? null, precio: Number.isFinite(price) ? price : null, durationMinutes: t.durationMinutes ?? null, titulo: joinTitles(t.titles), ciudades: t.cities },
    DEFAULT_DICTIONARY, DEFAULT_MAPPINGS[p], DEFAULT_GATES,
  ).valor;
}

export interface TripFormatInput {
  kind: string;
  priceFrom: number | null | undefined;
  durationDays: number | null | undefined;
  titles: readonly (string | null | undefined)[];
  /** REQ-453: el viaje ya entra a «Excursiones de un día» por la regla REQ-451. */
  dayTrip?: boolean;
  /** REQ-535: resumen (y descripción) del viaje: dice si sale de la ciudad base. */
  resumen?: string | null;
}

/**
 * REQ-522: viajes propios y de agencias (mapeo «propios»: categoría = kind).
 * Si el clasificador deja un viaje de un día en «tour» pero REQ-451 ya lo puso en el carrusel de excursiones,
 * la tarjeta dice «Excursión de un día»: la insignia no puede contradecir al carrusel (caso «Versalles esencial»).
 */
export function tripFormat(t: TripFormatInput): FormatoOEstado {
  return tripFormatDecision(t).valor;
}

/** REQ-1348: el mismo formato con su regla (una regla «duda:» va a la lista de dudas del PO). */
export function tripFormatDecision(t: TripFormatInput): { valor: FormatoOEstado; regla: string } {
  const d = classifyFormato(
    { proveedor: "propios", categoriaId: t.kind, precio: t.priceFrom ?? null, durationDays: t.durationDays ?? null, titulo: joinTitles(t.titles), resumen: t.resumen ?? undefined },
    DEFAULT_DICTIONARY, DEFAULT_MAPPINGS.propios, DEFAULT_GATES,
  );
  const f = d.valor;
  return { valor: (f === "tour" || f === "visita-guiada" || f === "caminata") && t.dayTrip ? "excursion-dia" : f, regla: d.regla }; // REQ-1250
}

/** REQ-522: formato por id para las tarjetas de /tours (lo arma la acción del servidor, como los precios). */
export function cardFormatsFor(rows: readonly ({ id: string } & CatalogTourFormatInput & { providerId?: string | null })[]): Record<string, FormatoOEstado> {
  const out: Record<string, FormatoOEstado> = {};
  for (const r of rows) out[r.id] = catalogTourFormat(r, r.providerId); // REQ-10515: mappedProvider resuelve el mapeo
  return out;
}
