/**
 * REQ-024: respuestas de BeMyGuest validadas antes de usarlas (Blindaje 8).
 * Solo los campos que usamos; lo demás se ignora. Un registro malo se descarta, no tumba la página.
 */
import { z } from "zod";

const str = z.string().nullish().transform((v) => v ?? "");
const num = z.number().nullish().transform((v) => v ?? null);

export const rateSchema = z.object({ type: z.string(), category: z.string(), currency: z.string(), amount: z.number() });
export const priceSchema = z.object({ id: z.string(), rates: z.array(rateSchema) });

export const productSummarySchema = z.object({
  uuid: z.string().min(1),
  title: z.string().min(1),
  titleTranslated: str,
  basePrice: num,
  typeName: str,
  updatedAt: str,
});

export const productSchema = z.object({
  uuid: z.string().min(1),
  title: z.string().min(1),
  titleTranslated: str,
  description: str,
  descriptionTranslated: str,
  highlights: str,
  highlightsTranslated: str,
  additionalInfo: str,
  additionalInfoTranslated: str,
  warnings: str,
  priceIncludes: str,
  priceIncludesTranslated: str,
  address: str,
  latitude: z.union([z.string(), z.number()]).nullish(),
  longitude: z.union([z.string(), z.number()]).nullish(),
  minPax: num,
  maxPax: num,
  hotelPickup: z.boolean().nullish().transform((v) => v ?? false),
  currency: z.object({ code: z.string() }).nullish(),
  locations: z.array(z.object({ city: str, country: str })).nullish().transform((v) => v ?? []),
  photos: z.array(z.object({ paths: z.record(z.string(), z.string().nullable()) })).nullish().transform((v) => v ?? []),
  photosUrl: str,
});

const policySchema = z.object({ numberOfDays: z.number(), refundPercentage: z.number() });

export const productTypeSchema = z.object({
  uuid: z.string().min(1),
  title: z.string().min(1),
  titleTranslated: str,
  durationDays: num,
  durationHours: num,
  isNonRefundable: z.boolean().nullish().transform((v) => v ?? false),
  allowChildren: z.boolean().nullish().transform((v) => v ?? false),
  minChildAge: num,
  maxChildAge: num,
  minPax: num,
  maxPax: num,
  meetingAddress: str,
  meetingLocation: str,
  meetingLocationTranslated: str,
  firstAvailabilityDate: str,
  cancellationPolicies: z.array(policySchema).nullish().transform((v) => v ?? []),
});

export const priceDaySchema = z.object({
  date: z.string(),
  prices: z.array(priceSchema).default([]),
  timeslots: z.array(z.object({ uuid: z.string(), startTime: z.string(), priceId: z.string().optional() })).nullish().transform((v) => v ?? []),
});

export type BmgProductSummary = z.infer<typeof productSummarySchema>;
export type BmgProduct = z.infer<typeof productSchema>;
export type BmgProductType = z.infer<typeof productTypeSchema>;
export type BmgPriceDay = z.infer<typeof priceDaySchema>;

/** Lista: valida uno por uno; los que no pasan se descartan y se reportan. */
export function parseList<T>(schema: z.ZodType<T>, items: unknown, onBad?: (index: number, error: string) => void): T[] {
  if (!Array.isArray(items)) return [];
  const out: T[] = [];
  items.forEach((item, i) => {
    const r = schema.safeParse(item);
    if (r.success) out.push(r.data);
    else onBad?.(i, r.error.issues[0]?.message ?? "inválido");
  });
  return out;
}
