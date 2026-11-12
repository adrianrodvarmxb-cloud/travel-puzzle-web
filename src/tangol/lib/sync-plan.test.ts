import { describe, it, expect } from "vitest";
import {
  DESTINATIONS_PER_STEP,
  TANGOL_UNCLASSIFIED_CATEGORY_ID,
  ownCityPath,
  planTangolBatch,
  planTangolStep,
  tangolCountryCodes,
  tangolDestinationOrder,
} from "./sync-plan";
import type { ExistingCity } from "./cities";
import type { AgencyTripPlace } from "./catalog-rules";
import type { TangolTour } from "./schemas";
import type { RatesSummary } from "./rates";

const now = new Date("2026-11-12T18:00:00Z"); // 12:00 en CDMX

const tour = (tourId: number, over: Partial<TangolTour> = {}): TangolTour => ({
  tourId,
  name: `Tour ${tourId}`,
  languageCode: 0,
  currency: 0,
  minRate: 50,
  duration: "3 Horas",
  homePic: "https://cdn.ejemplo/portada.jpg",
  typeCode: "EXC",
  subTypeCode: "CITY",
  tourType: 1,
  months: [],
  details: null,
  ...over,
});

const tarifa = (adult = 100, currency: string | null = "USD"): RatesSummary => ({
  tourId: 0,
  currency,
  options: [],
  rates: [{ option: "A", currency, paxFrom: 1, paxTo: 4, rackAdult: adult, rackChild: null, rackInfant: null, validFrom: null, validTo: null }],
  blackouts: [],
  discarded: 0,
  fromAdult: adult,
});

const city = (over: Partial<ExistingCity> & Pick<ExistingCity, "id" | "countryId">): ExistingCity => ({
  iso2: "AR",
  slug: null,
  stateCode: null,
  geonameid: null,
  translations: {},
  ...over,
});

const PAISES = [
  { id: 1, iso2: "AR" },
  { id: 2, iso2: "PE" },
];
const CIUDADES = [
  city({ id: 10, countryId: 1, iso2: "AR", slug: "buenos-aires", translations: { es: "Buenos Aires", en: "Buenos Aires" } }),
  city({ id: 11, countryId: 2, iso2: "PE", slug: "cusco", translations: { es: "Cusco", en: "Cusco" } }),
];
const BUENOS_AIRES = { id: 100, name: "Buenos Aires", countryCode: "AR", toursQty: 5 };
const CUSCO = { id: 200, name: "Cusco", countryCode: "PE", toursQty: 3 };

const INCA: AgencyTripPlace[] = [{ agency: "Inca World Peru", countries: ["PE"], cities: ["Cusco"] }];

describe("REQ-3463: países y destinos de los que se pide el catálogo", () => {
  it("REQ-3463: México nunca se pide (REQ-3373) y los países sin tours tampoco", () => {
    const codes = tangolCountryCodes([
      { isoCode: "mx", name: "México", toursQty: 40 },
      { isoCode: "AR", name: "Argentina", toursQty: 300 },
      { isoCode: "BR", name: "Brasil", toursQty: 0 },
      { isoCode: "PE", name: "Perú", toursQty: null },
      { isoCode: "", name: "basura", toursQty: 1 },
      { isoCode: "AR", name: "repetido", toursQty: 300 },
    ]);
    expect(codes).toEqual(["AR", "PE"]);
  });

  it("REQ-3463: los destinos se ordenan por id y sin repetir, para poder retomar el lote", () => {
    const orden = tangolDestinationOrder([CUSCO, BUENOS_AIRES, { ...CUSCO, name: "Cusco (repetido)" }]);
    expect(orden.map((d) => d.id)).toEqual([100, 200]);
    expect(orden[1].name).toBe("Cusco");
  });
});

