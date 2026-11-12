import { describe, it, expect, vi, afterEach } from "vitest";
import { infoTourSchema, parseTourRates } from "./schemas";
import { summarizeRates } from "./rates";
import { toTangolTourRow, toTangolTourRows, tangolDurationMinutes, type TangolRowDeps } from "./tour-rows";

afterEach(() => vi.restoreAllMocks());

/** Respuesta cruda de Tangol (`GetTourListByDestination` con `includeDetails`), validada con el Zod de la ola 1. */
const rawTour = {
  TourId: 12345,
  Name: "City Tour Buenos Aires - Tangol",
  LanguageCode: 1,
  Currency: 0,
  MinRate: 2000,
  Duration: "3 Horas",
  UrlHomePic: "https://img.ejemplo.com/portada.jpg",
  TypeCode: "CITY",
  SubTypeCode: "REG",
  TourType: 1,
  UrlTour: "https://www.tangol.com/ar/city-tour-buenos-aires",
  ListMonths: ["2026-11"],
  TourDetails: {
    Description: "Paseo de 3 horas por la ciudad. Reserva en tangol.com.",
    ShortDescription: "Paseo por la ciudad",
    ListPictures: [{ UrlPic: "https://img.ejemplo.com/1.jpg" }, "https://img.ejemplo.com/2.jpg"],
  },
};

/** `GetTourRates`: trae neto, comisión y `Utilidad`; el Zod de la ola 1 solo deja pasar las tarifas públicas. */
const rawRates = {
  TourId: 12345,
  Currency: "ARS",
  ListTourOption: [{ Code: "REG", Description: "Regular", MinRate: 1800, StartTime: "09:00", HoursBooking: 48, HoursCancelation: 24 }],
  ListTourRate: [
    { TourOption: "REG", Currency: "ARS", PaxFrom: 1, PaxTo: 4, RackRateAdu: 2500, RackRateChd: 1800, RackRateInf: 0, NetRateAdu: 2000, Utilidad: 500, ValidFrom: "2026-11-01T00:00:00", ValidTo: "2027-03-31T00:00:00" },
    { TourOption: "REG", Currency: "ARS", PaxFrom: 5, PaxTo: 10, RackRateAdu: 2200, RackRateChd: 1600, RackRateInf: 0, NetRateAdu: 1760, Utilidad: 440, ValidFrom: "2026-11-01T00:00:00", ValidTo: "2027-03-31T00:00:00" },
  ],
  ListBlackDate: [],
};

const tour = infoTourSchema.parse(rawTour);
const rates = summarizeRates(parseTourRates(rawRates));
const seenAt = new Date("2026-11-12T09:00:00Z");

/** El mapeo de ciudades (REQ-1624) y la taxonomía son otros frentes: aquí entran por parámetro. */
const deps = (over: Partial<TangolRowDeps> = {}): TangolRowDeps => ({
  place: () => ({ cityId: 9_000_001, countryId: 11 }),
  rates: () => rates,
  url: (t) => `/destinos/argentina/buenos-aires/t-${t.tourId}`,
  categoryId: () => 1,
  language: "es",
  seenAt,
  ...over,
});

