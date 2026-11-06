/**
 * REQ-262…267: arma el bloque de venta cruzada de un correo a partir de la reserva. I/O inyectado
 * (`CrossSellLoaderDeps`); la lógica vive en lib/cross-sell.ts. Nunca lanza: si algo falla, el correo sale sin bloque.
 */
import type { BookingRecord } from "@/booking/lib/booking-record";
import { pickByPlace } from "@/trips/lib/match";
import type { TripCard } from "@/trips/public-load";
import { buildEmailCrossSell, REQUIRE_NO_PUBLICIDAD, type CrossSellBlock, type CrossSellEmail, type EmailCrossSellCandidate } from "./lib/cross-sell";
import type { EmailLang } from "./lib/booking-email";

export interface CrossSellPlace { cityName: string | null; country: string | null; cityCode: string | null }

export interface CrossSellLoaderDeps {
  /** EMAIL_CROSS_SELL_ENABLED. */
  enabled: boolean;
  /** Ciudad y país (ISO-2) del tour reservado, del catálogo. */
  place(tourExternalId: number): Promise<CrossSellPlace | null>;
  /** Viajes propios publicados y visibles (ya respetan OWN_TOURS_ENABLED y TRANSPORT_ENABLED). */
  tripCards(lang: string): Promise<TripCard[]>;
  /** TRANSFERS_ENABLED: /traslados está publicado (Kiwitaxi). */
  transfers: boolean;
  /** REQ-267: ¿el cliente pidió «No publicidad»? Solo se consulta con `requireOptOut` (hoy no: decisión del PO 6-11 09:07). */
  noPublicidad?: (email: string) => Promise<boolean>;
  /** REQ-267: exigir la negativa; por omisión REQUIRE_NO_PUBLICIDAD (false). */
  requireOptOut?: boolean;
  now?: () => number;
}

const TRANSFER_TITLE: Record<EmailLang, string> = { es: "Traslado del aeropuerto a tu hotel", en: "Airport transfer to your hotel" };

/** Viajes propios y traslados de la misma ciudad (o país, como la venta cruzada de las fichas) que no son de FREETOUR. */
export function candidatesFor(place: CrossSellPlace, cards: TripCard[], transfers: boolean, lang: EmailLang): EmailCrossSellCandidate[] {
  const own = pickByPlace(cards.filter((c) => c.kind === "tour" || c.kind === "unica" || c.kind === "transporte"), { city: place.cityName, country: place.country }, 6)
    .map((c): EmailCrossSellCandidate => ({
      source: "own",
      category: c.kind === "transporte" ? "transport" : "tour",
      title: c.title,
      provider: "Travel Puzzle",
      url: c.path,
      // REQ-266: el precio solo si está en pesos tal cual; uno convertido no se repite en el correo.
      priceLabel: c.price && !c.price.original && !c.price.rateNote ? `${lang === "es" ? "Desde" : "From"} ${c.price.main}` : null,
      dates: c.dates,
    }));
  const transfer: EmailCrossSellCandidate[] = transfers
    ? [{ source: "affiliate", category: "transfer", title: TRANSFER_TITLE[lang], provider: "Kiwitaxi", url: "/traslados", dates: "any" }]
    : [];
  return [...own, ...transfer];
}

export async function loadEmailCrossSell(
  email: CrossSellEmail, record: BookingRecord, lang: EmailLang, site: string, deps: CrossSellLoaderDeps | undefined,
): Promise<CrossSellBlock | null> {
  if (!deps?.enabled || !record.tourExternalId) return null;
  try {
    const requireOptOut = deps.requireOptOut ?? REQUIRE_NO_PUBLICIDAD;
    const optedOut = requireOptOut ? (deps.noPublicidad ? await deps.noPublicidad(record.email) : null) : false;
    if (requireOptOut && optedOut !== false) return null;
    const place = await deps.place(record.tourExternalId);
    if (!place?.cityName) return null;
    const cards = await deps.tripCards(lang).catch(() => []);
    return buildEmailCrossSell({
      email,
      enabled: deps.enabled,
      optedOut,
      requireOptOut,
      lang,
      site,
      context: {
        cityName: place.cityName,
        country: place.country,
        cityCode: place.cityCode,
        // `eventDate` de FREETOUR ya está en la hora de la ciudad (E3).
        day: record.eventDate?.slice(0, 10) ?? null,
        freeTourAt: record.eventUtcDate ? `${record.eventUtcDate.replace(" ", "T")}Z` : null,
        now: deps.now?.() ?? Date.now(),
      },
      candidates: candidatesFor(place, cards, deps.transfers, lang),
    });
  } catch (error) {
    console.error(`[correo] venta cruzada omitida en ${record.refNumber}:`, (error as Error).message);
    return null;
  }
}
