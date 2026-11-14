import { describe, it, expect, vi, afterEach } from "vitest";
import { infoTourSchema, parseTourRates } from "./schemas";
import { summarizeRates } from "./rates";
import { toTangolTourRow, toTangolTourRows, tangolDurationMinutes, TANGOL_OPERATOR_TITLE, type TangolRowDeps } from "./tour-rows";

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
      providerTitle: "Tangol Tours", // REQ-10542 (antes «Travel Puzzle», decisión REEMPLAZADA por el PO el 13-11 22:47)
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

describe("REQ-10511 / REQ-10510 / REQ-10513: la fila enriquecida", () => {
  /** Detalle con los nombres del swagger real de Tangol (GetTourDetailsResponse). */
  const rawRico = {
    ...rawTour,
    TourDetails: {
      Description: "Paseo de 3 horas por la ciudad.",
      Summary: "Paseo por la ciudad",
      PicList: ["https://img.ejemplo.com/1.jpg"],
      StartPoint: "Obelisco, Av. 9 de Julio",
      CancelationPolicy: "Sin cargo hasta 48 h antes.",
      DetIncluye: "Guía\r\nTransporte",
      DetNoIncluye: "Propinas",
      TourLanguages: "Español, Inglés",
      Reviews: 4.7,
      ReviewsQty: 120,
    },
  };
  const rico = infoTourSchema.parse(rawRico);
  const rawRatesUsd = {
    ...rawRates,
    Currency: "USD",
    ListTourOption: [{ ...rawRates.ListTourOption[0], OperationDays: "Lunes, Miércoles, Viernes" }],
    ListTourRate: rawRates.ListTourRate.map((r) => ({ ...r, Currency: "USD", RackRateAdu: r.RackRateAdu / 100, RackRateChd: r.RackRateChd / 100 })),
  };
  const ratesUsd = summarizeRates(parseTourRates(rawRatesUsd));

  it("REQ-10511: punto de encuentro, incluye, no incluye, política, idiomas y reseñas llegan a la fila", () => {
    const r = toTangolTourRow(rico, deps({ rates: () => ratesUsd }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.tour.meetingPoint).toEqual({ title: "Obelisco, Av. 9 de Julio", coordinates: "", googlePlaceId: "" });
    expect(r.tour.includes).toEqual(["Guía", "Transporte"]);
    expect(r.tour.excludes).toEqual(["Propinas"]);
    expect(r.tour.cancellationPolicy).toBe("Sin cargo hasta 48 h antes.");
    expect(r.tour.guideLanguages).toEqual(["es", "en"]);
    expect(r.tour.rating).toBe(4.7);
    expect(r.tour.reviewsNumber).toBe(120);
    expect(r.translations[0].brief).toBe("Paseo por la ciudad");
    expect(r.tour.images).toEqual(["https://img.ejemplo.com/portada.jpg", "https://img.ejemplo.com/1.jpg"]);
  });

  it("REQ-10511: sin detalle la fila queda como antes (punto de encuentro vacío, listas vacías, sin reseñas)", () => {
    const r = toTangolTourRow(tour, deps());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.tour.meetingPoint).toEqual({});
    expect(r.tour.includes).toEqual([]);
    expect(r.tour.excludes).toEqual([]);
    expect(r.tour.cancellationPolicy).toBeNull();
    expect(r.tour.guideLanguages).toEqual([]);
    expect(r.tour.availabilityRules).not.toBeNull();
    expect(r.tour).toMatchObject({ rating: null, reviewsNumber: 0 });
  });

  it("REQ-10510: la moneda guardada es la que DEVOLVIÓ Tangol en la tarifa (USD) y el precio es la pública más baja", () => {
    const r = toTangolTourRow(rico, deps({ rates: () => ratesUsd }));
    expect(r.ok && r.tour.priceCurrency).toBe("USD");
    expect(r.ok && r.tour.priceValue).toBe(22);
  });

  it("REQ-10513: las reglas de disponibilidad (días, anticipación, vigencia, bloqueos) van en la fila sin dinero", () => {
    const r = toTangolTourRow(rico, deps({ rates: () => ratesUsd }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.tour.availabilityRules).toEqual({
      options: [{ code: "REG", startTime: "09:00", operationDays: [1, 3, 5], operationDaysRaw: "Lunes, Miércoles, Viernes", hoursBooking: 48, hoursCancelation: 24 }],
      validity: [{ option: "REG", from: "2026-11-01", to: "2027-03-31" }],
      blackouts: [],
    });
    expect(JSON.stringify(r.tour.availabilityRules)).not.toMatch(/Rack|Utilidad|Net/);
  });
});

describe("REQ-10542: la casilla Proveedor dice quién opera", () => {
  it("REQ-10542: los tours de Tangol se escriben con providerTitle «Tangol Tours» (como FREETOUR muestra a su operador)", () => {
    expect(TANGOL_OPERATOR_TITLE).toBe("Tangol Tours");
    const r = toTangolTourRow(tour, deps());
    expect(r.ok && r.tour.providerTitle).toBe("Tangol Tours");
    expect(r.ok && r.tour.providerPhone).toBeNull();
  });
});

describe("REQ-10537 / REQ-10538: los datos prácticos del detalle llegan a la fila", () => {
  const rawPractico = {
    ...rawTour,
    TourDetails: { EndPoint: "Plaza de Mayo", WhatToBring: "Agua", PhysicalReq: "Caminar 2 km", Difficulty: "Baja", Others: "Sale con lluvia.", ChdFrom: 3, ChdTo: 11, InfFrom: 0, InfTo: 2 },
  };
  it("REQ-10537: qué llevar, requisitos físicos, dificultad y notas van a sus columnas de la 0032", () => {
    const r = toTangolTourRow(infoTourSchema.parse(rawPractico), deps());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.tour).toMatchObject({ whatToBring: "Agua", physicalRequirements: "Caminar 2 km", difficulty: "Baja", providerNotes: "Sale con lluvia." });
  });
  it("REQ-10538: punto de término y edades (una columna por dato); sin detalle, todo en null", () => {
    const r = toTangolTourRow(infoTourSchema.parse(rawPractico), deps());
    expect(r.ok && r.tour).toMatchObject({ endPoint: "Plaza de Mayo", childAgeFrom: 3, childAgeTo: 11, infantAgeFrom: 0, infantAgeTo: 2 });
    const vacio = toTangolTourRow(infoTourSchema.parse({ ...rawTour, TourDetails: {} }), deps());
    expect(vacio.ok && vacio.tour).toMatchObject({ endPoint: null, whatToBring: null, physicalRequirements: null, difficulty: null, providerNotes: null, childAgeFrom: null, childAgeTo: null, infantAgeFrom: null, infantAgeTo: null });
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

describe("REQ-3504: basura del servidor de Tangol dentro de los datos", () => {
  /** El caso real de la corrida 43303152904: «Mountain Bike Cuesta Del Obispo» con un 504 como subtipo. */
  const basura = infoTourSchema.parse({ ...rawTour, TourId: 777, Name: "Mountain Bike Cuesta Del Obispo", SubTypeCode: "[METHOD ERROR 504]" });

  it("REQ-3504: un tour con un valor de error del proveedor se descarta con motivo legible, sin adivinar el valor", () => {
    const r = toTangolTourRow(basura, deps());
    expect(r).toEqual({ ok: false, reason: "dato-de-error-del-proveedor", detail: "subTypeCode = «[METHOD ERROR 504]»" });
  });

  it("REQ-3504: se cuenta, se registra con el campo, y los tours buenos siguen entrando", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const batch = toTangolTourRows([tour, basura], deps());
    expect(batch.rows.map((r) => r.tour.externalId)).toEqual([12345]);
    expect(batch.discarded).toEqual([{ tourId: 777, reason: "dato-de-error-del-proveedor" }]);
    const logs = warn.mock.calls.map((c) => String(c[0]));
    expect(logs.some((l) => l.includes("777") && l.includes("subTypeCode") && l.includes("[METHOD ERROR 504]"))).toBe(true);
    expect(logs.some((l) => l.includes("dato-de-error-del-proveedor: 1"))).toBe(true);
  });

  it("REQ-3504: un título normal que dice «error» en otro sentido NO se descarta", () => {
    const escape = infoTourSchema.parse({ ...rawTour, Name: "Escape Room Error 404", SubTypeCode: "AVENTURA" });
    const r = toTangolTourRow(escape, deps());
    expect(r.ok).toBe(true);
  });
});
