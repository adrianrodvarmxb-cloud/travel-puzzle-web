import { z } from "zod";

/** Resultado de validar una lista: lo bueno pasa y lo malo se cuenta (no tumba la lista). */
export interface Parsed<T> {
  items: T[];
  discarded: number;
}

// REQ-1541, REQ-1542
export function parseEach<S extends z.ZodTypeAny>(schema: S, list: unknown): Parsed<z.output<S>> {
  const arr = Array.isArray(list) ? list : [];
  const items: z.output<S>[] = [];
  let discarded = 0;
  for (const raw of arr) {
    const r = schema.safeParse(raw);
    if (r.success) items.push(r.data);
    else discarded++;
  }
  if (discarded > 0) console.warn(`[tangol] ${discarded} registro(s) descartados por datos inválidos`);
  return { items, discarded };
}

const str = z.string().nullish().transform((v) => v ?? null);
const num = z.number().nullish().transform((v) => v ?? null);

export const countrySchema = z
  .object({ IsoCode: z.string().min(1), Description: z.string(), ToursQty: num })
  .transform((c) => ({ isoCode: c.IsoCode, name: c.Description, toursQty: c.ToursQty }));

export const destinationSchema = z
  .object({ Id: z.number().int(), Description: z.string(), CountryCode: z.string(), ToursQty: num })
  .transform((d) => ({ id: d.Id, name: d.Description, countryCode: d.CountryCode, toursQty: d.ToursQty }));

/**
 * Tour de la lista por destino. Se guarda tal cual (copia exacta, ola 2); aquí solo se exige lo mínimo
 * para que el registro sea usable. `UrlTour` es la página de Tangol: nunca se enlaza al cliente (cara Travel Puzzle).
 */
export const infoTourSchema = z
  .object({
    TourId: z.number().int(),
    Name: z.string().min(1),
    LanguageCode: num,
    Currency: num,
    MinRate: num,
    Duration: str,
    UrlHomePic: str,
    TypeCode: str,
    SubTypeCode: str,
    TourType: num,
    UrlTour: str,
    ListMonths: z.array(z.string()).nullish().transform((v) => v ?? []),
    TourDetails: z.unknown().optional(),
  })
  .transform((t) => ({
    tourId: t.TourId,
    name: t.Name,
    languageCode: t.LanguageCode,
    currency: t.Currency,
    minRate: t.MinRate,
    duration: t.Duration,
    homePic: t.UrlHomePic,
    typeCode: t.TypeCode,
    subTypeCode: t.SubTypeCode,
    tourType: t.TourType,
    months: t.ListMonths,
    details: t.TourDetails ?? null,
  }));

export type TangolCountry = z.output<typeof countrySchema>;
export type TangolDestination = z.output<typeof destinationSchema>;
export type TangolTour = z.output<typeof infoTourSchema>;

const day = (v: string) => v.slice(0, 10);

const optionSchema = z
  .object({
    Code: z.string().min(1),
    Description: str,
    MinRate: num,
    StartTime: str,
    HoursBooking: num,
    HoursCancelation: num,
  })
  .transform((o) => ({
    code: o.Code,
    description: o.Description,
    startTime: o.StartTime,
    minRate: o.MinRate,
    hoursBooking: o.HoursBooking,
    hoursCancelation: o.HoursCancelation,
  }));

/**
 * Tarifa por rango de pasajeros. Solo se conservan las tarifas públicas (RackRate*): `Utilidad`,
 * netos y comisiones se descartan aquí para que nunca lleguen al sitio (REQ-1543).
 */
const rateSchema = z
  .object({
    TourOption: z.string().min(1),
    Currency: str,
    PaxFrom: num,
    PaxTo: num,
    RackRateAdu: z.number(),
    RackRateChd: num,
    RackRateInf: num,
    ValidFrom: str,
    ValidTo: str,
  })
  .transform((r) => ({
    option: r.TourOption,
    currency: r.Currency,
    paxFrom: r.PaxFrom,
    paxTo: r.PaxTo,
    rackAdult: r.RackRateAdu,
    rackChild: r.RackRateChd,
    rackInfant: r.RackRateInf,
    validFrom: r.ValidFrom ? day(r.ValidFrom) : null,
    validTo: r.ValidTo ? day(r.ValidTo) : null,
  }));

const blackoutSchema = z
  .object({ DateFrom: z.string().min(10), DateTo: z.string().min(10) })
  .transform((b) => ({ from: day(b.DateFrom), to: day(b.DateTo) }));

export type TangolRate = z.output<typeof rateSchema>;
export type TangolOption = z.output<typeof optionSchema>;

export interface TangolRates {
  tourId: number;
  currency: string | null;
  options: TangolOption[];
  rates: TangolRate[];
  blackouts: { from: string; to: string }[];
  discarded: number;
}

// REQ-1542, REQ-1543
export function parseTourRates(raw: unknown): TangolRates {
  const r = (raw ?? {}) as Record<string, unknown>;
  const tourId = z.number().int().parse(r.TourId);
  const options = parseEach(optionSchema, r.ListTourOption);
  const rates = parseEach(rateSchema, r.ListTourRate);
  const blackouts = parseEach(blackoutSchema, r.ListBlackDate);
  return {
    tourId,
    currency: typeof r.Currency === "string" ? r.Currency : null,
    options: options.items,
    rates: rates.items,
    blackouts: blackouts.items,
    discarded: options.discarded + rates.discarded + blackouts.discarded,
  };
}
