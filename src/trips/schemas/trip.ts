import { z } from "zod";
import { TRIP_KINDS, PURCHASE_MODES, CURRENCIES } from "../lib/trip";
import { IMAGE_KEY_RE } from "../lib/image";
import { isCountryCode } from "../lib/geo";

const text = (max: number) => z.string().trim().max(max);
const list = (max: number, itemMax = 200) => z.array(text(itemMax).min(1)).max(max).default([]);
const money = z.number().min(0).max(10_000_000).nullable().default(null);
const ISO_DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export const CATEGORIES = ["cultural", "aventura", "ecoturismo", "gastronomico", "sol-y-playa", "urbano", "bienestar"] as const;
export const CATEGORY_LABEL: Record<(typeof CATEGORIES)[number], string> = {
  cultural: "Turismo cultural", aventura: "Aventura", ecoturismo: "Ecoturismo", gastronomico: "Gastronómico",
  "sol-y-playa": "Sol y playa", urbano: "Urbano", bienestar: "Bienestar",
};
export const DIFFICULTIES = ["facil", "moderada", "exigente"] as const;
export const GUIDE_LANGUAGES = ["es", "en", "pt", "fr", "de", "it", "ja", "zh", "ko"] as const;
export const MAX_SLOTS = 8;
export const MAX_POINTS = 8;
export const MAX_OPTIONS = 4;

const optionSchema = z.object({
  id: z.string().min(1).max(40),
  name: text(80).min(1),
  mode: z.enum(["group", "private"]).default("group"),
  adult: money, child: money, infant: money,
  childAgeMin: z.number().int().min(0).max(17).default(3),
  childAgeMax: z.number().int().min(0).max(17).default(11),
});

const pointSchema = z.object({
  name: text(120).min(1),
  address: text(300).default(""),
  lat: z.number().min(-90).max(90).nullable().default(null),
  lng: z.number().min(-180).max(180).nullable().default(null),
  instructions: text(500).default(""),
  photoKey: z.string().regex(IMAGE_KEY_RE).nullable().default(null),
});

export const availabilitySchema = z.object({
  weekdays: z.array(z.number().int().min(0).max(6)).max(7).default([]),
  slots: z.array(z.object({ time: z.string().regex(TIME), capacity: z.number().int().min(1).max(999).nullable().default(null) })).max(MAX_SLOTS).default([]),
  closedDates: z.array(z.string().regex(ISO_DATE)).max(366).default([]),
  seasons: z.array(z.object({ name: text(60).min(1), from: z.string().regex(ISO_DATE), to: z.string().regex(ISO_DATE), supplement: z.number().min(-1_000_000).max(1_000_000) })).max(12).default([]),
});

export const cancellationSchema = z.object({
  type: z.enum(["standard", "custom", "none"]).default("standard"),
  tiers: z.array(z.object({ daysBefore: z.number().int().min(0).max(365), refundPct: z.number().int().min(0).max(100) })).max(6).default([]),
});

/** Lo que manda el formulario del gestor. El código lo genera el servidor (gate H). */
export const tripInputSchema = z.object({
  agencyId: z.string().trim().min(1).nullable().default(null),
  code: z.string().optional(), // ignorado: se genera solo
  kind: z.enum(TRIP_KINDS),
  purchaseMode: z.enum(PURCHASE_MODES),
  category: z.enum(CATEGORIES).nullable().default(null),
  titleEs: text(140).min(1),
  titleEn: text(140).default(""),
  summaryEs: text(400).default(""),
  summaryEn: text(400).default(""),
  highlights: list(5, 160),
  descriptionEs: text(8000).default(""),
  descriptionEn: text(8000).default(""),
  importantInfo: text(3000).default(""),
  whatToBring: text(1500).default(""),
  accessibility: text(1500).default(""),
  difficulty: z.enum(DIFFICULTIES).nullable().default(null),
  countries: z.array(z.string().refine(isCountryCode, "País inválido")).max(20).default([]),
  cities: list(40, 80),
  durationDays: z.number().int().min(1).max(120).nullable().default(null),
  flightsIncluded: z.boolean().default(false),
  languages: z.array(z.enum(GUIDE_LANGUAGES)).max(GUIDE_LANGUAGES.length).default([]),
  minPax: z.number().int().min(1).max(999).nullable().default(null),
  maxPax: z.number().int().min(1).max(999).nullable().default(null),
  currency: z.enum(CURRENCIES).default("MXN"),
  priceFrom: z.number().nullable().optional(), // ignorado: se calcula
  priceNote: text(200).default(""),
  options: z.array(optionSchema).max(MAX_OPTIONS).default([]),
  extras: z.array(z.object({ name: text(120).min(1), price: z.number().min(0).max(10_000_000), perPerson: z.boolean().default(true) })).max(20).default([]),
  availability: availabilitySchema.prefault({}),
  minNoticeHours: z.number().int().min(0).max(24 * 60).default(24),
  cancellation: cancellationSchema.prefault({}),
  dates: z.array(z.object({ date: z.string(), times: z.array(z.string()) })).max(400).default([]), // modelo anterior (oculto)
  meetingPoints: z.array(pointSchema).max(MAX_POINTS).default([]),
  hotelPickup: z.boolean().default(false),
  endPoint: text(300).default(""),
  itinerary: z.array(z.object({ title: text(140).min(1), text: text(3000).default("") })).max(120).default([]),
  includes: list(60, 300),
  excludes: list(60, 300),
  visaInfo: text(3000).default(""),
  images: z.array(z.object({ key: z.string().regex(IMAGE_KEY_RE), alt: text(160).default("") })).max(30).default([]),
  videoUrl: z.union([z.literal(""), z.string().url().max(500).refine((u) => u.startsWith("https://"), "Solo https")]).default(""),
  videoCaption: text(200).default(""),
}).refine((t) => !t.minPax || !t.maxPax || t.minPax <= t.maxPax, { message: "El cupo mínimo no puede ser mayor que el máximo", path: ["maxPax"] })
  .refine((t) => t.options.every((o) => o.childAgeMin <= o.childAgeMax), { message: "Rango de edad de niño inválido", path: ["options"] })
  .refine((t) => t.availability.seasons.every((s) => s.from <= s.to), { message: "Temporada con fechas al revés", path: ["availability"] });

export type TripInput = z.infer<typeof tripInputSchema>;

export const tripStatusSchema = z.object({ status: z.enum(["draft", "published", "hidden", "unlisted"]) });
