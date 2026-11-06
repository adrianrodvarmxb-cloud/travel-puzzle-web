/**
 * REQ-120: traslados de Kiwitaxi como complemento del carrito (no como página suelta).
 * Deeplink de Travelpayouts (tp.media/r) con nuestra cuenta (marker 800669, proyecto 595791)
 * y subID por pieza. Prellena la búsqueda de Kiwitaxi con lo que su guía documenta:
 *   https://kiwitaxi.com/{es}/search?from=…&to=…  (kiwitaxi.com/en/partner/webmaster/instructions/deeplink)
 * A CONFIRMAR (no documentado, no se inventa):
 *   - p=647 y campaign_id=1 del programa Kiwitaxi: vistos en enlaces tp.media publicados por otros
 *     afiliados y campaign 1 coincide con el widget; confirmar en el panel de Travelpayouts.
 *   - subID como «marker.subid»: Travelpayouts documenta ese formato para White Label y acepta
 *     solo letras, números y «_» en el SubID; confirmar que tp.media lo respeta.
 *   - Fecha, hora y personas en la búsqueda de Kiwitaxi: no hay parámetros documentados.
 */
import type { CartItem } from "../lib/item";
import type { ProviderAdapter, SearchQuery } from "../lib/adapter";

export const KIWITAXI = {
  marker: "800669",
  trs: "595791",
  /** A confirmar en el panel de Travelpayouts. */
  programId: "647",
  campaignId: "1",
  locale: "es",
} as const;

const safe = (s: string) => s.replace(/[^A-Za-z0-9_]/g, "");

/** REQ-120: enlace de afiliado con subID por pieza y búsqueda prellenada. */
export function kiwitaxiLink(o: { cityName: string; airport?: string; cartId: string; itemId: string }): string {
  if (!o.cityName.trim()) throw new Error("Kiwitaxi necesita la ciudad de destino.");
  const search = new URL(`https://kiwitaxi.com/${KIWITAXI.locale}/search`);
  if (o.airport?.trim()) search.searchParams.set("from", o.airport.trim());
  search.searchParams.set("to", o.cityName.trim());
  const subId = `${safe(o.cartId) || "nocart"}_${safe(o.itemId) || "item"}`;
  const tp = new URL("https://tp.media/r");
  tp.searchParams.set("marker", `${KIWITAXI.marker}.${subId}`);
  tp.searchParams.set("trs", KIWITAXI.trs);
  tp.searchParams.set("p", KIWITAXI.programId);
  tp.searchParams.set("u", search.toString());
  tp.searchParams.set("campaign_id", KIWITAXI.campaignId);
  return tp.toString();
}

function linkForQuery(q: SearchQuery): string {
  return kiwitaxiLink({ cityName: q.cityName ?? "", airport: q.airport, cartId: q.cartId ?? "nocart", itemId: q.itemId ?? "transfer" });
}

function linkForItem(item: CartItem): string {
  return kiwitaxiLink({ cityName: item.cityName ?? "", cartId: item.cartId ?? "nocart", itemId: item.id });
}

/** REQ-120: adaptador deeplink; Kiwitaxi cobra en su sitio («Lo reservas con Kiwitaxi»). */
export function createKiwitaxiAdapter(): ProviderAdapter {
  return {
    id: "kiwitaxi",
    mode: "deeplink",
    types: ["transfer"],
    chargedBy: "Kiwitaxi",
    async search(q) {
      if (q.type !== "transfer") return [];
      return [{ externalId: `kiwitaxi-${q.cityCode}`, title: "Traslado privado", url: linkForQuery(q) }];
    },
    async availability(_id, q) {
      return { available: q.type === "transfer" && !!q.cityName?.trim() };
    },
    async reserve(item) {
      return { kind: "redirect", url: linkForItem(item) };
    },
    async cancel() {
      return { ok: false };
    },
    async charge(item) {
      return { kind: "redirect", url: linkForItem(item) };
    },
  };
}
