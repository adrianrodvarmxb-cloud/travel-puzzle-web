/**
 * REQ-3463: el plan del sync de tours de Tangol. Puro: no toca red, base ni reloj del sistema.
 *
 * Aquí vive TODO lo que se puede decidir sin I/O, para que el paso del sync (`src/tangol/sync.ts`)
 * sea solo «pedir → planear → escribir». Reusa, sin reescribir, las piezas que ya existen:
 *   - `toTangolTourRows`  (REQ-3370/3371/3372)  → la fila de `Tour` y su traducción.
 *   - `tangolTourDecision` (REQ-3373/3374/3375) → Perú y Colombia reservados, México fuera.
 *   - `planProviderCities` (REQ-3367/3368)      → ciudad del catálogo o ciudad nueva con id del rango.
 * Y recibe por parámetro (DIP) las tarifas, las ciudades y los países que ya existen, y los viajes
 * de agencia: este archivo nunca los va a buscar.
 *
 * Son 184 destinos, así que la corrida va por lotes y se retoma: el estado es el mismo que usa
 * Freetour (`SyncMetadata`, una fila por proveedor) y el «número de página» es el índice del
 * siguiente destino de la lista ordenada. La lista se ordena por id, así que no depende del orden
 * en que la API devuelva los destinos y retomar siempre cae en el mismo lugar.
 */
import { mexicoDay, mexicoHour, DAILY_START_HOUR } from "@/catalog/lib/sync-plan";
import { LANGUAGES, type TranslationRow } from "@/catalog/lib/tour-rows";
import { planProviderCities, type ExistingCity, type PendingCity, type ProviderCityPlan } from "./cities";
import { tangolTourDecision, type AgencyTripPlace, type TangolRulesDeps } from "./catalog-rules";
import {
  TANGOL_PROVIDER_ID,
  toTangolTourRows,
  type DiscardReason,
  type TangolTourRow,
} from "./tour-rows";
import type { RatesSummary } from "./rates";
import type { TangolCountry, TangolDestination, TangolTour } from "./schemas";

type Lang = (typeof LANGUAGES)[number];

/** Destinos por paso. 184 destinos / 10 = 19 pasos; cada paso cabe de sobra en un minuto de Worker. */
export const DESTINATIONS_PER_STEP = 10;

/**
 * Categoría provisional de un tour de Tangol. La categoría de verdad la pone la taxonomía (otro
 * frente): `Tour.categoryId` no tiene llave foránea y el 0 no lo usa ningún categoryId de Freetour
 * (1-35), así que un tour sin clasificar queda señalado y no se cuela como otra cosa.
 */
export const TANGOL_UNCLASSIFIED_CATEGORY_ID = 0;

/** Idioma en el que se piden y se guardan los textos de Tangol mientras REQ-1546 siga abierto. */
export const TANGOL_LANGUAGE: Lang = "es";

export interface TangolSyncState {
  status: string;
  nextPage: number;
  totalPages: number;
  runStartedAt: Date | null;
}

export type TangolStep =
  | { action: "start"; from: number; to: number }
  | { action: "continue"; from: number; to: number }
  | { action: "finish" }
  | { action: "idle" };

/**
 * REQ-3463: países de los que se piden destinos. Se quitan los que las reglas dejan fuera (México,
 * REQ-3373) antes de gastar una llamada, y los que el propio Tangol declara sin tours.
 */
// REQ-3463
export function tangolCountryCodes(
  countries: readonly TangolCountry[],
  deps: Pick<TangolRulesDeps, "countriesOut"> = {},
): string[] {
  const fuera = new Set((deps.countriesOut ?? ["MX"]).map((c) => c.trim().toUpperCase()));
  const codes = countries
    .map((c) => (c.isoCode ?? "").trim().toUpperCase())
    .filter((c, i, all) => /^[A-Z]{2}$/.test(c) && all.indexOf(c) === i && !fuera.has(c))
    .filter((c) => {
      const qty = countries.find((x) => (x.isoCode ?? "").trim().toUpperCase() === c)?.toursQty;
      return qty === null || qty === undefined || qty > 0;
    });
  return codes.sort();
}

