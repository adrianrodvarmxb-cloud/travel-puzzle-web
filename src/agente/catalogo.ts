// Catálogo para el agente de WhatsApp (REQ-122..126). Orquesta: lee las tarjetas publicadas (con su caché) y las
// agencias; la lógica pura vive en ./lib/catalogo. Las dependencias llegan por parámetro.
import type { TripCard } from "@/trips/public-load";
import type { ViajeAgente } from "./lib/catalogo";

export interface CatalogoDeps {
  tarjetas(lang: string): Promise<TripCard[]>;
  agencias(): Promise<{ id: string; name: string }[]>;
}

export const aViajeAgente = (c: TripCard): ViajeAgente => ({
  slug: c.path.split("/").pop() ?? "", path: c.path, title: c.title, summary: c.summary, places: c.places, cities: c.cities,
  kind: c.kind, agencyId: c.agencyId ?? null, price: c.price?.main ?? null, durationDays: c.durationDays, dates: c.dates,
});

export async function viajesParaAgente(deps: CatalogoDeps, lang = "es"): Promise<ViajeAgente[]> {
  return (await deps.tarjetas(lang)).map(aViajeAgente);
}

/** Dependencias reales (D1 por Prisma, con la caché de las tarjetas). */
export async function catalogoDeps(): Promise<CatalogoDeps> {
  const { loadTripCards } = await import("@/trips/public-load");
  const { getPrisma } = await import("@/lib/prisma");
  return {
    tarjetas: loadTripCards,
    agencias: () => getPrisma().agency.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  };
}

/** REQ-126: la ventana del agente solo existe con la bandera encendida y la llave cargada. */
export const agenteHabilitado = (env: Record<string, string | undefined>) => env.AGENTE_API_ENABLED === "true" && (env.AGENTE_TOKEN ?? "").length >= 24;
