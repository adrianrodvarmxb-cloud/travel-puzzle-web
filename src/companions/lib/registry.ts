/**
 * REQ-121: registro de complementos (datos en registry.json). La sección independiente de
 * complementos (hub «Transporte» en /traslados) y el carrusel de «Arma tu viaje» se arman desde aquí:
 * un proveedor o categoría nueva se agrega como dato, sin código por proveedor. Puro.
 */
import { z } from "zod";
import type { AdapterProbe } from "@/cart/lib/switch";
import { probeAdapter, whatsappLink } from "@/cart/lib/switch";
import type { ProviderAdapter, SearchQuery } from "@/cart/lib/adapter";
import type { CartItemType } from "@/cart/lib/item";
import type { CompanionCategory } from "./carousel";
import raw from "../registry.json";

const zEntry = z.object({
  id: z.string().regex(/^[a-z0-9_-]+$/),
  /** kiwitaxi = deeplink de Travelpayouts; request = solicitud al asesor; deeplink = afiliado genérico. */
  adapter: z.enum(["kiwitaxi", "request", "deeplink"]),
  provider: z.string().min(1),
  product: z.string().min(1),
  category: z.enum(["tour", "day_trip", "transfer", "esim", "tickets", "insurance", "transport", "lodging", "car_rental", "visa", "etias"]),
  group: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  description: z.string().min(1),
  /** Qué hace la tarjeta en la sección independiente. */
  hubAction: z.enum(["widget", "request", "deeplink"]),
  hubUrl: z.string().url().optional(),
});
export type RegistryEntry = z.infer<typeof zEntry>;

export function parseRegistry(data: unknown): RegistryEntry[] {
  return z.array(zEntry).parse(data);
}
export const DEFAULT_REGISTRY: RegistryEntry[] = parseRegistry(raw);

const GROUP_TITLES: Record<string, string> = { transporte: "Transporte", conectividad: "Conectividad", seguros: "Seguros", alojamiento: "Alojamiento", tours: "Tours" };

export type HubCta =
  | { kind: "widget"; label: "Buscar traslado" }
  | { kind: "request"; label: "Pedir a Travel Puzzle"; url: string }
  | { kind: "deeplink"; label: "Ver opciones"; url: string };

export interface HubCard {
  id: string;
  title: string;
  description: string;
  chargedByLabel: string;
  /** «A cotizar» cuando no hay precio verificado; nunca se inventa. */
  price: string | null;
  cta: HubCta;
  cities: string[];
}
export interface HubGroup { group: string; title: string; cards: HubCard[] }

/** REQ-121: arma la sección independiente por grupo y categoría, en el orden del registro. */
export function hubModel(entries: RegistryEntry[], opts: { whatsapp: string | null | undefined; citiesByEntry: Record<string, string[]> }): HubGroup[] {
  const wa = opts.whatsapp?.replace(/\D/g, "") ?? "";
  const groups = new Map<string, HubGroup>();
  for (const e of entries) {
    const isRequest = e.adapter === "request";
    let cta: HubCta | null = null;
    if (e.hubAction === "widget") cta = { kind: "widget", label: "Buscar traslado" };
    else if (e.hubAction === "request" && wa) cta = { kind: "request", label: "Pedir a Travel Puzzle", url: whatsappLink(wa, `Hola Travel Puzzle, quiero pedir ${e.product} (${e.provider}). ¿Me lo cotizan?`) };
    else if (e.hubAction === "deeplink" && e.hubUrl) cta = { kind: "deeplink", label: "Ver opciones", url: e.hubUrl };
    if (!cta) continue; // sin forma real de pedirlo, no se muestra
    const g = groups.get(e.group) ?? { group: e.group, title: GROUP_TITLES[e.group] ?? e.group, cards: [] };
    g.cards.push({
      id: e.id,
      title: e.title,
      description: e.description,
      chargedByLabel: `Lo reservas con ${isRequest ? "Travel Puzzle" : e.provider}`,
      price: isRequest ? "A cotizar" : null,
      cta,
      cities: [...(opts.citiesByEntry[e.id] ?? [])].sort((a, b) => a.localeCompare(b, "es")),
    });
    groups.set(e.group, g);
  }
  return [...groups.values()];
}

/** REQ-121: sondea los adaptadores del registro para la ciudad de la pieza; agrupa por categoría del carrusel. */
export async function probeRegistry(
  entries: RegistryEntry[],
  adapters: Record<string, ProviderAdapter>,
  query: SearchQuery,
): Promise<Partial<Record<CompanionCategory, AdapterProbe[]>>> {
  const out: Partial<Record<CompanionCategory, AdapterProbe[]>> = {};
  for (const e of entries) {
    const adapter = adapters[e.id];
    if (!adapter) continue;
    const type: CartItemType = e.category === "etias" ? "visa" : e.category;
    const probe = await probeAdapter(adapter, { ...query, type, itemId: e.id });
    (out[e.category] ??= []).push(probe);
  }
  return out;
}
