/**
 * REQ-121: crea los adaptadores del registro de complementos. Un proveedor nuevo con un tipo de
 * adaptador existente (request, kiwitaxi) es solo un dato en registry.json.
 */
import type { ProviderAdapter } from "../lib/adapter";
import type { RegistryEntry } from "@/companions/lib/registry";
import type { CartItemType } from "../lib/item";
import { createKiwitaxiAdapter } from "./kiwitaxi";
import { createRequestAdapter } from "./request";

export interface RegistryAdapterDeps {
  whatsapp: string | null | undefined;
  /** Ciudades donde opera el proveedor de una entrada (p. ej. Big Bus desde el gestor de viajes). */
  citiesFor: (entry: RegistryEntry) => Promise<string[]>;
}

export function buildRegistryAdapters(entries: RegistryEntry[], deps: RegistryAdapterDeps): Record<string, ProviderAdapter> {
  const out: Record<string, ProviderAdapter> = {};
  for (const e of entries) {
    const types: CartItemType[] = [e.category === "etias" ? "visa" : e.category];
    if (e.adapter === "kiwitaxi") out[e.id] = createKiwitaxiAdapter();
    else if (e.adapter === "request") {
      out[e.id] = createRequestAdapter({ id: e.id, types, provider: e.provider, product: e.product, whatsapp: deps.whatsapp, cities: () => deps.citiesFor(e) });
    }
    // "deeplink" genérico necesita su enlace por ciudad: se conecta cuando haya programa de afiliado firmado.
  }
  return out;
}
