/**
 * REQ-121: adaptador en modo «solicitud / asesor» para proveedores sin API (p. ej. Big Bus:
 * Travel Puzzle paga el neto en su plataforma y cobra al cliente el retail). El cliente pide el
 * producto por WhatsApp con ciudad, fecha y personas prellenadas; nunca hay pago directo.
 * Sin precio verificado: «a cotizar». Las ciudades donde opera se inyectan (datos, no código).
 */
import type { CartItemType } from "../lib/item";
import type { ProviderAdapter, SearchQuery } from "../lib/adapter";
import { shortDate, whatsappLink } from "../lib/switch";

export interface RequestAdapterConfig {
  id: string;
  types: CartItemType[];
  /** Nombre del proveedor (se menciona en el mensaje al asesor, no como quien cobra). */
  provider: string;
  /** Qué pide el cliente («el bus turístico hop-on hop-off»). */
  product: string;
  whatsapp: string | null | undefined;
  /** Ciudades donde el proveedor opera (p. ej. las cargadas en el gestor de viajes). */
  cities: () => Promise<string[]>;
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

function people(p: SearchQuery["people"]): string {
  const a = `${p.adults} ${p.adults === 1 ? "adulto" : "adultos"}`;
  return p.children > 0 ? `${a} y ${p.children} ${p.children === 1 ? "menor" : "menores"}` : a;
}

/** REQ-121: mensaje de solicitud con ciudad, fecha y personas. */
export function requestMessage(cfg: Pick<RequestAdapterConfig, "provider" | "product">, q: Pick<SearchQuery, "cityName" | "date" | "people">): string {
  return `Hola Travel Puzzle, quiero pedir ${cfg.product} (${cfg.provider}) en ${q.cityName} el ${shortDate(q.date)} para ${people(q.people)}. ¿Me lo cotizan?`;
}

export function createRequestAdapter(cfg: RequestAdapterConfig): ProviderAdapter {
  const number = cfg.whatsapp?.replace(/\D/g, "") ?? "";
  async function covers(q: SearchQuery): Promise<boolean> {
    if (!number || !cfg.types.includes(q.type) || !q.cityName?.trim()) return false;
    const cities = (await cfg.cities()).map(norm);
    return cities.includes(norm(q.cityName));
  }
  return {
    id: cfg.id,
    mode: "request",
    types: cfg.types,
    chargedBy: "Travel Puzzle",
    async search(q) {
      if (!(await covers(q))) return [];
      return [{ externalId: `${cfg.id}-${q.cityCode}`, title: cfg.product, url: whatsappLink(number, requestMessage(cfg, q)) }];
    },
    async availability(_id, q) {
      return { available: await covers(q) };
    },
    async reserve(item) {
      return { kind: "redirect", url: whatsappLink(number, requestMessage(cfg, { cityName: item.cityName, date: item.date, people: item.people })) };
    },
    async cancel() {
      return { ok: false };
    },
    async charge() {
      // Nunca hay pago directo: el asesor cotiza y Travel Puzzle compra en la plataforma del proveedor.
      return { kind: "none" };
    },
  };
}
