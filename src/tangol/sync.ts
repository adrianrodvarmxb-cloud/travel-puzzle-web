/**
 * REQ-3463: un paso del sync de tours de Tangol. Esta es la raíz del dominio: hace el I/O y recibe
 * TODAS sus dependencias por parámetro (DIP). Lo que se puede decidir sin I/O vive en
 * `lib/sync-plan.ts`; lo que escribe vive en el repositorio que se le pase.
 *
 * Un paso:
 *   1. pide los países de Tangol y, por cada país que las reglas no dejan fuera, sus destinos;
 *   2. ordena los destinos por id y decide el lote de este paso (se retoma donde quedó: 184 destinos);
 *   3. da de alta los países propios del proveedor que falten (REQ-3441/REQ-3442 + REQ-3462: con `iso2`);
 *   4. pide la lista de tours de cada destino del lote y las tarifas públicas de cada tour;
 *   5. planea (ciudades, reglas de Perú/Colombia, filas de `Tour`) y escribe.
 *
 * Blindaje: un registro malo se descarta y se cuenta; un destino que falla se cuenta y la corrida
 * sigue (regla 8). Lo único que detiene el paso sin escribir es no poder armar la lista completa de
 * destinos: con una lista incompleta el índice del lote apuntaría a otro destino al retomar.
 *
 * Ensayo (`ensayo: true`, el modo por omisión del workflow): hace exactamente las mismas lecturas y
 * el mismo plan, y NO llama a ninguna escritura del repositorio; tampoco guarda el avance, así que
 * se puede correr tantas veces como se quiera sin mover nada.
 */
import { planCountriesFromRepoData } from "@/catalog/provider-countries";
import type { ExistingCountry, ProviderCountryPlan } from "@/catalog/lib/provider-countries";
import { LANGUAGES, type TranslationRow } from "@/catalog/lib/tour-rows";
import type { AgencyTripPlace, TangolRulesDeps } from "./lib/catalog-rules";
import type { ExistingCity, NewCity, ProviderCityRow } from "./lib/cities";
import { summarizeRates } from "./lib/rates";
import { categoriaIdDeTangol } from "./lib/taxonomia";
import type { TangolTour } from "./lib/schemas";
import { TANGOL_PROVIDER_ID, type TangolTourRow } from "./lib/tour-rows";
import { checkTourCounts, type DestinationCount, type TourCountCheck } from "./lib/tour-count";
import {
  DESTINATIONS_PER_STEP,
  TANGOL_LANGUAGE,
  planTangolBatch,
  planTangolStep,
  tangolCountryCodes,
  tangolDestinationOrder,
  type TangolBatchPlan,
  type TangolSyncState,
} from "./lib/sync-plan";

/** Lo que el sync necesita de la base. Lo implementan `repository.ts` (D1) y el repo de SQL del script. */
export interface TangolSyncRepo {
  getState(): Promise<TangolSyncState | null>;
  saveState(state: Partial<TangolSyncState> & { lastSyncAt?: Date; toursCount?: number }): Promise<void>;
  /** Países del catálogo, con su `iso2`, para cruzar antes de crear (REQ-3441). */
  existingCountries(): Promise<ExistingCountry[]>;
  /** Ciudades del catálogo con su ISO-2 ya unido, para cruzar antes de crear (REQ-3367). */
  existingCities(): Promise<ExistingCity[]>;
  /** REQ-3462: alta de países con `iso2`. */
  upsertCountries(rows: readonly { id: number; code: string; iso2?: string | null; translations: Record<string, string> }[]): Promise<void>;
  /** Ciudades nuevas del proveedor (id del rango reservado o geonameid, con su slug). */
  upsertCities(rows: readonly NewCity[]): Promise<void>;
  /** REQ-3461: escritura por (proveedor, número). */
  upsertTours(rows: readonly { tour: TangolTourRow; translations: TranslationRow[] }[]): Promise<void>;
}

type Parsed<T> = { items: T[]; discarded: number };

export interface TangolReadApi {
  getCountries(): Promise<Parsed<{ isoCode: string; name: string; toursQty: number | null }>>;
  getDestinations(countryCode: string): Promise<Parsed<{ id: number; name: string; countryCode: string; toursQty: number | null }>>;
  getTourList(p: { destinationId: number; languageCode: number; currency: number; includeDetails?: boolean }): Promise<Parsed<TangolTour>>;
  getTourRates(p: { tourId: number; languageCode: string; currency: string }): Promise<Parameters<typeof summarizeRates>[0]>;
}