describe("REQ-3463: la corrida va por lotes y se retoma", () => {
  it("REQ-3463: sin estado arranca en el primer destino con el lote por omisión", () => {
    expect(planTangolStep(null, { total: 184, now })).toEqual({ action: "start", from: 1, to: DESTINATIONS_PER_STEP });
  });

  it("REQ-3463: con estado del día retoma donde quedó y el último lote se recorta al total", () => {
    const state = { status: "in_progress", nextPage: 181, totalPages: 184, runStartedAt: now };
    expect(planTangolStep(state, { total: 184, now })).toEqual({ action: "continue", from: 181, to: 184 });
  });

  it("REQ-3463: pasado el último destino cierra la corrida, y una corrida cerrada se queda quieta", () => {
    const base = { nextPage: 185, totalPages: 184, runStartedAt: now };
    expect(planTangolStep({ ...base, status: "in_progress" }, { total: 184, now })).toEqual({ action: "finish" });
    expect(planTangolStep({ ...base, status: "completed", nextPage: 10 }, { total: 184, now })).toEqual({ action: "idle" });
  });

  it("REQ-3463: una corrida de ayer vuelve a arrancar en el primer destino", () => {
    const ayer = new Date("2026-11-11T18:00:00Z");
    const state = { status: "in_progress", nextPage: 50, totalPages: 184, runStartedAt: ayer };
    expect(planTangolStep(state, { total: 184, now, batch: 5 })).toEqual({ action: "start", from: 1, to: 5 });
  });

  it("REQ-3463: sin destinos no hay nada que hacer (nunca se escribe por una lista vacía)", () => {
    expect(planTangolStep(null, { total: 0, now })).toEqual({ action: "idle" });
  });
});

