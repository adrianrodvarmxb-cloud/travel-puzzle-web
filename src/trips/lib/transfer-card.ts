/**
 * REQ-10753 (decisión 29, REQ-10607; firma REQ-10764 del PO, 17-11-2026: «A: la que ya está en el código»): tarjeta de
 * traslado desde el aeropuerto con Kiwitaxi (afiliado de Travelpayouts, la misma cuenta de /traslados) bajo la franja
 * de transporte de la ficha. Solo en fichas que NO son de FREETOUR (`transportAllowedFor`) y tras
 * `FICHA_TRANSFER_CARD_ENABLED="true"`. PURA: sin red ni reloj; el enlace sale de `kiwitaxiLink` (REQ-120).
 */
import { kiwitaxiLink } from "@/cart/adapters/kiwitaxi";
import { transportAllowedFor } from "@/geo/lib/near";

export interface TransferCardEnv { FICHA_TRANSFER_CARD_ENABLED?: string }

// REQ-10753
export function transferCardEnabled(env: TransferCardEnv): boolean {
  return env.FICHA_TRANSFER_CARD_ENABLED === "true";
}

/** Lo que pinta la tarjeta; todo calculado en el servidor (REQ-008). `external`: abre en otra pestaña, enlace de afiliado. */
export interface TransferCardView { id: string; url: string; title: string; by: string; external: true }

const COPY: Record<string, { title: string; by: string }> = {
  es: { title: "Traslado desde el aeropuerto", by: "Lo reservas con Kiwitaxi" },
  en: { title: "Airport transfer", by: "Booked with Kiwitaxi" },
  pt: { title: "Traslado do aeroporto", by: "Você reserva com a Kiwitaxi" },
  fr: { title: "Transfert depuis l'aéroport", by: "Réservé avec Kiwitaxi" },
  de: { title: "Flughafentransfer", by: "Buchung über Kiwitaxi" },
  it: { title: "Trasferimento dall'aeroporto", by: "Prenoti con Kiwitaxi" },
};

const safe = (s: string) => s.replace(/[^A-Za-z0-9_]/g, "");

// REQ-10753
export function transferCard(o: { cityName: string | null | undefined; tourId: string; provider: string | null | undefined; lang: string; enabled: boolean }): TransferCardView | null {
  if (!o.enabled) return null;
  if (!transportAllowedFor(o.provider, { affiliate: true })) return null;
  const city = (o.cityName ?? "").trim();
  if (!city) return null;
  const copy = COPY[o.lang] ?? COPY.en;
  return { id: `kiwitaxi-${safe(o.tourId)}`, url: kiwitaxiLink({ cityName: city, cartId: "ficha", itemId: o.tourId }), ...copy, external: true };
}