export interface TangolSyncDeps {
  api: TangolReadApi;
  repo: TangolSyncRepo;
  now: Date;
  /** Viajes de agencia que ya existen (REQ-3374). Dato, no código: lo pasa quien llama. */
  agencyTrips: readonly AgencyTripPlace[];
  /** Por omisión SÍ: cuenta y reporta lo que haría, sin escribir nada. */
  ensayo?: boolean;
  batch?: number;
  /** REQ-10518: ignora el avance guardado y arranca desde el destino 1 (p. ej. para refrescar todo el catálogo tras un cambio del sync). */
  reiniciar?: boolean;
  /** Códigos de idioma y moneda de Tangol (sin confirmar, REQ-1546: entran por parámetro). */
  languageCode?: number;
  currency?: number;
  ratesLanguage?: string;
  /**
   * REQ-10510: moneda que se le pide a `GetTourRates`. Por omisión `"USD"`; antes era `"0"` (la moneda por
   * omisión de Tangol), que en producción resultó ARS. El significado de los códigos no está confirmado por
   * Tangol: la fila guarda la moneda que DEVUELVE la tarifa y el reporte la cuenta (`monedas`).
   */
  ratesCurrency?: string;
  /** Moneda a usar cuando las tarifas no la declaran. */
  fallbackCurrency?: string | null;
  /** REQ-3502: por omisión, la categoría de su TypeCode|SubTypeCode en mapping/tangol.json (`categoriaIdDeTangol`). */
  categoryId?: (tour: TangolTour) => number;
  rules?: TangolRulesDeps;
  /** Alta de países propios del proveedor; por omisión, el dato versionado del repo (REQ-3442). */
  planCountries?: (countries: readonly ExistingCountry[]) => ProviderCountryPlan;
}

export interface TangolSyncReport {
  provider: string;
  ensayo: boolean;
  action: "start" | "continue" | "finish" | "idle" | "abort";
  /** Lote de destinos de este paso (1-based, inclusivo). */
  lote?: { from: number; to: number };
  totalDestinos: number;
  /** Registros que la validación de Zod tiró en la lista de tours. */
  invalidos: number;
  conteo?: TangolBatchPlan["conteo"];
  /** REQ-3505: «tours que dice el destino» contra «tours que llegaron en la lista», en este lote. */
  cuadre?: TourCountCheck;
  paisesNuevos: { id: number; iso2: string }[];
  ciudadesNuevas: { id: number; name: string; countryId: number; slug: string | null; idSource: NewCity["idSource"] }[];
  ciudadesPendientes: { externalId: string; name: string; countryCode: string; reason: string }[];
  mapeoCiudades?: ProviderCityRow[];
  excluidos: TangolBatchPlan["excluidos"];
  descartados: TangolBatchPlan["descartados"];
  /** REQ-10510: moneda pedida a Tangol y, por moneda que devolvió, cuántos tours (para verla en el resumen). */
  monedaPedida: string;
  monedas: Record<string, number>;
  /** Fallos que no tumbaron la corrida (un destino, una tarifa). */
  errores: { donde: string; error: string }[];
  /** Solo cuando el paso se detuvo sin escribir. */
  abortReason?: string;
}

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** REQ-3463: un paso del sync de Tangol. Devuelve lo que hizo (o lo que haría, en ensayo). */
export const DEFAULT_RATES_CURRENCY = "USD"; // REQ-10510