describe("REQ-3463: un lote de destinos se convierte en filas de Tour", () => {
  const entrada = (over: Partial<Parameters<typeof planTangolBatch>[0]> = {}) =>
    planTangolBatch({
      destinos: [BUENOS_AIRES],
      toursPorDestino: new Map([[100, [tour(1234)]]]),
      rates: () => tarifa(),
      cities: CIUDADES,
      countries: PAISES,
      agencyTrips: [],
      seenAt: now,
      ...over,
    });

  it("REQ-3463: un tour bueno sale con proveedor tangol, su ciudad del catálogo y precio público", () => {
    const plan = entrada();
    expect(plan.conteo).toMatchObject({ destinos: 1, tours: 1, escritos: 1, excluidos: 0, descartados: 0, ciudadesNuevas: 0 });
    const [fila] = plan.rows;
    expect(fila.tour.providerId).toBe("tangol");
    expect(fila.tour.externalId).toBe(1234);
    expect(fila.tour.cityId).toBe(10);
    expect(fila.tour.countryId).toBe(1);
    expect(fila.tour.priceValue).toBe(100);
    expect(fila.tour.priceCurrency).toBe("USD");
    expect(fila.tour.providerTitle).toBe("Travel Puzzle");
    expect(fila.tour.categoryId).toBe(TANGOL_UNCLASSIFIED_CATEGORY_ID);
    // La URL es propia (REQ-3372): nunca la del proveedor.
    expect(fila.translations[0].url).toBe("/destinos/ar/buenos-aires");
  });

  it("REQ-3463: un tour en ciudad excluida por las reglas NO se escribe y queda contado", () => {
    const plan = planTangolBatch({
      destinos: [BUENOS_AIRES, CUSCO],
      toursPorDestino: new Map([[100, [tour(1)]], [200, [tour(2), tour(3)]]]),
      rates: () => tarifa(),
      cities: CIUDADES,
      countries: PAISES,
      agencyTrips: INCA,
      seenAt: now,
    });
    expect(plan.rows.map((r) => r.tour.externalId)).toEqual([1]);
    expect(plan.conteo).toMatchObject({ destinos: 2, tours: 3, escritos: 1, excluidos: 2 });
    expect(plan.excluidos.map((e) => e.tourId)).toEqual([2, 3]);
    expect(plan.excluidos[0].motivo).toMatch(/Inca World/);
  });

  it("REQ-3463: México nunca entra, aunque no haya viajes nuestros", () => {
    const plan = planTangolBatch({
      destinos: [{ id: 300, name: "Cancún", countryCode: "MX", toursQty: 9 }],
      toursPorDestino: new Map([[300, [tour(7)]]]),
      rates: () => tarifa(),
      cities: [city({ id: 12, countryId: 3, iso2: "MX", slug: "cancun", translations: { es: "Cancún" } })],
      countries: [{ id: 3, iso2: "MX" }],
      agencyTrips: [],
      seenAt: now,
    });
    expect(plan.rows).toHaveLength(0);
    expect(plan.excluidos[0].motivo).toMatch(/REQ-3373/);
  });

  it("REQ-3463: un registro malo se descarta, se cuenta y no tumba el lote", () => {
    const plan = entrada({
      // El 3 se queda sin título al quitarle el nombre del proveedor (REQ-3372).
      toursPorDestino: new Map([[100, [tour(1), tour(2), tour(3, { name: "Tangol" })]]]),
      // El 2 no trae tarifa pública: se descarta por «sin-precio-publico».
      rates: (t) => (t.tourId === 2 ? null : tarifa()),
    });
    expect(plan.rows.map((r) => r.tour.externalId)).toEqual([1]);
    expect(plan.conteo).toMatchObject({ tours: 3, escritos: 1, descartados: 2 });
    expect(plan.descartados).toEqual([
      { tourId: 2, destinationId: 100, reason: "sin-precio-publico" },
      { tourId: 3, destinationId: 100, reason: "sin-titulo" },
    ]);
  });

  it("REQ-3463: una ciudad que Tangol tiene y el catálogo no se crea con id del rango reservado", () => {
    const plan = entrada({
      destinos: [{ id: 400, name: "El Calafate", countryCode: "AR", toursQty: 4 }],
      toursPorDestino: new Map([[400, [tour(55)]]]),
    });
    expect(plan.cities.nuevas).toHaveLength(1);
    expect(plan.cities.nuevas[0].id).toBeGreaterThanOrEqual(9_000_001);
    expect(plan.cities.nuevas[0].name).toBe("El Calafate");
    expect(plan.rows[0].tour.cityId).toBe(plan.cities.nuevas[0].id);
    expect(plan.rows[0].tour.countryId).toBe(1);
    expect(plan.conteo.ciudadesNuevas).toBe(1);
  });

  it("REQ-3463: un destino cuyo país no está en el catálogo queda PENDIENTE y sus tours no se escriben", () => {
    const plan = entrada({
      destinos: [{ id: 500, name: "Asunción", countryCode: "PY", toursQty: 1 }],
      toursPorDestino: new Map([[500, [tour(88)]]]),
    });
    expect(plan.rows).toHaveLength(0);
    expect(plan.cities.pendientes[0].reason).toMatch(/PY no está en el catálogo/);
    expect(plan.conteo).toMatchObject({ destinosPendientes: 1, descartados: 1, escritos: 0 });
    expect(plan.descartados[0]).toEqual({ tourId: 88, destinationId: 500, reason: "sin-ciudad" });
  });

  it("REQ-3463: la URL propia cae en /tours mientras la ciudad no tenga slug (nunca una URL inventada)", () => {
    expect(ownCityPath({ iso2: "AR", slug: "ushuaia" })).toBe("/destinos/ar/ushuaia");
    expect(ownCityPath({ iso2: "AR", slug: null })).toBe("/tours");
    expect(ownCityPath({ iso2: null, slug: "ushuaia" })).toBe("/tours");
  });

  it("REQ-3463: sin destinos el plan está vacío y no hay nada que escribir", () => {
    const plan = entrada({ destinos: [], toursPorDestino: new Map() });
    expect(plan.rows).toEqual([]);
    expect(plan.cities.nuevas).toEqual([]);
    expect(plan.conteo).toMatchObject({ destinos: 0, tours: 0, escritos: 0 });
  });
});