/** REQ-3463: orden estable de los destinos (por id). Retomar un lote siempre cae en el mismo destino. */
// REQ-3463
export function tangolDestinationOrder(destinos: readonly TangolDestination[]): TangolDestination[] {
  const vistos = new Map<number, TangolDestination>();
  for (const d of destinos) if (!vistos.has(d.id)) vistos.set(d.id, d);
  return [...vistos.values()].sort((a, b) => a.id - b.id);
}

/**
 * REQ-3463: qué hace esta ejecución. Misma forma que Freetour (`planSyncStep`): una corrida al día
 * a partir de las 3:00 de CDMX, por lotes, y al terminar se queda quieta.
 */
// REQ-3463
export function planTangolStep(
  state: TangolSyncState | null,
  { total, now, batch = DESTINATIONS_PER_STEP }: { total: number; now: Date; batch?: number },
): TangolStep {
  const tamano = Math.max(1, Math.floor(batch));
  const lote = (from: number): { from: number; to: number } => ({ from, to: Math.min(from + tamano - 1, total) });

  if (total <= 0) return { action: "idle" };
  if (!state || !state.runStartedAt) return { action: "start", ...lote(1) };

  const mismoDia = mexicoDay(state.runStartedAt) === mexicoDay(now);
  if (!mismoDia && mexicoHour(now) >= DAILY_START_HOUR) return { action: "start", ...lote(1) };
  if (state.status === "completed") return { action: "idle" };
  if (state.nextPage > total) return { action: "finish" };
  return { action: "continue", ...lote(Math.max(1, state.nextPage)) };
}

// ───────────── Un lote: destinos → ciudades → filas de Tour ─────────────

/** Ciudad ya resuelta de un destino, con lo que hace falta para armar la URL propia. */
interface ResolvedCity {
  cityId: number;
  countryId: number;
  iso2: string | null;
  slug: string | null;
}

export interface TangolBatchInput {
  provider?: string;
  /** Destinos de ESTE lote (ya ordenados y recortados por `planTangolStep`). */
  destinos: readonly TangolDestination[];
  /** Tours ya validados (`infoTourSchema`) por destino. */
  toursPorDestino: ReadonlyMap<number, readonly TangolTour[]>;
  /** Tarifas públicas ya pedidas y resumidas; `null` = sin tarifa → el tour se descarta. */
  rates: (tour: TangolTour) => RatesSummary | null;
  /** Ciudades y países que YA existen en el catálogo (los lee quien hace el I/O). */
  cities: readonly ExistingCity[];
  countries: readonly { id: number; iso2: string | null }[];
  /** Viajes de agencia que ya existen, para las reglas de Perú y Colombia (REQ-3374). */
  agencyTrips: readonly AgencyTripPlace[];
  seenAt: Date;
  language?: Lang;
  categoryId?: (tour: TangolTour) => number;
  fallbackCurrency?: string | null;
  rules?: TangolRulesDeps;
}

export interface TangolBatchPlan {
  /** Plan de ciudades: mapeo, ciudades nuevas por crear y destinos que no se resolvieron. */
  cities: ProviderCityPlan;
  /** Filas listas para el escritor por proveedor (REQ-3461). */
  rows: { tour: TangolTourRow; translations: TranslationRow[] }[];
  /** Tours que las reglas dejan fuera (ciudad de Inca World o Destino Colombia, México). */
  excluidos: { tourId: number; destinationId: number; motivo: string }[];
  /** Registros malos: se cuentan y se tiran, nunca tumban la corrida (regla 8 del blindaje). */
  descartados: { tourId: number; destinationId: number; reason: DiscardReason }[];
  conteo: {
    destinos: number;
    destinosPendientes: number;
    tours: number;
    escritos: number;
    excluidos: number;
    descartados: number;
    ciudadesNuevas: number;
  };
}

