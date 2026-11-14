import { describe, expect, it } from "vitest";
import {
  TANGOL_PROVIDER,
  tangolExternalId,
  tangolRawBatch,
  tangolRawEntries,
  tangolRecordRows,
  tangolRecordsOfTour,
  tangolTourExternalIds,
} from "./tangol-raw";
import { rawHash } from "./raw-hash";
import { PROVIDER_RECORD_COLUMNS } from "../raw-archive";

// Muestras INVENTADAS (REQ-748: nunca datos reales de proveedor en el repo). Los campos de dinero del proveedor
// (`Utilidad`, `NetRateAdu`) van a propósito: el esquema del sitio los descarta (REQ-1543) y la copia los conserva.
const tourRecord = (id: number, over: Record<string, unknown> = {}) => ({
  TourId: id,
  Name: `City tour ${id}`,
  LanguageCode: 1,
  Currency: 0,
  MinRate: 80,
  Duration: "4 hs",
  UrlHomePic: `https://ejemplo.invalid/${id}.jpg`,
  TypeCode: "SIC",
  SubTypeCode: "REG",
  TourType: 1,
  UrlTour: `https://ejemplo.invalid/tour/${id}`,
  ListMonths: ["01", "02"],
  ...over,
});
const tourList = (ids: number[]) => ({ ListTours: ids.map((i) => tourRecord(i)) });
const ratesBody = (id: number, over: Record<string, unknown> = {}) => ({
  TourId: id,
  Currency: "USD",
  ListTourOption: [{ Code: "A", Description: "Regular", MinRate: 80, StartTime: "09:00", HoursBooking: 24, HoursCancelation: 48 }],
  ListTourRate: [
    {
      TourOption: "A", Currency: "USD", PaxFrom: 1, PaxTo: 4,
      RackRateAdu: 100, RackRateChd: 60, RackRateInf: 0,
      ValidFrom: "2027-01-01T00:00:00", ValidTo: "2027-12-31T00:00:00",
      // Confidencial: nunca llega al cliente, pero sin esto no se puede auditar de dónde salió un precio.
      Utilidad: 20, NetRateAdu: 80,
    },
  ],
  ListBlackDate: [{ DateFrom: "2027-07-01", DateTo: "2027-07-05" }],
  ...over,
});
const NOW = new Date("2026-11-12T06:00:00Z");

describe("REQ-3472 pieza pura: entrada de la copia exacta de Tangol (llave, huella y metadatos)", () => {
  it("REQ-3472 el lote trae proveedor, operación, fecha y cuántos registros, y la referencia de la llamada", () => {
    const batch = tangolRawBatch({ operation: "getTourList", body: tourList([7, 8]), params: { destinationId: 12, languageCode: 1, currency: 0 }, now: NOW });
    expect(batch).toMatchObject({
      provider: "tangol",
      operation: "getTourList",
      fetchedAt: "2026-11-12T06:00:00.000Z",
      records: 2,
      sourceRef: "tangol:getTourList?currency=0&destinationId=12&languageCode=1",
    });
    expect(batch.items.map((i) => i.externalId)).toEqual(["7", "8"]);
    expect(batch.items[0].sourceRef).toBe(batch.sourceRef);
  });

  it("REQ-3472 la llave y la huella siguen el criterio del archivador de FREETOUR (raw/<proveedor>/<id>/<huella>.json)", async () => {
    const batch = tangolRawBatch({ operation: "getTourList", body: tourList([7]), params: { destinationId: 12 }, now: NOW });
    const [entry] = await tangolRawEntries(batch);
    expect(entry.key).toMatch(/^raw\/tangol\/7\/[0-9a-f]{64}\.json$/);
    expect(entry.rawHash).toBe(await rawHash(TANGOL_PROVIDER, tourRecord(7)));
    expect(entry.key.endsWith(`${entry.rawHash}.json`)).toBe(true);
    expect(JSON.parse(entry.body)).toEqual(tourRecord(7));
    expect(entry.bytes).toBe(new TextEncoder().encode(entry.body).length);
  });

  it("REQ-3472 la huella es estable: el orden de las llaves no la cambia, pero cualquier cambio de contenido sí", async () => {
    const a = await tangolRawEntries(tangolRawBatch({ operation: "getTourList", body: tourList([7]), now: NOW }));
    const { TourId, Name, ...resto } = tourRecord(7);
    const reordered = { ListTours: [{ ...resto, Name, TourId }] }; // mismas llaves, otro orden
    const b = await tangolRawEntries(tangolRawBatch({ operation: "getTourList", body: reordered, now: new Date("2027-01-01T00:00:00Z") }));
    expect(b[0].rawHash).toBe(a[0].rawHash);
    const c = await tangolRawEntries(tangolRawBatch({ operation: "getTourList", body: { ListTours: [tourRecord(7, { MinRate: 90 })] }, now: NOW }));
    expect(c[0].rawHash).not.toBe(a[0].rawHash);
  });

  it("REQ-3472 la copia guarda la respuesta ÍNTEGRA: conserva el neto y la utilidad que el esquema del sitio descarta", async () => {
    const batch = tangolRawBatch({ operation: "getTourRates", body: ratesBody(7), params: { tourId: 7, currency: "USD" }, now: NOW });
    expect(batch.records).toBe(1);
    expect(batch.items[0].externalId).toBe("tarifas-7");
    const [entry] = await tangolRawEntries(batch);
    const saved = JSON.parse(entry.body) as { ListTourRate: Record<string, unknown>[] };
    expect(saved.ListTourRate[0]).toMatchObject({ Utilidad: 20, NetRateAdu: 80, RackRateAdu: 100 });
    expect(saved).toEqual(ratesBody(7));
  });

  it("REQ-3472 el registro se guarda tal cual llegó (misma referencia) y un registro que no pasa el esquema queda marcado", () => {
    const bad = tourRecord(9) as Record<string, unknown>;
    delete bad.Name; // `Name` es obligatorio en infoTourSchema
    const body = { ListTours: [tourRecord(8), bad] };
    const batch = tangolRawBatch({ operation: "getTourList", body, now: NOW });
    expect(batch.items.map((i) => [i.externalId, i.schemaOk])).toEqual([["8", true], ["9", false]]);
    expect(batch.items[1].body).toBe(bad);
    expect(batch.records).toBe(2);
  });

  it("REQ-3472 países y destinos llevan su propio prefijo; una respuesta sin lista no produce registros", () => {
    const paises = tangolRawBatch({ operation: "getCountries", body: { ListCountries: [{ IsoCode: "AR", Description: "Argentina", ToursQty: 12 }] }, now: NOW });
    expect(paises.items.map((i) => i.externalId)).toEqual(["pais-AR"]);
    const destinos = tangolRawBatch({ operation: "getDestinations", body: { ListDestinations: [{ Id: 12, Description: "Buenos Aires", CountryCode: "AR", ToursQty: 12 }] }, params: { countryCode: "AR" }, now: NOW });
    expect(destinos.items.map((i) => i.externalId)).toEqual(["destino-12"]);
    expect(tangolRawBatch({ operation: "getTourList", body: {}, now: NOW })).toMatchObject({ records: 0, items: [] });
    expect(tangolRawBatch({ operation: "getCountries", body: null, now: NOW }).items).toEqual([]);
    expect(tangolExternalId("getTourRates", "7")).toBe("tarifas-7");
  });
});

