import { describe, it, expect, vi } from "vitest";
import { runTangolSyncStep, cityTranslations, type TangolReadApi, type TangolSyncRepo } from "./sync";
import type { TangolSyncState } from "./lib/sync-plan";
import type { ExistingCity } from "./lib/cities";
import { parseTourRates, type TangolTour } from "./lib/schemas";
import type { AgencyTripPlace } from "./lib/catalog-rules";

const now = new Date("2026-11-12T18:00:00Z");

const tour = (tourId: number, over: Partial<TangolTour> = {}): TangolTour => ({
  tourId, name: `Tour ${tourId}`, languageCode: 0, currency: 0, minRate: 50, duration: "3 Horas",
  homePic: "https://cdn.ejemplo/portada.jpg", typeCode: "EXC", subTypeCode: "CITY", tourType: 1, months: [], details: null, ...over,
});

/** Tarifas como las entrega la pasarela, pasadas por el esquema real (REQ-1542). */
const tarifas = (tourId: number) => parseTourRates(tarifasCrudas(tourId));

const tarifasCrudas = (tourId: number) => ({
  TourId: tourId,
  Currency: "USD",
  ListTourOption: [{ Code: "A", Description: "Regular", MinRate: 100, StartTime: "09:00", HoursBooking: 24, HoursCancelation: 48 }],
  ListTourRate: [{ TourOption: "A", Currency: "USD", PaxFrom: 1, PaxTo: 4, RackRateAdu: 100, RackRateChd: 50, RackRateInf: null, ValidFrom: null, ValidTo: null }],
  ListBlackDate: [],
});

const CIUDADES: ExistingCity[] = [
  { id: 10, countryId: 1, iso2: "AR", slug: "buenos-aires", stateCode: null, geonameid: null, translations: { es: "Buenos Aires" } },
  { id: 11, countryId: 2, iso2: "PE", slug: "cusco", stateCode: null, geonameid: null, translations: { es: "Cusco" } },
];
const PAISES = [
  { id: 1, code: "AR", iso2: "AR" },
  { id: 2, code: "PE", iso2: "PE" },
];

/** Repositorio espía: no escribe nada, solo anota qué se le pidió. */
function spyRepo(state: TangolSyncState | null = null) {
  const escrituras: string[] = [];
  const guardado: unknown[] = [];
  const repo: TangolSyncRepo = {
    getState: async () => state,
    saveState: async (s) => { escrituras.push("saveState"); guardado.push(s); },
    existingCountries: async () => PAISES,
    existingCities: async () => CIUDADES,
    upsertCountries: async (r) => { escrituras.push(`upsertCountries:${r.length}`); guardado.push(r); },
    upsertCities: async (r) => { escrituras.push(`upsertCities:${r.length}`); guardado.push(r); },
    upsertTours: async (r) => { escrituras.push(`upsertTours:${r.length}`); guardado.push(r); },
  };
  return { repo, escrituras, guardado };
}

function fakeApi(over: Partial<TangolReadApi> = {}): TangolReadApi {
  return {
    getCountries: async () => ({
      items: [
        { isoCode: "AR", name: "Argentina", toursQty: 300 },
        { isoCode: "PE", name: "Perú", toursQty: 200 },
        { isoCode: "MX", name: "México", toursQty: 40 },
      ],
      discarded: 0,
    }),
    getDestinations: async (code) => ({
      items: code === "AR"
        ? [{ id: 100, name: "Buenos Aires", countryCode: "AR", toursQty: 5 }]
        : [{ id: 200, name: "Cusco", countryCode: "PE", toursQty: 3 }],
      discarded: 0,
    }),
    getTourList: async ({ destinationId }) => ({
      items: destinationId === 100 ? [tour(1234)] : [tour(5678)],
      discarded: destinationId === 100 ? 1 : 0,
    }),
    getTourRates: async ({ tourId }) => tarifas(Number(tourId)),
    ...over,
  };
}

const sinPaisesNuevos = () => ({ mapeo: [], nuevos: [], pendientes: [] });

