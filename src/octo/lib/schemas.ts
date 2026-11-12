import { z } from "zod";

/**
 * Esquemas OCTO (estándar octo.travel, implementación de Ventrata). Solo los campos que usa Travel Puzzle;
 * el resto se ignora. Un registro malo se descarta y se cuenta, no tumba la lista (blindaje, punto 8).
 * Estados y formatos van como texto: Ventrata agrega valores (NO_SHOW, REBOOKED…) que no deben romper la lectura.
 */

export interface Parsed<T> {
  items: T[];
  discarded: number;
}

// REQ-3325
export function parseEach<S extends z.ZodTypeAny>(schema: S, list: unknown): Parsed<z.output<S>> {
  const arr = Array.isArray(list) ? list : [];
  const items: z.output<S>[] = [];
  let discarded = 0;
  for (const raw of arr) {
    const r = schema.safeParse(raw);
    if (r.success) items.push(r.data);
    else discarded++;
  }
  if (discarded > 0) console.warn(`[octo] ${discarded} registro(s) descartados por datos inválidos`);
  return { items, discarded };
}

const nstr = z.string().nullish().transform((v) => v ?? null);
const nnum = z.number().nullish().transform((v) => v ?? null);

/** Precio OCTO en unidades menores (centavos): original, retail (lo que paga el cliente) y net (lo que factura el operador). */
export const pricingSchema = z.object({
  original: z.number().int().nonnegative(),
  retail: z.number().int().nonnegative(),
  net: nnum,
  currency: z.string().length(3),
  currencyPrecision: z.number().int().min(0).max(4),
});
export type OctoPricing = z.output<typeof pricingSchema>;

export const unitSchema = z.object({
  id: z.string().min(1),
  internalName: z.string(),
  reference: nstr,
  type: z.string(),
  restrictions: z
    .object({ minAge: nnum, maxAge: nnum, minQuantity: nnum, maxQuantity: nnum, paxCount: nnum })
    .partial()
    .nullish()
    .transform((v) => v ?? {}),
  requiredContactFields: z.array(z.string()).nullish().transform((v) => v ?? []),
  pricingFrom: z.array(pricingSchema).nullish().transform((v) => v ?? []),
});
export type OctoUnit = z.output<typeof unitSchema>;

export const optionSchema = z.object({
  id: z.string().min(1),
  default: z.boolean().nullish().transform((v) => v ?? false),
  internalName: z.string(),
  reference: nstr,
  availabilityLocalStartTimes: z.array(z.string()).nullish().transform((v) => v ?? []),
  cancellationCutoff: nstr,
  cancellationCutoffAmount: nnum,
  cancellationCutoffUnit: nstr,
  requiredContactFields: z.array(z.string()).nullish().transform((v) => v ?? []),
  pricingFrom: z.array(pricingSchema).nullish().transform((v) => v ?? []),
  units: z.array(unitSchema),
});
export type OctoOption = z.output<typeof optionSchema>;

export const productSchema = z.object({
  id: z.string().min(1),
  internalName: z.string(),
  reference: nstr,
  locale: nstr,
  timeZone: nstr,
  allowFreesale: z.boolean().nullish().transform((v) => v ?? false),
  instantConfirmation: z.boolean().nullish().transform((v) => v ?? false),
  instantDelivery: z.boolean().nullish().transform((v) => v ?? false),
  availabilityRequired: z.boolean().nullish().transform((v) => v ?? true),
  availabilityType: z.string(),
  deliveryFormats: z.array(z.string()).nullish().transform((v) => v ?? []),
  deliveryMethods: z.array(z.string()).nullish().transform((v) => v ?? []),
  redemptionMethod: nstr,
  defaultCurrency: nstr,
  pricingPer: nstr,
  options: z.array(optionSchema).min(1),
});
export type OctoProduct = z.output<typeof productSchema>;

export const calendarDaySchema = z.object({
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  available: z.boolean(),
  status: z.string(),
  vacancies: nnum,
  capacity: nnum,
  pricingFrom: pricingSchema.nullish().transform((v) => v ?? null),
});
export type OctoCalendarDay = z.output<typeof calendarDaySchema>;

export const availabilitySchema = z.object({
  id: z.string().min(1),
  localDateTimeStart: z.string(),
  localDateTimeEnd: z.string(),
  utcCutoffAt: nstr,
  allDay: z.boolean().nullish().transform((v) => v ?? false),
  available: z.boolean(),
  status: z.string(),
  vacancies: nnum,
  pricing: pricingSchema.nullish().transform((v) => v ?? null),
  unitPricing: z
    .array(pricingSchema.extend({ unitId: z.string() }))
    .nullish()
    .transform((v) => v ?? []),
});
export type OctoAvailability = z.output<typeof availabilitySchema>;

const deliveryOptionSchema = z.object({ deliveryFormat: z.string(), deliveryValue: z.string().min(1) });
export const ticketSchema = z.object({
  deliveryOptions: z.array(deliveryOptionSchema).nullish().transform((v) => v ?? []),
});

export const bookingSchema = z.object({
  id: z.string().min(1),
  uuid: z.string().min(1),
  testMode: z.boolean().nullish().transform((v) => v ?? false),
  resellerReference: nstr,
  supplierReference: nstr,
  status: z.string(),
  utcExpiresAt: nstr,
  utcConfirmedAt: nstr,
  productId: z.string(),
  optionId: z.string(),
  availabilityId: nstr,
  cancellable: z.boolean().nullish().transform((v) => v ?? false),
  deliveryMethods: z.array(z.string()).nullish().transform((v) => v ?? []),
  voucher: ticketSchema.nullish().transform((v) => v ?? null),
  unitItems: z
    .array(z.object({ uuid: nstr, unitId: z.string(), ticket: ticketSchema.nullish().transform((v) => v ?? null) }))
    .nullish()
    .transform((v) => v ?? []),
  pricing: pricingSchema.nullish().transform((v) => v ?? null),
});
export type OctoBooking = z.output<typeof bookingSchema>;