// REQ-3463, REQ-3505, REQ-10510
export async function runTangolSyncStep(deps: TangolSyncDeps): Promise<TangolSyncReport> {
  const {
    api, repo, now, agencyTrips, ensayo = true, batch = DESTINATIONS_PER_STEP, reiniciar = false,
    languageCode = 0, currency = 0, ratesLanguage = "0", ratesCurrency = DEFAULT_RATES_CURRENCY,
    fallbackCurrency = null, categoryId = categoriaIdDeTangol /* REQ-3502 */, rules, planCountries = planCountriesFromRepoData,
  } = deps;

  const errores: TangolSyncReport["errores"] = [];
  const monedas: Record<string, number> = {};
  const base: TangolSyncReport = {
    provider: TANGOL_PROVIDER_ID, ensayo, action: "idle", totalDestinos: 0, invalidos: 0,
    paisesNuevos: [], ciudadesNuevas: [], ciudadesPendientes: [], excluidos: [], descartados: [], monedaPedida: ratesCurrency, monedas, errores,
  };

  const state = await repo.getState();

  // 1. Países de Tangol y sus destinos. La lista completa es la que fija el orden y el índice del lote.
  const paises = await api.getCountries();
  const codes = tangolCountryCodes(paises.items, rules);
  const crudos: Awaited<ReturnType<TangolReadApi["getDestinations"]>>["items"] = [];
  let listaCompleta = true;
  for (const code of codes) {
    try {
      const r = await api.getDestinations(code);
      crudos.push(...r.items);
    } catch (e) {
      listaCompleta = false;
      errores.push({ donde: `destinos de ${code}`, error: msg(e) });
    }
  }
  const orden = tangolDestinationOrder(crudos);
  base.totalDestinos = orden.length;

  // Con la lista incompleta el índice del lote apuntaría a otro destino al retomar: no se escribe.
  if (!listaCompleta) {
    return { ...base, action: "abort", abortReason: "no se pudo armar la lista completa de destinos; no se escribe nada" };
  }

  // 2. Lote de este paso.
  const step = planTangolStep(reiniciar ? null : state, { total: orden.length, now, batch }); // REQ-10518
  if (step.action === "idle") return { ...base, action: "idle" };
  if (step.action === "finish") {
    if (!ensayo) await repo.saveState({ status: "completed", lastSyncAt: now });
    return { ...base, action: "finish" };
  }
  const runStartedAt = step.action === "start" ? now : (state?.runStartedAt ?? now);
  const lote = orden.slice(step.from - 1, step.to);

  // 3. Países del catálogo + alta de los que solo tiene el proveedor (REQ-3441/3442, con iso2 por REQ-3462).
  const existingCountries = await repo.existingCountries();
  const planPaises = planCountries(existingCountries);
  const paisesNuevos = planPaises.nuevos;
  if (!ensayo && paisesNuevos.length > 0) {
    await repo.upsertCountries(paisesNuevos.map((p) => ({ id: p.id, code: p.code, iso2: p.iso2, translations: p.translations })));
  }
  // El plan de ciudades debe ver también los países que este paso acaba de dar de alta (o daría, en ensayo).
  const countries = [
    ...existingCountries.map((c) => ({ id: c.id, iso2: c.iso2 })),
    ...paisesNuevos.map((p) => ({ id: p.id, iso2: p.iso2 })),
  ];

  // 4. Tours de cada destino del lote y sus tarifas públicas.
  const cities = await repo.existingCities();
  const toursPorDestino = new Map<number, TangolTour[]>();
  const tarifas = new Map<number, ReturnType<typeof summarizeRates> | null>();
  const conteos: DestinationCount[] = [];
  let invalidos = 0;
  for (const destino of lote) {
    try {
      const lista = await api.getTourList({ destinationId: destino.id, languageCode, currency, includeDetails: true });
      invalidos += lista.discarded;
      toursPorDestino.set(destino.id, lista.items);
      // REQ-3505: lo que dice el destino contra lo que llegó en su lista.
      conteos.push({ id: destino.id, name: destino.name, declarados: destino.toursQty, recibidos: lista.items.length, invalidos: lista.discarded });
      for (const tour of lista.items) {
        try {
          const resumen = summarizeRates(await api.getTourRates({ tourId: tour.tourId, languageCode: ratesLanguage, currency: ratesCurrency }));
          tarifas.set(tour.tourId, resumen);
          // REQ-10510: la moneda que devolvió Tangol (la de la tarifa, o la del encabezado), para el resumen.
          const moneda = (resumen.rates[0]?.currency ?? resumen.currency ?? "").trim().toUpperCase() || "sin-moneda";
          monedas[moneda] = (monedas[moneda] ?? 0) + 1;
        } catch (e) {
          tarifas.set(tour.tourId, null);
          errores.push({ donde: `tarifas del tour ${tour.tourId}`, error: msg(e) });
        }
      }
    } catch (e) {
      toursPorDestino.set(destino.id, []);
      conteos.push({ id: destino.id, name: destino.name, declarados: destino.toursQty, recibidos: 0, invalidos: 0, fallo: true });
      errores.push({ donde: `tours del destino ${destino.id} (${destino.name})`, error: msg(e) });
    }
  }
  base.invalidos = invalidos;

  // 5. Plan y escritura.
  const plan = planTangolBatch({
    destinos: lote, toursPorDestino, cities, countries, agencyTrips, seenAt: runStartedAt,
    rates: (tour) => tarifas.get(tour.tourId) ?? null,
    language: TANGOL_LANGUAGE, categoryId, fallbackCurrency, rules,
  });

  if (!ensayo) {
    if (plan.cities.nuevas.length > 0) await repo.upsertCities(plan.cities.nuevas);
    if (plan.rows.length > 0) await repo.upsertTours(plan.rows);
    await repo.saveState({
      status: step.to >= orden.length ? "completed" : "in_progress",
      nextPage: step.to + 1,
      totalPages: orden.length,
      runStartedAt,
      lastSyncAt: now,
    });
  }

  return {
    ...base,
    action: step.action,
    lote: { from: step.from, to: step.to },
    invalidos,
    conteo: plan.conteo,
    cuadre: checkTourCounts(conteos),
    paisesNuevos: paisesNuevos.map((p) => ({ id: p.id, iso2: p.iso2 })),
    ciudadesNuevas: plan.cities.nuevas.map((c) => ({ id: c.id, name: c.name, countryId: c.countryId, slug: c.slug, idSource: c.idSource })),
    ciudadesPendientes: plan.cities.pendientes,
    mapeoCiudades: plan.cities.mapeo,
    excluidos: plan.excluidos,
    descartados: plan.descartados,
    errores,
  };
}

/**
 * Las traducciones de una ciudad nueva en los 6 idiomas del sitio. El proveedor solo da un nombre,
 * así que va el mismo en todos; una corrección a mano del PO sobrevive porque la ciudad nunca se
 * reescribe (REQ-130: el alta es `ON CONFLICT DO NOTHING`).
 */
// REQ-3463
export function cityTranslations(name: string): Record<string, string> {
  return Object.fromEntries(LANGUAGES.map((l) => [l, name]));
}