/** REQ-3463: la URL propia de la traducción. Nunca `UrlTour` (REQ-3372): el proveedor no se enlaza. */
// REQ-3463
export function ownCityPath(city: Pick<ResolvedCity, "iso2" | "slug">): string {
  const iso = (city.iso2 ?? "").trim().toLowerCase();
  return iso && city.slug ? `/destinos/${iso}/${city.slug}` : "/tours";
}

/**
 * REQ-3463: convierte un lote de destinos en lo que hay que escribir. No escribe: devuelve el plan.
 *
 * Un destino que no se resolvió a una ciudad queda en `cities.pendientes` y sus tours se cuentan
 * como descartados por «sin-ciudad»: nunca se les inventa un `cityId`.
 */
// REQ-3463
export function planTangolBatch(input: TangolBatchInput): TangolBatchPlan {
  const provider = input.provider ?? TANGOL_PROVIDER_ID;
  const destinos = input.destinos;

  const cities = planProviderCities({
    provider,
    destinos: destinos.map((d) => ({ externalId: String(d.id), name: d.name, countryCode: d.countryCode })),
    cities: input.cities,
    countries: input.countries,
  });

  const isoByCountryId = new Map(input.countries.map((c) => [c.id, (c.iso2 ?? "").trim().toUpperCase() || null]));
  const resueltas = new Map<number, ResolvedCity>();
  for (const c of input.cities) {
    resueltas.set(c.id, { cityId: c.id, countryId: c.countryId, iso2: (c.iso2 ?? "").trim().toUpperCase() || null, slug: c.slug });
  }
  for (const n of cities.nuevas) {
    resueltas.set(n.id, { cityId: n.id, countryId: n.countryId, iso2: isoByCountryId.get(n.countryId) ?? null, slug: n.slug });
  }
  const cityIdByDestino = new Map(cities.mapeo.map((m) => [m.externalId, m.cityId]));

  const rows: TangolBatchPlan["rows"] = [];
  const excluidos: TangolBatchPlan["excluidos"] = [];
  const descartados: TangolBatchPlan["descartados"] = [];
  let tours = 0;
  let destinosPendientes = 0;

  for (const destino of destinos) {
    const lista = input.toursPorDestino.get(destino.id) ?? [];
    tours += lista.length;

    const cityId = cityIdByDestino.get(String(destino.id));
    const ciudad = cityId === undefined ? undefined : resueltas.get(cityId);
    if (!ciudad) {
      // El destino quedó pendiente (sin país en el catálogo, sin nombre usable o rango agotado).
      destinosPendientes++;
      for (const t of lista) descartados.push({ tourId: t.tourId, destinationId: destino.id, reason: "sin-ciudad" });
      continue;
    }

    // REQ-3373/3374: la decisión es del destino (país + ciudad), así que se toma una vez por destino.
    const decision = tangolTourDecision({ country: destino.countryCode, city: destino.name }, input.agencyTrips, input.rules);
    if (!decision.publicar) {
      for (const t of lista) excluidos.push({ tourId: t.tourId, destinationId: destino.id, motivo: decision.motivo });
      continue;
    }

    const href = ownCityPath(ciudad);
    const batch = toTangolTourRows(lista, {
      place: () => ({ cityId: ciudad.cityId, countryId: ciudad.countryId }),
      rates: input.rates,
      url: () => href,
      categoryId: input.categoryId ?? (() => TANGOL_UNCLASSIFIED_CATEGORY_ID),
      language: input.language ?? TANGOL_LANGUAGE,
      seenAt: input.seenAt,
      fallbackCurrency: input.fallbackCurrency ?? null,
    });
    rows.push(...batch.rows);
    for (const d of batch.discarded) descartados.push({ ...d, destinationId: destino.id });
  }

  return {
    cities,
    rows,
    excluidos,
    descartados,
    conteo: {
      destinos: destinos.length,
      destinosPendientes,
      tours,
      escritos: rows.length,
      excluidos: excluidos.length,
      descartados: descartados.length,
      ciudadesNuevas: cities.nuevas.length,
    },
  };
}

/** Destinos que no se resolvieron, para el reporte del ensayo. */
export type { PendingCity };
