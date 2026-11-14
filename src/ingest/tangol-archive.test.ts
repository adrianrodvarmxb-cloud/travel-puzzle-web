import { describe, expect, it, vi } from "vitest";
import { archiveTangolResponse, tangolRawField } from "./tangol-archive";
import { createMemoryRawArchive } from "./raw-archive";

// Muestras inventadas (REQ-748).
const tourRecord = (id: number, over: Record<string, unknown> = {}) => ({
  TourId: id, Name: `City tour ${id}`, LanguageCode: 1, Currency: 0, MinRate: 80, Duration: "4 hs",
  UrlHomePic: null, TypeCode: "SIC", SubTypeCode: "REG", TourType: 1, UrlTour: null, ListMonths: [], ...over,
});
const tourList = (ids: number[]) => ({ ListTours: ids.map((i) => tourRecord(i)) });
const T0 = new Date("2026-11-12T06:00:00Z");
const T1 = new Date("2026-11-13T06:00:00Z");
const call = { operation: "getTourList" as const, params: { destinationId: 12 }, runId: "corrida-1" };

describe("REQ-3474 enganche al sync de Tangol: apagado por omisión", () => {
  it("REQ-3474 sin archivador (bandera RAW_ARCHIVE_ENABLED apagada o sin binding) no archiva nada y devuelve null", async () => {
    expect(await archiveTangolResponse(undefined, { ...call, body: tourList([7]), now: T0 })).toBeNull();
    expect(tangolRawField(null)).toEqual({});
  });

  it("REQ-3474 con archivador guarda la copia exacta y su fila del índice; el reporte va al resumen de la corrida", async () => {
    const m = createMemoryRawArchive();
    const r = await archiveTangolResponse(m.archive, { ...call, body: tourList([7, 8]), now: T0 });
    expect(r).toMatchObject({ written: 2, revisited: 0, same: 0, failed: 0 });
    expect([...m.objects.keys()].every((k) => /^raw\/tangol\/[78]\/[0-9a-f]{64}\.json$/.test(k))).toBe(true);
    expect([...m.records.values()].map((x) => [x.provider, x.externalId])).toEqual([["tangol", "7"], ["tangol", "8"]]);
    expect(tangolRawField(r)).toEqual({ raw: { written: 2, revisited: 0, same: 0, failed: 0 } });
  });

  it("REQ-3474 dos respuestas iguales no duplican objeto; un cambio real guarda otra versión", async () => {
    const m = createMemoryRawArchive();
    await archiveTangolResponse(m.archive, { ...call, body: tourList([7]), now: T0 });
    const igual = await archiveTangolResponse(m.archive, { ...call, runId: "corrida-2", body: tourList([7]), now: T1 });
    expect(igual).toMatchObject({ written: 0, same: 1 });
    expect(m.objects.size).toBe(1);
    const cambio = await archiveTangolResponse(m.archive, { ...call, runId: "corrida-3", body: { ListTours: [tourRecord(7, { MinRate: 95 })] }, now: T1 });
    expect(cambio).toMatchObject({ written: 1 });
    expect(m.objects.size).toBe(2);
  });
});

describe("REQ-3474 una falla del archivado no tumba la corrida del sync", () => {
  it("REQ-3474 R2 caído: se reporta la falla, los demás se guardan y nunca lanza", async () => {
    const m = createMemoryRawArchive({ failPut: (k) => k.includes("/8/") });
    const r = await archiveTangolResponse(m.archive, { ...call, body: tourList([7, 8]), now: T0 });
    expect(r).toMatchObject({ written: 1, failed: 1 });
    expect(r!.errors[0]).toMatch(/raw\/tangol\/8\//);
    expect([...m.records.values()].map((x) => x.externalId)).toEqual(["7"]);
  });

  it("REQ-3474 D1 caído: se reporta como falla sin lanzar", async () => {
    const m = createMemoryRawArchive({ failRecord: true });
    await expect(archiveTangolResponse(m.archive, { ...call, body: tourList([7]), now: T0 })).resolves.toMatchObject({ failed: 1 });
  });

  it("REQ-3474 el archivador roto tampoco tumba la corrida: devuelve el reporte con la falla", async () => {
    const roto = {
      knownVersions: async () => { throw new Error("D1 no disponible"); },
      put: async () => {},
      record: async () => {},
    };
    const r = await archiveTangolResponse(roto, { ...call, body: tourList([7]), now: T0 });
    expect(r).toMatchObject({ written: 0, failed: 1 });
    expect(r!.errors.join(" ")).toMatch(/D1 no disponible/);
  });

  it("REQ-3474 una respuesta ilegible no archiva nada, no lanza y no cuenta fallas", async () => {
    const m = createMemoryRawArchive();
    for (const body of [null, {}, { ListTours: "no es lista" }, "texto"]) {
      await expect(archiveTangolResponse(m.archive, { ...call, body, now: T0 })).resolves.toMatchObject({ written: 0, failed: 0 });
    }
    expect(m.objects.size).toBe(0);
  });

  it("REQ-3474 si la pieza pura lanzara, el enganche lo atrapa y la corrida sigue", async () => {
    const m = createMemoryRawArchive();
    const aviso = vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await archiveTangolResponse(m.archive, { operation: "noExiste" as never, body: tourList([7]), runId: "c1", now: T0 });
    expect(r).toMatchObject({ written: 0, failed: 1 });
    aviso.mockRestore();
  });
});
