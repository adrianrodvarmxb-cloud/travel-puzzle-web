import { z } from "zod";
import type { CatalogPlan, PlanOption, PlanProduct } from "./catalog";
import type { OctoAvailability } from "./schemas";
import { guestPrice } from "./pricing";

/**
 * Ola 3: compra directa de Big Bus. Lógica pura: validar lo que pide el cliente contra el plan del catálogo,
 * elegir la disponibilidad y calcular el total al precio retail (lo que cobra Big Bus en la ciudad).
 */

export const MAX_UNITS = 20;
/** Stripe exige que una sesión dure al menos 30 minutos; se pide 31 y el apartado dura 45 (HOLD_MINUTES). */
export const STRIPE_SESSION_MINUTES = 31;
/** Monedas que hoy se pueden cobrar en pesos con el tipo de cambio de Banxico (gate B1). */
export const CHARGEABLE = ["MXN", "USD", "EUR"] as const;

export const purchaseInputSchema = z.object({
  ref: z.string().regex(/^[A-Z]{3}$/),
  productId: z.string().min(1).max(200),
  optionId: z.string().min(1).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  units: z
    .array(z.object({ id: z.string().min(1).max(200), quantity: z.number().int().min(1).max(MAX_UNITS) }))
    .min(1)
    .max(10),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().min(6).max(30),
  language: z.enum(["es", "en"]).default("es"),
  consent: z.literal(true),
});
export type PurchaseInput = z.output<typeof purchaseInputSchema>;

export type PlanCheck =
  | { ok: true; product: PlanProduct; option: PlanOption }
  | { ok: false; code: "not_found" | "bad_units" | "past_date" };

/** Lo que pide el cliente existe en el plan vigente y las unidades son de esa opción. */
// REQ-3417
export function checkAgainstPlan(i: PurchaseInput, plan: CatalogPlan | null, today: string): PlanCheck {
  if (i.date < today) return { ok: false, code: "past_date" };
  const product = plan?.cities.find((c) => c.ref === i.ref)?.products.find((p) => p.productId === i.productId);
  const option = product?.options.find((o) => o.optionId === i.optionId);
  if (!product || !option) return { ok: false, code: "not_found" };
  const ids = new Set(option.units.map((u) => u.id));
  const total = i.units.reduce((n, u) => n + u.quantity, 0);
  const dup = new Set(i.units.map((u) => u.id)).size !== i.units.length;
  if (dup || total < 1 || total > MAX_UNITS || i.units.some((u) => !ids.has(u.id))) return { ok: false, code: "bad_units" };
  return { ok: true, product, option };
}

const SELLABLE = new Set(["AVAILABLE", "FREESALE", "LIMITED"]);

/** Primera salida vendible de ese día, con precio final. Null si no hay. */
// REQ-3417
export function pickAvailability(list: OctoAvailability[], date: string): OctoAvailability | null {
  return (
    list.find((a) => a.available && SELLABLE.has(a.status) && a.localDateTimeStart.slice(0, 10) === date && a.pricing !== null) ?? null
  );
}

export type Total =
  | { ok: true; amount: number; currency: (typeof CHARGEABLE)[number] }
  | { ok: false; code: "unsupported_currency" | "no_price" };

/** Total al retail de la disponibilidad (precio final del día para esas personas). */
// REQ-3417
export function purchaseTotal(a: OctoAvailability): Total {
  if (!a.pricing) return { ok: false, code: "no_price" };
  const g = guestPrice(a.pricing);
  if (!(CHARGEABLE as readonly string[]).includes(g.currency)) return { ok: false, code: "unsupported_currency" };
  return { ok: true, amount: g.amount, currency: g.currency as (typeof CHARGEABLE)[number] };
}

/** Vencimiento de la sesión de Stripe en segundos Unix. */
// REQ-3418
export function stripeSessionExpiry(now: Date): number {
  return Math.floor(now.getTime() / 1000) + STRIPE_SESSION_MINUTES * 60;
}

/** Texto de personas para correo y panel (p. ej. «2 Adult, 1 Child»). */
export function unitsText(option: PlanOption, units: { id: string; quantity: number }[]): string {
  return units.map((u) => `${u.quantity} ${option.units.find((x) => x.id === u.id)?.name ?? u.id}`).join(", ");
}

/** Conteo de adultos y niños para la solicitud (TripRequest). */
export function paxCounts(option: PlanOption, units: { id: string; quantity: number }[]) {
  let adults = 0;
  let children = 0;
  let infants = 0;
  for (const u of units) {
    const t = option.units.find((x) => x.id === u.id)?.type ?? "ADULT";
    if (t === "CHILD" || t === "YOUTH") children += u.quantity;
    else if (t === "INFANT") infants += u.quantity;
    else adults += u.quantity;
  }
  return { adults, children, infants };
}
