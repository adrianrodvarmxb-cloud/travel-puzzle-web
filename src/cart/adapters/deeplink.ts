/**
 * REQ-104: adaptador deeplink genérico (afiliados: eSIM, traslados, seguro, alojamiento…).
 * Abre en el sitio del proveedor con subID por pieza (marker-cartId-itemId). No reserva,
 * no cancela ni cobra en el carrito: todo eso pasa con el proveedor. Configurable sin código nuevo.
 */
import type { CartItem, CartItemType } from "../lib/item";
import { affiliateSubId, withSubId, type ProviderAdapter, type SearchQuery } from "../lib/adapter";

export interface DeeplinkConfig {
  id: string;
  types: CartItemType[];
  chargedBy: string;
  /** Marker del programa de afiliados. */
  marker: string;
  /** Países (ISO-2) donde hay inventario; "all" = todos. */
  countries: string[] | "all";
  /** Enlace de afiliado para la búsqueda (sin subID). */
  link: (q: SearchQuery) => string;
  /** Nombre del parámetro del subID en el enlace (Travelpayouts: sub_id). */
  subIdParam: string;
}

export function createDeeplinkAdapter(cfg: DeeplinkConfig): ProviderAdapter {
  const covers = (country: string) => cfg.countries === "all" || cfg.countries.includes(country.toUpperCase());
  const linkFor = (item: Pick<CartItem, "id" | "cartId" | "externalId">, base: string) =>
    withSubId(base, cfg.subIdParam, affiliateSubId(cfg.marker, item.cartId ?? "nocart", item.id));

  return {
    id: cfg.id,
    mode: "deeplink",
    types: cfg.types,
    chargedBy: cfg.chargedBy,
    async search(q) {
      if (!covers(q.country) || !cfg.types.includes(q.type)) return [];
      return [{ externalId: `${cfg.id}-${q.cityCode}`, title: cfg.chargedBy, url: cfg.link(q) }];
    },
    async availability(_externalId, q) {
      return { available: covers(q.country) && cfg.types.includes(q.type) };
    },
    async reserve(item) {
      return { kind: "redirect", url: linkFor(item, cfg.link(queryFor(item))) };
    },
    async cancel() {
      return { ok: false };
    },
    async charge(item) {
      return { kind: "redirect", url: linkFor(item, cfg.link(queryFor(item))) };
    },
  };
}

function queryFor(item: CartItem): SearchQuery {
  return { type: item.type, cityCode: item.cityCode, country: (item.cityCode ?? "").slice(0, 2).toUpperCase(), date: item.date, people: item.people };
}
