/**
 * REQ-023: producto de BeMyGuest → borrador del gestor (gate C, selección curada). Puro.
 * Queda en "quote" hasta que exista el pago en línea (ola 2, gate A). El equipo revisa
 * textos, traducción y fotos antes de publicar (estándar GYG de 5 fotos).
 */
import { COUNTRY_CODES } from "@/trips/lib/geo";
import { MAX_OPTIONS, type TripInput } from "@/trips/schemas/trip";
import type { BmgPriceDay, BmgProduct, BmgProductType } from "../schemas/api";
import { priceForSlot, ratesFor, sellPrice } from "./price";

type TripCurrency = "USD" | "EUR" | "MXN";
/** Conversión de la moneda de BMG a una del gestor, p. ej. { SGD: { to: "USD", rate: 0.77 } }. */
export type FxTable = Partial<Record<string, { to: TripCurrency; rate: number }>>;

export interface DraftInput {
  product: BmgProduct;
  types: { type: BmgProductType; day: BmgPriceDay | null }[];
  agencyId: string;
  margin: number;
  fx: FxTable;
}
export type DraftResult =
  | { ok: true; draft: TripInput; photoUrls: string[]; links: { optionId: string; productTypeUuid: string }[] }
  | { ok: false; error: string };

const NAME_TO_CODE = (() => {
  const m = new Map<string, string>();
  try {
    const dn = new Intl.DisplayNames(["en"], { type: "region" });
    for (const code of COUNTRY_CODES) {
      const name = dn.of(code);
      if (name) m.set(name.toLowerCase(), code);
    }
  } catch { /* sin Intl: no se resuelven países */ }
  return m;
})();

export function countryCodeFromName(name: string): string | null {
  return NAME_TO_CODE.get(name.trim().toLowerCase()) ?? null;
}

const lines = (s: string, max: number, len: number) =>
  s.split(/\r?\n/).map((l) => l.replace(/^[-•*\s]+/, "").trim()).filter(Boolean).slice(0, max).map((l) => l.slice(0, len));
const pick = (translated: string, original: string) => translated || original;
const uniq = <T,>(xs: T[]) => [...new Set(xs)];

export function toTripDraft(input: DraftInput): DraftResult {
  const { product: p, types, agencyId, margin, fx } = input;
  const source = (p.currency?.code ?? "SGD").toUpperCase();
  const conv = source === "USD" || source === "EUR" || source === "MXN" ? { to: source as TripCurrency, rate: 1 } : fx[source];
  if (!conv || !(conv.rate > 0)) return { ok: false, error: `Falta el tipo de cambio de ${source} para importar este producto` };

  const toTrip = (amount: number) => Math.ceil(Math.round(amount * conv.rate * 100) / 100);
  const priced = types.slice(0, MAX_OPTIONS).map(({ type, day }) => {
    const price = day ? priceForSlot(day, day.timeslots[0]?.uuid ?? null) ?? priceForSlot(day, null) : null;
    const adult = price ? ratesFor(price, "adult") : null;
    const child = price && type.allowChildren ? ratesFor(price, "child") : null;
    return {
      type,
      option: {
        id: type.uuid,
        name: pick(type.titleTranslated, type.title).slice(0, 80),
        mode: "group" as const,
        adult: adult ? toTrip(sellPrice(adult, margin)) : null,
        child: child ? toTrip(sellPrice(child, margin)) : null,
        infant: null,
        childAgeMin: Math.min(type.minChildAge ?? 3, 17),
        childAgeMax: Math.min(type.maxChildAge ?? 11, 17),
      },
    };
  });

  const first = priced[0]?.type;
  const hours = first ? (first.durationDays ?? 0) * 24 + (first.durationHours ?? 0) : 0;
  const allNonRefundable = priced.length > 0 && priced.every((x) => x.type.isNonRefundable);
  const policies = first?.cancellationPolicies ?? [];
  const lat = Number(p.latitude);
  const lng = Number(p.longitude);
  const meeting = first?.meetingAddress || pick(first?.meetingLocationTranslated ?? "", first?.meetingLocation ?? "") || p.address;

  const highlights = lines(pick(p.highlightsTranslated, p.highlights), 5, 160);
  const draft: TripInput = {
    agencyId,
    kind: "tour",
    purchaseMode: "quote",
    category: null,
    titleEs: pick(p.titleTranslated, p.title).slice(0, 140),
    titleEn: p.title.slice(0, 140),
    summaryEs: (highlights[0] ?? "").slice(0, 400),
    summaryEn: "",
    highlights,
    descriptionEs: pick(p.descriptionTranslated, p.description).slice(0, 8000),
    descriptionEn: p.description.slice(0, 8000),
    importantInfo: [pick(p.additionalInfoTranslated, p.additionalInfo), p.warnings].filter(Boolean).join("\n\n").slice(0, 3000),
    whatToBring: "",
    accessibility: "",
    difficulty: null,
    countries: uniq(p.locations.map((l) => countryCodeFromName(l.country)).filter((c): c is string => !!c)).slice(0, 20),
    cities: uniq(p.locations.map((l) => l.city).filter(Boolean)).slice(0, 40),
    durationDays: Math.max(1, Math.ceil(hours / 24)),
    flightsIncluded: false,
    languages: [],
    minPax: p.minPax && p.minPax > 0 ? p.minPax : null,
    maxPax: p.maxPax && p.maxPax > 0 ? p.maxPax : null,
    currency: conv.to,
    priceNote: "",
    options: priced.map((x) => x.option),
    extras: [],
    availability: { weekdays: [], slots: [], closedDates: [], seasons: [] },
    minNoticeHours: 24,
    cancellation: allNonRefundable
      ? { type: "none", tiers: [] }
      : policies.length
        ? { type: "custom", tiers: policies.slice(0, 6).map((c) => ({ daysBefore: Math.max(0, Math.round(c.numberOfDays)), refundPct: Math.min(100, Math.max(0, Math.round(c.refundPercentage))) })) }
        : { type: "standard", tiers: [] },
    dates: [],
    meetingPoints: meeting
      ? [{ name: meeting.slice(0, 120), address: p.address.slice(0, 300), lat: Number.isFinite(lat) ? lat : null, lng: Number.isFinite(lng) ? lng : null, instructions: "", photoKey: null }]
      : [],
    hotelPickup: p.hotelPickup,
    endPoint: "",
    itinerary: [],
    includes: lines(pick(p.priceIncludesTranslated, p.priceIncludes), 60, 300),
    excludes: [],
    visaInfo: "",
    images: [],
    videoUrl: "",
    videoCaption: "",
  };

  const cdn = (p.photosUrl || "https://cdn.bemyguest.com.sg").replace(/\/$/, "");
  const photoUrls = p.photos
    .map((ph) => ph.paths["1280x720"] ?? ph.paths.original ?? null)
    .filter((x): x is string => !!x)
    .slice(0, 10)
    .map((path) => `${cdn}${path.startsWith("/") ? "" : "/"}${path}`);

  return { ok: true, draft, photoUrls, links: priced.map((x) => ({ optionId: x.option.id, productTypeUuid: x.type.uuid })) };
}
