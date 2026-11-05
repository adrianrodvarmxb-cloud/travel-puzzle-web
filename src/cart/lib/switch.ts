/**
 * REQ-105: interruptor automático por tipo y ciudad.
 * api con inventario → «Reservar»; deeplink con inventario → «Ver opciones»;
 * sin adaptador, sin inventario o si falla → asesor por WhatsApp con datos prellenados;
 * sin asesor → la tarjeta no se muestra. Nunca hay botón de reserva sin inventario.
 * Puro: las sondas reciben el adaptador por parámetro.
 */
import type { AdapterMode, CartItemType, People } from "./item";
import type { ProviderAdapter, SearchQuery } from "./adapter";

export type ProbeResult = "inventory" | "empty" | "error";

export interface AdapterProbe {
  adapterId: string;
  mode: AdapterMode;
  chargedBy: string;
  result: ProbeResult;
  /** Enlace de afiliado (deeplink) ya con subID. */
  url?: string;
}

export type CardAction =
  | { kind: "book"; label: "Reservar"; adapterId: string }
  | { kind: "deeplink"; label: "Ver opciones"; adapterId: string; url: string }
  | { kind: "whatsapp"; label: "Te lo cotiza tu asesor por WhatsApp"; url: string };

export interface QuoteContext { cityName: string; dateFrom: string; dateTo?: string; people: People }
export interface Advisor { whatsapp: string | null | undefined }

export const TYPE_LABELS: Record<CartItemType | "etias", string> = {
  free_tour: "un free tour", tour: "un tour", day_trip: "una excursión de un día", transfer: "un traslado", esim: "una eSIM",
  tickets: "entradas a atracciones", insurance: "un seguro de viaje", transport: "transporte entre ciudades",
  lodging: "alojamiento", car_rental: "renta de auto", visa: "asesoría de visa", etias: "el trámite ETIAS",
};

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
/** Fecha legible sin Intl (render determinista, INC-001). */
export function shortDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : iso;
}

function peopleText({ adults, children }: People): string {
  const a = `${adults} ${adults === 1 ? "adulto" : "adultos"}`;
  return children > 0 ? `${a} y ${children} ${children === 1 ? "menor" : "menores"}` : a;
}

/** REQ-105: mensaje prellenado con ciudad, fechas y personas. */
export function quoteMessage(type: CartItemType | "etias", ctx: QuoteContext): string {
  const dates = ctx.dateTo && ctx.dateTo !== ctx.dateFrom
    ? `del ${shortDate(ctx.dateFrom)} al ${shortDate(ctx.dateTo)}`
    : `el ${shortDate(ctx.dateFrom)}`;
  return `Hola Travel Puzzle, quiero cotizar ${TYPE_LABELS[type]} en ${ctx.cityName} ${dates} para ${peopleText(ctx.people)}.`;
}

function whatsappLink(number: string, text: string): string {
  return `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}

/** REQ-105: elige la acción de la tarjeta; null = no se muestra. */
export function chooseAction(type: CartItemType | "etias", probes: AdapterProbe[], advisor: Advisor, ctx: QuoteContext): CardAction | null {
  // REQ-107: el seguro nunca se vende directo: solo deeplink o asesor.
  const usable = probes.filter((p) => p.result === "inventory" && !(type === "insurance" && p.mode === "api"));
  const api = usable.find((p) => p.mode === "api");
  if (api) return { kind: "book", label: "Reservar", adapterId: api.adapterId };
  const deep = usable.find((p) => p.mode === "deeplink" && p.url);
  if (deep) return { kind: "deeplink", label: "Ver opciones", adapterId: deep.adapterId, url: deep.url! };
  const number = advisor.whatsapp?.replace(/\D/g, "");
  if (number) return { kind: "whatsapp", label: "Te lo cotiza tu asesor por WhatsApp", url: whatsappLink(number, quoteMessage(type, ctx)) };
  return null;
}

/** REQ-105: pregunta al adaptador si hay inventario en esa ciudad; cualquier fallo cuenta como error. */
export async function probeAdapter(adapter: ProviderAdapter, q: SearchQuery): Promise<AdapterProbe> {
  const base = { adapterId: adapter.id, mode: adapter.mode, chargedBy: adapter.chargedBy };
  try {
    const offers = await adapter.search(q);
    if (offers.length === 0) return { ...base, result: "empty" };
    const avail = await adapter.availability(offers[0].externalId, q);
    return { ...base, result: avail.available ? "inventory" : "empty", url: offers[0].url };
  } catch {
    return { ...base, result: "error" };
  }
}
