import { z } from "zod";
import { TRIP_KINDS, PURCHASE_MODES, CURRENCIES, MAX_TIMES_PER_DAY, MAX_MEETING_POINTS } from "../lib/trip";
import { IMAGE_KEY_RE } from "../lib/image";

const text = (max: number) => z.string().trim().max(max);
const list = (max: number, itemMax = 200) => z.array(text(itemMax).min(1)).max(max).default([]);

/** Lo que manda el formulario del gestor. Un borrador puede ir incompleto; publicar se revisa aparte. */
export const tripInputSchema = z.object({
  agencyId: z.string().trim().min(1).nullable().default(null),
  code: z.string().trim().min(2).max(20).regex(/^[A-Za-z0-9-]+$/, "Solo letras, números y guiones").transform((s) => s.toUpperCase()),
  kind: z.enum(TRIP_KINDS),
  purchaseMode: z.enum(PURCHASE_MODES),
  titleEs: text(140).min(1),
  titleEn: text(140).default(""),
  summaryEs: text(400).default(""),
  summaryEn: text(400).default(""),
  descriptionEs: text(8000).default(""),
  descriptionEn: text(8000).default(""),
  countries: list(20, 80),
  cities: list(40, 80),
  durationDays: z.number().int().min(1).max(120).nullable().default(null),
  priceFrom: z.number().min(0).max(10_000_000).nullable().default(null),
  currency: z.enum(CURRENCIES).default("MXN"),
  priceNote: text(200).default(""),
  dates: z.array(z.object({ date: z.string(), times: z.array(z.string()).max(MAX_TIMES_PER_DAY) })).max(400).default([]),
  meetingPoints: z.array(z.object({ name: text(120).min(1), address: text(300).default("") })).max(MAX_MEETING_POINTS).default([]),
  hotelPickup: z.boolean().default(false),
  itinerary: z.array(z.object({ title: text(140).min(1), text: text(3000).default("") })).max(120).default([]),
  includes: list(60, 300),
  excludes: list(60, 300),
  visaInfo: text(3000).default(""),
  images: z.array(z.object({ key: z.string().regex(IMAGE_KEY_RE), alt: text(160).default("") })).max(30).default([]),
});

export type TripInput = z.infer<typeof tripInputSchema>;

export const tripStatusSchema = z.object({ status: z.enum(["draft", "published", "hidden"]) });
