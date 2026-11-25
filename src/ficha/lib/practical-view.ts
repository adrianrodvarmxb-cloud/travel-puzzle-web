/**
 * REQ-10828, REQ-10829, REQ-10830 · Ficha única, ola 7, bloques 10 «Incluye / No incluye» (una columna si falta la
 * otra), 11 «Punto de encuentro y mapa» (punto exacto con «Cómo llegar», o círculo de «Zona aproximada» sin botón;
 * decisión 28, REQ-10606) y 12 «Opciones y precios» (tarjetas por opción, con y sin traslado; oculto con una sola).
 * Los adicionales del proveedor llegan en la ola 12 (REQ-10636). Sin dato, el bloque no sale; nunca «N/D». Puro.
 */
import type { FichaLang, FichaMeeting, FichaOption } from "./model";
import { formatAmount, localPriceUrl } from "./local-price";

const clean = (items: string[]) => [...new Set(items.map((s) => s.trim()).filter(Boolean))];

export interface IncludesView { includes: string[]; excludes: string[]; columns: 0 | 1 | 2 }

/** Bloque 10: dos columnas solo si hay las dos; con una, una columna; sin ninguna, no sale. */
// REQ-10828
export function includesView(includes: string[], excludes: string[]): IncludesView {
  const inc = clean(includes);
  const exc = clean(excludes);
  const columns = ((inc.length > 0 ? 1 : 0) + (exc.length > 0 ? 1 : 0)) as 0 | 1 | 2;
  return { includes: inc, excludes: exc, columns };
}

export type MeetingView =
  | { kind: "exact"; lat: number; lng: number; title: string | null; directionsUrl: string }
  | { kind: "zone"; lat: number; lng: number; radiusM: number; title: string | null }
  | { kind: "text"; title: string };

const validCoord = (lat: number, lng: number) =>
  Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);

/**
 * Bloque 11: punto exacto → mapa y «Cómo llegar»; zona → círculo sin botón (decisión 28); sin coordenadas válidas,
 * solo el texto del punto si lo hay; sin nada, null (el bloque no sale). Nunca un centro inventado (0,0).
 */
// REQ-10829
export function meetingView(m: FichaMeeting): MeetingView | null {
  const title = m.title?.trim() || null;
  if (m.kind === "exact" && validCoord(m.lat, m.lng)) {
    return { kind: "exact", lat: m.lat, lng: m.lng, title, directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${m.lat},${m.lng}` };
  }
  if (m.kind === "zone" && validCoord(m.lat, m.lng) && m.radiusM > 0) {
    return { kind: "zone", lat: m.lat, lng: m.lng, radiusM: m.radiusM, title };
  }
  return title ? { kind: "text", title } : null;
}

export interface OptionCard {
  id: string;
  name: string;
  /** Precio en la moneda del proveedor, igual para todos (el HTML va en caché, REQ-3318). */
  priceLabel: string | null;
  /** REQ-10879: ruta para que el navegador pida el precio en la moneda del visitante; null = no se pide. */
  localUrl: string | null;
  transfer: string | null;
  startTime: string | null;
}

interface OptionCopy { per: Record<"person" | "group" | "total", string>; withTransfer: string; withoutTransfer: string }
const OPTION_COPY: Record<FichaLang, OptionCopy> = {
  es: { per: { person: "por persona", group: "por grupo", total: "en total" }, withTransfer: "Con traslado", withoutTransfer: "Sin traslado" },
  en: { per: { person: "per person", group: "per group", total: "in total" }, withTransfer: "With transfer", withoutTransfer: "Without transfer" },
  pt: { per: { person: "por pessoa", group: "por grupo", total: "no total" }, withTransfer: "Com traslado", withoutTransfer: "Sem traslado" },
  fr: { per: { person: "par personne", group: "par groupe", total: "au total" }, withTransfer: "Avec transfert", withoutTransfer: "Sans transfert" },
  de: { per: { person: "pro Person", group: "pro Gruppe", total: "insgesamt" }, withTransfer: "Mit Transfer", withoutTransfer: "Ohne Transfer" },
  it: { per: { person: "a persona", group: "a gruppo", total: "in totale" }, withTransfer: "Con transfer", withoutTransfer: "Senza transfer" },
};

/**
 * Bloque 12: una tarjeta por opción con su precio final (el del modelo, que solo trae precios públicos; nunca el neto),
 * «Con / Sin traslado» solo si el proveedor lo dice. Con una opción o ninguna, lista vacía: el bloque no sale.
 * REQ-10879 (ola 9, decisión 32): el texto va en la moneda del proveedor (igual para todos) y, con `localCurrency`,
 * cada opción con precio lleva `localUrl` para que el navegador pida su precio local a `/api/precio-local`, como el
 * panel (REQ-10874); sin precio no hay nada que convertir.
 */
// REQ-10830 REQ-10879
export function optionCards(options: FichaOption[], lang: FichaLang, opts: { localCurrency?: boolean } = {}): OptionCard[] {
  if (options.length <= 1) return [];
  const c = OPTION_COPY[lang] ?? OPTION_COPY.es;
  return options
    .filter((o) => o.name.trim() !== "")
    .map((o) => ({
      id: o.id,
      name: o.name.trim(),
      priceLabel: o.price && o.price.amount > 0 ? `${formatAmount(o.price.amount, o.price.currency, lang)} ${c.per[o.price.per]}` : null,
      localUrl: opts.localCurrency && o.price && o.price.amount > 0 ? localPriceUrl(o.price, lang) : null, // REQ-10879
      transfer: o.transferIncluded === null ? null : o.transferIncluded ? c.withTransfer : c.withoutTransfer,
      startTime: o.startTime?.trim() || null,
    }));
}

type PracticalHeading = "incluye" | "noIncluye" | "puntoDeEncuentro" | "opciones" | "comoLlegar" | "zona" | "zonaNota";
const HEADINGS: Record<PracticalHeading, Record<FichaLang, string>> = {
  incluye: { es: "Incluye", en: "Included", pt: "Inclui", fr: "Inclus", de: "Inklusive", it: "Incluso" },
  noIncluye: { es: "No incluye", en: "Not included", pt: "Não inclui", fr: "Non inclus", de: "Nicht inklusive", it: "Non incluso" },
  puntoDeEncuentro: { es: "Punto de encuentro", en: "Meeting point", pt: "Ponto de encontro", fr: "Point de rendez-vous", de: "Treffpunkt", it: "Punto d'incontro" },
  opciones: { es: "Opciones y precios", en: "Options and prices", pt: "Opções e preços", fr: "Options et prix", de: "Optionen und Preise", it: "Opzioni e prezzi" },
  comoLlegar: { es: "Cómo llegar", en: "Get directions", pt: "Como chegar", fr: "Itinéraire", de: "Route", it: "Indicazioni" },
  zona: { es: "Zona aproximada", en: "Approximate area", pt: "Área aproximada", fr: "Zone approximative", de: "Ungefähres Gebiet", it: "Zona approssimativa" },
  zonaNota: { es: "el punto exacto se confirma al reservar.", en: "the exact point is confirmed when you book.", pt: "o ponto exato é confirmado na reserva.", fr: "le point exact est confirmé à la réservation.", de: "der genaue Ort wird bei der Buchung bestätigt.", it: "il punto esatto viene confermato alla prenotazione." },
};

/** Textos de los bloques 10–12 en el idioma del sitio. */
// REQ-10828 REQ-10829 REQ-10830
export const practicalText = (key: PracticalHeading, lang: FichaLang): string => HEADINGS[key][lang] ?? HEADINGS[key].es;