describe("REQ-3473 índice ProviderRecord de Tangol: de dónde salió este tour", () => {
  it("REQ-3473 las filas salen con provider tangol, experienceKind tour y el TourId como externalId", async () => {
    const batch = tangolRawBatch({ operation: "getTourList", body: tourList([7, 8]), params: { destinationId: 12 }, now: NOW });
    const rows = await tangolRecordRows(batch, { runId: "corrida-1" });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      provider: "tangol", externalId: "7", experienceKind: "tour", experienceId: null, schemaOk: 1,
      sourceRef: "tangol:getTourList?destinationId=12", runId: "corrida-1",
      fetchedAt: "2026-11-12T06:00:00.000Z", lastSeenAt: "2026-11-12T06:00:00.000Z",
      originalField: "TypeCode", originalCategory: "SIC",
    });
    // La fila apunta a la copia con la misma llave y huella que la entrada pura (REQ-3472).
    const entries = await tangolRawEntries(batch);
    expect(rows.map((r) => [r.r2Key, r.rawHash, r.bytes])).toEqual(entries.map((e) => [e.key, e.rawHash, e.bytes]));
  });

  it("REQ-3473 el índice rastrea un tour hasta su copia: su ficha y sus tarifas", async () => {
    const ficha = await tangolRecordRows(tangolRawBatch({ operation: "getTourList", body: tourList([7, 8]), now: NOW }), { runId: "c1" });
    const tarifas = await tangolRecordRows(tangolRawBatch({ operation: "getTourRates", body: ratesBody(7), now: NOW }), { runId: "c1" });
    expect(tangolTourExternalIds(7)).toEqual(["7", "tarifas-7"]);
    const rastro = tangolRecordsOfTour([...ficha, ...tarifas], 7);
    expect(rastro.map((r) => r.externalId)).toEqual(["7", "tarifas-7"]);
    expect(rastro.every((r) => r.provider === "tangol" && /^raw\/tangol\//.test(r.r2Key))).toBe(true);
    expect(tangolRecordsOfTour([...ficha, ...tarifas], 8).map((r) => r.externalId)).toEqual(["8"]);
  });

  it("REQ-3473 la fila del índice no lleva ningún campo de dinero del proveedor (solo huella, llave y metadatos)", async () => {
    const rows = await tangolRecordRows(tangolRawBatch({ operation: "getTourRates", body: ratesBody(7), now: NOW }), { runId: "c1" });
    expect(Object.keys(rows[0]).sort()).toEqual([...PROVIDER_RECORD_COLUMNS].sort());
    const texto = JSON.stringify(rows);
    for (const malo of ["Utilidad", "NetRate", "RackRate", "Currency", "MinRate"]) expect(texto, malo).not.toContain(malo);
  });

  it("REQ-3473 dos respuestas iguales no duplican objeto: con la huella vigente ya archivada no sale fila", async () => {
    const batch = tangolRawBatch({ operation: "getTourList", body: tourList([7]), now: NOW });
    const [entry] = await tangolRawEntries(batch);
    const known = new Map([["7", { latest: entry.rawHash, all: new Set([entry.rawHash]) }]]);
    expect(await tangolRecordRows(batch, { runId: "c2", known })).toEqual([]);
    // Un cambio real sí entra, y volver a una versión ya archivada solo renueva lastSeenAt (no reescribe el objeto).
    const cambiado = tangolRawBatch({ operation: "getTourList", body: { ListTours: [tourRecord(7, { MinRate: 90 })] }, now: NOW });
    expect(await tangolRecordRows(cambiado, { runId: "c2", known })).toHaveLength(1);
  });
});