describe("toTangolTourRow", () => {
  it("REQ-3370: un tour completo se convierte en fila de Tour con providerId tangol y su traducción", () => {
    const r = toTangolTourRow(tour, deps());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.tour).toMatchObject({
      providerId: "tangol",
      externalId: 12345,
      providerTitle: "Travel Puzzle",
      providerPhone: null,
      priceValue: 2200,
      priceCurrency: "ARS",
      duration: "3 Horas",
      durationMinutes: 180,
      titleImageURL: "https://img.ejemplo.com/portada.jpg",
      categoryId: 1,
      rating: null,
      reviewsNumber: 0,
      cityId: 9_000_001,
      countryId: 11,
      videoURL: null,
      isActive: true,
      lastSeenAt: seenAt,
    });
    expect(r.tour.images).toEqual([
      "https://img.ejemplo.com/portada.jpg",
      "https://img.ejemplo.com/1.jpg",
      "https://img.ejemplo.com/2.jpg",
    ]);
    expect(r.translations).toEqual([
      {
        language: "es",
        title: "City Tour Buenos Aires",
        brief: "Paseo por la ciudad",
        description: "Paseo de 3 horas por la ciudad.",
        url: "/destinos/argentina/buenos-aires/t-12345",
      },
    ]);
  });

  it("REQ-3371: un tour sin ciudad válida se descarta con su motivo", () => {
    expect(toTangolTourRow(tour, deps({ place: () => null }))).toEqual({ ok: false, reason: "sin-ciudad" });
  });

  it("REQ-3372: el nombre del proveedor no queda en el título ni en la fila (ni UrlTour, ni neto, ni comisión)", () => {
    const r = toTangolTourRow(tour, deps());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.translations[0].title).toBe("City Tour Buenos Aires");
    const serialized = JSON.stringify(r);
    expect(serialized.toLowerCase()).not.toContain("tangol.com");
    expect(serialized).not.toContain("Utilidad");
    expect(serialized).not.toContain("NetRate");
    expect(serialized).not.toContain("2000");
    expect(r.translations[0].url).toBe("/destinos/argentina/buenos-aires/t-12345");
  });

  it("REQ-3371: un tour sin tarifa pública se descarta (sin tarifas, o con la pública en cero)", () => {
    expect(toTangolTourRow(tour, deps({ rates: () => null }))).toEqual({ ok: false, reason: "sin-precio-publico" });
    const sinTarifas = summarizeRates(parseTourRates({ TourId: 12345, Currency: "ARS", ListTourOption: [], ListTourRate: [], ListBlackDate: [] }));
    expect(toTangolTourRow(tour, deps({ rates: () => sinTarifas }))).toEqual({ ok: false, reason: "sin-precio-publico" });
    const enCero = summarizeRates(
      parseTourRates({ ...rawRates, ListTourRate: [{ ...rawRates.ListTourRate[0], RackRateAdu: 0 }] })
    );
    expect(toTangolTourRow(tour, deps({ rates: () => enCero }))).toEqual({ ok: false, reason: "sin-precio-publico" });
  });

  it("REQ-3372: el precio guardado es la tarifa pública más baja, nunca el neto", () => {
    const r = toTangolTourRow(tour, deps());
    expect(r.ok && r.tour.priceValue).toBe(2200);
  });

  it("REQ-3371: sin moneda en las tarifas se usa la de respaldo; si tampoco hay, se descarta", () => {
    const sinMoneda = summarizeRates(
      parseTourRates({
        ...rawRates,
        Currency: null,
        ListTourRate: rawRates.ListTourRate.map((x) => ({ ...x, Currency: null })),
      })
    );
    expect(toTangolTourRow(tour, deps({ rates: () => sinMoneda }))).toEqual({ ok: false, reason: "sin-moneda" });
    const r = toTangolTourRow(tour, deps({ rates: () => sinMoneda, fallbackCurrency: "USD" }));
    expect(r.ok && r.tour.priceCurrency).toBe("USD");
  });

  it("REQ-3372: un tour cuyo título es solo el nombre del proveedor se descarta", () => {
    const soloMarca = infoTourSchema.parse({ ...rawTour, Name: "Tangol" });
    expect(toTangolTourRow(soloMarca, deps())).toEqual({ ok: false, reason: "sin-titulo" });
  });

  it("REQ-3370: la duración de Tangol se pasa a minutos en varios formatos", () => {
    expect(tangolDurationMinutes("3 Horas")).toBe(180);
    expect(tangolDurationMinutes("2:30")).toBe(150);
    expect(tangolDurationMinutes("2 Horas 30 Minutos")).toBe(150);
    expect(tangolDurationMinutes("45 min")).toBe(45);
    expect(tangolDurationMinutes("2 Días")).toBe(2880);
    expect(tangolDurationMinutes("a consultar")).toBeNull();
    expect(tangolDurationMinutes(null)).toBeNull();
  });
});

describe("toTangolTourRows", () => {
  it("REQ-3371: los registros malos se descartan y se cuentan, la carga sigue con los buenos", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const otro = infoTourSchema.parse({ ...rawTour, TourId: 999, Name: "Delta del Tigre" });
    const batch = toTangolTourRows([tour, otro], deps({ place: (t) => (t.tourId === 999 ? null : { cityId: 9_000_001, countryId: 11 }) }));
    expect(batch.rows.map((r) => r.tour.externalId)).toEqual([12345]);
    expect(batch.discarded).toEqual([{ tourId: 999, reason: "sin-ciudad" }]);
    expect(warn).toHaveBeenCalled();
  });

  it("REQ-3371: un error inesperado al convertir un tour no tumba la carga de los demás", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const otro = infoTourSchema.parse({ ...rawTour, TourId: 999, Name: "Delta del Tigre" });
    const batch = toTangolTourRows(
      [otro, tour],
      deps({
        place: (t) => {
          if (t.tourId === 999) throw new Error("mapeo de ciudades caído");
          return { cityId: 9_000_001, countryId: 11 };
        },
      })
    );
    expect(batch.rows.map((r) => r.tour.externalId)).toEqual([12345]);
    expect(batch.discarded).toEqual([{ tourId: 999, reason: "error-inesperado" }]);
    expect(warn).toHaveBeenCalled();
  });

  it("REQ-3370: la fila no inventa visibilidad: siempre isActive true (el sitio la oculta con la bandera)", () => {
    const batch = toTangolTourRows([tour], deps());
    expect(batch.rows[0].tour.isActive).toBe(true);
    expect(batch.discarded).toEqual([]);
  });
});
