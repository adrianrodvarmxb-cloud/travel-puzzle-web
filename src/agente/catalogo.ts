// Catálogo para el agente de WhatsApp (REQ-148..152). Orquesta: lee las tarjetas publicadas (con su caché) y las
// agencias; la lógica pura vive en ./lib/catalogo. Las dependencias llegan por parámetro.
import type { TripCard } from "@/trips/public-load";
import { aTourAgente, type TourIndiceRow, type ViajeAgente } from "./lib/catalogo";

export interface CatalogoDeps {
  tarjetas(lang: string): Promise<TripCard[]>;
  agencias(): Promise<{ id: string; name: string }[]>;
  /** REQ-10849: índice ligero de los tours con adaptador en el modelo común (hoy Tangol); opcional en las pruebas viejas. */
  tours?(lang: string): Promise<TourIndiceRow[]>;
}

/** Proveedores de tours que entran a la búsqueda del agente (decisión 40). FREETOUR jamás (decisión 42). */
export const TOURS_PROVEEDORES_AGENTE = ["tangol"] as const;

/**
 * REQ-10849: los tours del índice como `ViajeAgente`, para que `buscarViajes` los puntúe junto a los viajes.
 * Si el índice falla, la búsqueda sigue solo con viajes (regla 7) y se registra.
 */
export async function toursParaAgente(deps: CatalogoDeps, lang = "es", log: (m: string) => void = (m) => console.warn("[agente] tours:", m)): Promise<ViajeAgente[]> {
  if (!deps.tours) return [];
  try {
    return (await deps.tours(lang)).map((r) => aTourAgente(r, lang)).filter((v): v is ViajeAgente => v !== null);
  } catch (e) {
    log((e as Error).message);
    return [];
  }
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
    tours: indiceToursAgente,
  };
}

/**
 * REQ-10849: índice ligero de los tours de los proveedores con adaptador (una sola consulta a D1, con la caché del
 * catálogo y reintento ante D1 saturada). Candado 1 del gate C (REQ-3311): `providerSql` quita a los proveedores tras
 * bandera apagada; un tour retirado (`syncStatus` = removed, 0014) no existe. Solo columnas públicas: ni neto ni teléfonos.
 */
export async function indiceToursAgente(lang: string): Promise<TourIndiceRow[]> {
  const { getD1 } = await import("@/lib/prisma");
  const { providerSql } = await import("@/catalog/lib/provider-visibility");
  const { cached, cacheKey, POLICY } = await import("@/cache/edge");
  const { withRetry } = await import("@/tours/lib/d1-load");
  const env = process.env as Record<string, string | undefined>;
  const idioma = lang === "en" ? "en" : "es";
  const proveedores = TOURS_PROVEEDORES_AGENTE.map((p) => `'${p}'`).join(", ");
  const sql = `SELECT t."id", t."slug", t."providerId", t."priceValue", t."priceCurrency", t."durationMinutes", t."departureDates",
      tr."title", tr."brief", c."slug" AS "citySlug", c."translations" AS "cityTranslations", co."iso2" AS "countryIso2", co."translations" AS "countryTranslations"
    FROM "Tour" t
    JOIN "TourTranslation" tr ON tr."tourId" = t."id" AND tr."language" = ?1
    JOIN "City" c ON c."id" = t."cityId"
    JOIN "Country" co ON co."id" = t."countryId"
    WHERE t."isActive" = 1 AND t."providerId" IN (${proveedores}) AND COALESCE(t."syncStatus", 'active') <> 'removed'${providerSql(env, "t")}`;
  type D1 = { prepare(sql: string): { bind(...v: unknown[]): { all(): Promise<{ results: Record<string, unknown>[] }> } } };
  return cached(cacheKey("agenteTours", { lang: idioma, v: "1" }), POLICY.toursList, () => withRetry(async () => {
    const { results } = await (getD1() as unknown as D1).prepare(sql).bind(idioma).all();
    return results.map((r) => ({ ...r, priceValue: Number(r.priceValue) })) as unknown as TourIndiceRow[];
  }));
}

/** REQ-152: la ventana del agente solo existe con la bandera encendida y la llave cargada. */
export const agenteHabilitado = (env: Record<string, string | undefined>) => env.AGENTE_API_ENABLED === "true" && (env.AGENTE_TOKEN ?? "").length >= 24;