const correr = (over: Partial<Parameters<typeof runTangolSyncStep>[0]> = {}, repo = spyRepo().repo, agencyTrips: AgencyTripPlace[] = []) =>
  runTangolSyncStep({ api: fakeApi(), repo, now, agencyTrips, planCountries: sinPaisesNuevos, ...over });

describe("REQ-3463: un paso del sync de Tangol", () => {
  it("REQ-3464: el ensayo (modo por omisión) no escribe NADA, ni el avance", async () => {
    const { repo, escrituras } = spyRepo();
    const report = await runTangolSyncStep({ api: fakeApi(), repo, now, agencyTrips: [], planCountries: sinPaisesNuevos });
    expect(report.ensayo).toBe(true);
    expect(escrituras).toEqual([]);
    // Y aun así reporta lo que haría.
    expect(report.action).toBe("start");
    expect(report.conteo).toMatchObject({ destinos: 2, tours: 2, escritos: 2 });
  });

  it("REQ-3463: con ensayo apagado escribe ciudades, tours y el avance, en ese orden", async () => {
    const { repo, escrituras, guardado } = spyRepo();
    const report = await correr({ ensayo: false }, repo);
    expect(escrituras).toEqual(["upsertTours:2", "saveState"]);
    expect(report.conteo).toMatchObject({ escritos: 2, ciudadesNuevas: 0 });
    const filas = guardado[0] as { tour: { providerId: string; externalId: number } }[];
    expect(filas.map((f) => [f.tour.providerId, f.tour.externalId])).toEqual([["tangol", 1234], ["tangol", 5678]]);
    expect(guardado[1]).toMatchObject({ status: "completed", nextPage: 3, totalPages: 2, runStartedAt: now });
  });

  it("REQ-3463: México no se le pide a Tangol (una llamada menos, REQ-3373)", async () => {
    const getDestinations = vi.fn(fakeApi().getDestinations);
    await correr({ api: fakeApi({ getDestinations }) });
    expect(getDestinations.mock.calls.map((c) => c[0])).toEqual(["AR", "PE"]);
  });

  it("REQ-3463: la ciudad reservada a Inca World no se escribe y queda contada", async () => {
    const { repo, escrituras, guardado } = spyRepo();
    await correr({ ensayo: false }, repo, [{ agency: "Inca World Peru", countries: ["PE"], cities: ["Cusco"] }]);
    expect(escrituras).toEqual(["upsertTours:1", "saveState"]);
    const filas = guardado[0] as { tour: { externalId: number } }[];
    expect(filas.map((f) => f.tour.externalId)).toEqual([1234]);
  });

  it("REQ-3463: si falla la lista de tours de un destino, se cuenta y la corrida sigue (regla 8)", async () => {
    const { repo, escrituras } = spyRepo();
    const api = fakeApi({
      getTourList: async ({ destinationId }) => {
        if (destinationId === 200) throw new Error("502 de la pasarela");
        return { items: [tour(1234)], discarded: 0 };
      },
    });
    const report = await correr({ api, ensayo: false }, repo);
    expect(escrituras).toEqual(["upsertTours:1", "saveState"]);
    expect(report.errores).toEqual([{ donde: "tours del destino 200 (Cusco)", error: "502 de la pasarela" }]);
    expect(report.conteo).toMatchObject({ escritos: 1 });
  });

  it("REQ-3463: si falla la tarifa de un tour, ese tour se descarta y los demás entran", async () => {
    const { repo } = spyRepo();
    const api = fakeApi({
      getTourRates: async ({ tourId }) => {
        if (Number(tourId) === 5678) throw new Error("timeout");
        return tarifas(Number(tourId));
      },
    });
    const report = await correr({ api, ensayo: false }, repo);
    expect(report.conteo).toMatchObject({ tours: 2, escritos: 1, descartados: 1 });
    expect(report.descartados[0]).toMatchObject({ tourId: 5678, reason: "sin-precio-publico" });
    expect(report.errores[0].donde).toBe("tarifas del tour 5678");
  });

  it("REQ-3463: con la lista de destinos incompleta el paso se detiene SIN escribir", async () => {
    const { repo, escrituras } = spyRepo();
    const api = fakeApi({
      getDestinations: async (code) => {
        if (code === "PE") throw new Error("403 de la pasarela");
        return { items: [{ id: 100, name: "Buenos Aires", countryCode: "AR", toursQty: 5 }], discarded: 0 };
      },
    });
    const report = await correr({ api, ensayo: false }, repo);
    expect(report.action).toBe("abort");
    expect(report.abortReason).toMatch(/lista completa de destinos/);
    expect(escrituras).toEqual([]);
  });

  it("REQ-3463: los registros que la validación tiró se cuentan aparte", async () => {
    const report = await correr();
    expect(report.invalidos).toBe(1);
  });

  it("REQ-3505: el reporte compara lo que dice cada destino contra lo que llegó en la lista", async () => {
    // Buenos Aires dice 5 y llegan 1 + 1 tirado; Cusco dice 3 y llega 1.
    const report = await correr();
    expect(report.cuadre).toMatchObject({ declarados: 8, recibidos: 2, invalidos: 1, diferencia: -5 });
    expect(report.cuadre?.destinos.map((d) => [d.id, d.diferencia])).toEqual([[100, -3], [200, -2]]);
  });

  it("REQ-3505: un destino cuya lista falló sale aparte en el cuadre, no como «faltan tours»", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const api = fakeApi({
      getTourList: async ({ destinationId }) => {
        if (destinationId === 200) throw new Error("HTTP 504");
        return { items: [tour(1234)], discarded: 0 };
      },
    });
    const report = await correr({ api });
    expect(report.cuadre).toMatchObject({ declarados: 5, recibidos: 1, sinLista: 1 });
  });

  it("REQ-3463: una corrida ya cerrada no vuelve a pedir ni a escribir", async () => {
    const { repo, escrituras } = spyRepo({ status: "completed", nextPage: 3, totalPages: 2, runStartedAt: now });
    const report = await correr({ ensayo: false }, repo);
    expect(report.action).toBe("idle");
    expect(escrituras).toEqual([]);
  });

  it("REQ-3463: pasado el último destino solo cierra la corrida", async () => {
    const { repo, escrituras, guardado } = spyRepo({ status: "in_progress", nextPage: 9, totalPages: 2, runStartedAt: now });
    const report = await correr({ ensayo: false }, repo);
    expect(report.action).toBe("finish");
    expect(escrituras).toEqual(["saveState"]);
    expect(guardado[0]).toMatchObject({ status: "completed" });
  });

  it("REQ-3463: retoma el lote donde quedó, sin repetir destinos", async () => {
    const { repo } = spyRepo({ status: "in_progress", nextPage: 2, totalPages: 2, runStartedAt: now });
    const report = await correr({ ensayo: false, batch: 1 }, repo);
    expect(report.action).toBe("continue");
    expect(report.lote).toEqual({ from: 2, to: 2 });
    expect(report.conteo).toMatchObject({ destinos: 1 });
  });

  it("REQ-3462: los países propios del proveedor se dan de alta con su iso2", async () => {
    const { repo, escrituras, guardado } = spyRepo();
    await correr({
      ensayo: false,
      planCountries: () => ({
        mapeo: [],
        nuevos: [{ id: 9_000_001, code: "PY", iso2: "PY", translations: { es: "Paraguay", en: "Paraguay" } }],
        pendientes: [],
      }),
    }, repo);
    expect(escrituras[0]).toBe("upsertCountries:1");
    expect(guardado[0]).toEqual([{ id: 9_000_001, code: "PY", iso2: "PY", translations: { es: "Paraguay", en: "Paraguay" } }]);
  });

  it("REQ-3463: una ciudad nueva del proveedor se crea con el mismo nombre en los 6 idiomas", () => {
    expect(cityTranslations("El Calafate")).toEqual({
      en: "El Calafate", es: "El Calafate", pt: "El Calafate", de: "El Calafate", fr: "El Calafate", it: "El Calafate",
    });
  });
});
