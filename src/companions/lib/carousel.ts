/**
 * REQ-108 / REQ-109: carrusel de acompañamiento «Ya tienes tu primera pieza. ¿Armamos las demás?».
 * Máx. 3 tarjetas en móvil y 4 en escritorio, de categorías distintas; la primera siempre es un tour
 * de pago o de día; cada tarjeta dice quién cobra; alojamiento al final; nada preseleccionado.
 * Las reglas por destino son datos (rules.json), sin código por país. Visa y ETIAS tras bandera. Puro.
 */
import { z } from "zod";
import type { CartItemType } from "@/cart/lib/item";
import type { CardAction } from "@/cart/lib/switch";
import defaultRules from "../rules.json";

export type CompanionCategory = Exclude<CartItemType, "free_tour"> | "etias";
const CATEGORIES = ["tour", "day_trip", "transfer", "esim", "tickets", "insurance", "transport", "lodging", "car_rental", "visa", "etias"] as const;

/** REQ-108: orden base. Visa y ETIAS (tras bandera) van antes del alojamiento. */
export const BASE_ORDER: CompanionCategory[] = ["tour", "day_trip", "transfer", "esim", "tickets", "insurance", "transport", "car_rental", "lodging"];
const RANK_ORDER: CompanionCategory[] = [...BASE_ORDER.filter((c) => c !== "lodging"), "visa", "etias", "lodging"];
const TOUR_GROUP = new Set<CompanionCategory>(["tour", "day_trip"]);
export const MAX_CARDS = { mobile: 3, desktop: 4 } as const;

const zCategory = z.enum(CATEGORIES);
const zRule = z.object({
  id: z.string().min(1),
  when: z.object({
    country: z.array(z.string().length(2)).optional(),
    travelerInCountry: z.boolean().optional(),
    freeTourWithinHours: z.number().positive().optional(),
  }),
  priority: z.array(zCategory).optional(),
  hide: z.array(zCategory).optional(),
});
export type CarouselRule = z.infer<typeof zRule>;

/** REQ-109: valida reglas que vienen de datos (JSON); una regla mala no entra. */
export function parseRules(raw: unknown): CarouselRule[] {
  return z.array(zRule).parse(raw);
}
export const DEFAULT_RULES: CarouselRule[] = parseRules(defaultRules);

export interface CarouselCandidate {
  type: CartItemType;
  /** Por defecto = type. ETIAS es categoría propia aunque su pieza sea de tipo visa. */
  category?: CompanionCategory;
  title: string;
  chargedBy: string;
  /** Del interruptor (REQ-105); null = sin inventario ni asesor. */
  action: CardAction | null;
}

export interface CarouselCard extends CarouselCandidate {
  category: CompanionCategory;
  chargedByLabel: string;
  selected: false;
}

export interface CarouselContext {
  /** ISO-2 del destino. */
  country: string;
  cityCode: string;
  /** ISO-2 del país donde está el viajero (si se sabe). */
  travelerCountry?: string;
  /** Fecha y hora del free tour confirmado (ISO 8601). */
  freeTourAt?: string;
  now: number;
}

export interface CarouselFlags { visa?: boolean; etias?: boolean }

function matches(rule: CarouselRule, ctx: CarouselContext): boolean {
  const { country, travelerInCountry, freeTourWithinHours } = rule.when;
  if (country && !country.includes(ctx.country.toUpperCase())) return false;
  if (travelerInCountry !== undefined && (ctx.travelerCountry?.toUpperCase() === ctx.country.toUpperCase()) !== travelerInCountry) return false;
  if (freeTourWithinHours !== undefined) {
    const at = ctx.freeTourAt ? Date.parse(ctx.freeTourAt) : NaN;
    const hours = (at - ctx.now) / 3_600_000;
    if (!(hours >= 0 && hours < freeTourWithinHours)) return false;
  }
  return true;
}

/** REQ-108: quién cobra, en palabras del cliente. */
export function chargedByLabel(c: Pick<CarouselCandidate, "action" | "chargedBy">): string {
  return c.action?.kind === "whatsapp" ? "Te lo cotiza tu asesor de Travel Puzzle" : `Lo reservas con ${c.chargedBy}`;
}

const groupOf = (c: CompanionCategory) => (TOUR_GROUP.has(c) ? "tour" : c);

/** REQ-108 / REQ-109: arma el carrusel. Sin tour de pago o de día no hay carrusel. */
export function buildCarousel(input: {
  candidates: CarouselCandidate[];
  context: CarouselContext;
  device: "mobile" | "desktop";
  rules: CarouselRule[];
  flags: CarouselFlags;
}): CarouselCard[] {
  const active = input.rules.filter((r) => matches(r, input.context));
  const hidden = new Set<CompanionCategory>(active.flatMap((r) => r.hide ?? []));
  if (!input.flags.visa) hidden.add("visa");
  if (!input.flags.etias) hidden.add("etias");

  const priority = [...new Set(active.flatMap((r) => r.priority ?? []))];
  const rank = (c: CompanionCategory) => {
    if (c === "lodging") return Number.MAX_SAFE_INTEGER; // siempre al final
    const p = priority.indexOf(c);
    return p >= 0 ? p : priority.length + RANK_ORDER.indexOf(c);
  };

  const sorted = input.candidates
    .map((c) => ({ ...c, category: c.category ?? (c.type as CompanionCategory) }))
    .filter((c) => c.type !== "free_tour" && c.action !== null && !hidden.has(c.category))
    .map((c, i) => ({ c, i }))
    .sort((a, b) => rank(a.c.category) - rank(b.c.category) || a.i - b.i)
    .map(({ c }) => c);

  const seen = new Set<string>();
  const distinct = sorted.filter((c) => !seen.has(groupOf(c.category)) && seen.add(groupOf(c.category)));

  const firstTour = distinct.findIndex((c) => TOUR_GROUP.has(c.category));
  if (firstTour < 0) return [];
  const ordered = [distinct[firstTour], ...distinct.filter((_, i) => i !== firstTour)];

  return ordered.slice(0, MAX_CARDS[input.device]).map((c) => ({ ...c, chargedByLabel: chargedByLabel(c), selected: false as const }));
}
