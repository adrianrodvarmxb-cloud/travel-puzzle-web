import { describe, expect, it } from "vitest";
import { archiveRawItems, createMemoryRawArchive, createR2RawArchive, type RawArchiveD1 } from "./raw-archive";
import { asD1, sqlite, MIGRATION_0022 } from "./test-utils";

// Items inventados (REQ-548): nunca datos reales en el repo.
const tour = (id: number, over: Record<string, unknown> = {}) => ({ id, updatedAt: "2026-11-01T00:00:00Z", title: { es: `Tour ${id}` }, price: { value: 0, currency: "EUR" }, ...over });
const items = (list: ReturnType<typeof tour>[]) => list.map((t) => ({ externalId: String(t.id), body: t, providerUpdatedAt: t.updatedAt as string }));
const T0 = new Date("2026-11-06T06:00:00Z");
const T1 = new Date("2026-11-07T06:00:00Z");

describe("REQ-542 archivo crudo: versión nueva solo cuando cambia la huella", () => {
  it("REQ-542 la primera corrida guarda cada item íntegro (con updatedAt) y su fila en el índice", async () => {
    const m = createMemoryRawArchive();
    const r = await archiveRawItems(m.archive, { provider: "freetour", items: items([tour(1), tour(2)]), runId: "r1", now: T0 });
    expect(r).toMatchObject({ written: 2, same: 0, failed: 0 });
    const [key, obj] = [...m.objects.entries()][0];
    expect(key).toMatch(/^raw\/freetour\/1\/[0-9a-f]{64}\.json$/);
    expect(JSON.parse(obj.body as string)).toEqual(tour(1));
    expect([...m.records.values()][0]).toMatchObject({ provider: "freetour", externalId: "1", providerUpdatedAt: "2026-11-01T00:00:00Z", runId: "r1", fetchedAt: T0.toISOString() });
  });
  it("REQ-542 sin cambios (o solo cambia un volátil) no escribe nada", async () => {
    const m = createMemoryRawArchive();
    await archiveRawItems(m.archive, { provider: "freetour", items: items([tour(1)]), runId: "r1", now: T0 });
    const r = await archiveRawItems(m.archive, { provider: "freetour", items: items([tour(1, { updatedAt: "2026-11-06T09:00:00Z", rating: 4.9 })]), runId: "r2", now: T1 });
    expect(r).toMatchObject({ written: 0, same: 1 });
    expect(m.objects.size).toBe(1);
  });
  it("REQ-542 un cambio real crea otra versión; volver a la anterior no reescribe el objeto (inmutable)", async () => {
    const m = createMemoryRawArchive();
    await archiveRawItems(m.archive, { provider: "freetour", items: items([tour(1)]), runId: "r1", now: T0 });
    await archiveRawItems(m.archive, { provider: "freetour", items: items([tour(1, { title: { es: "Nuevo" } })]), runId: "r2", now: T1 });
    expect(m.objects.size).toBe(2);
    const back = await archiveRawItems(m.archive, { provider: "freetour", items: items([tour(1, { updatedAt: "2026-11-08T00:00:00Z" })]), runId: "r3", now: new Date("2026-11-08T06:00:00Z") });
    expect(back).toMatchObject({ written: 0, revisited: 1 });
    expect(m.objects.size).toBe(2);
    const first = [...m.objects.values()][0];
    expect(JSON.parse(first.body as string).updatedAt).toBe("2026-11-01T00:00:00Z");
  });
});

describe("REQ-544 si falla el archivo crudo, la corrida no se cae", () => {
  it("REQ-544 un put fallido se registra y los demás se guardan; nunca lanza", async () => {
    const m = createMemoryRawArchive({ failPut: (k) => k.includes("/2/") });
    const r = await archiveRawItems(m.archive, { provider: "freetour", items: items([tour(1), tour(2)]), runId: "r1", now: T0 });
    expect(r).toMatchObject({ written: 1, failed: 1 });
    expect(r.errors[0]).toMatch(/raw\/freetour\/2\//);
    expect([...m.records.values()].map((x) => x.externalId)).toEqual(["1"]);
  });
  it("REQ-544 D1 caído: se reporta como falla sin lanzar", async () => {
    const m = createMemoryRawArchive({ failRecord: true });
    await expect(archiveRawItems(m.archive, { provider: "freetour", items: items([tour(1)]), runId: "r1", now: T0 })).resolves.toMatchObject({ failed: 1 });
  });
  it("REQ-544 un proveedor sin volátiles declarados tampoco tumba la corrida", async () => {
    const m = createMemoryRawArchive();
    await expect(archiveRawItems(m.archive, { provider: "desconocido", items: items([tour(1)]), runId: "r1", now: T0 })).resolves.toMatchObject({ written: 0, failed: 1 });
  });
});

describe("REQ-542 implementación R2 + D1 (SQLite real con la migración propuesta 0022)", () => {
  it("REQ-542 escribe R2 primero y luego el índice; la segunda corrida igual no escribe", async () => {
    const d = sqlite(MIGRATION_0022);
    const puts: string[] = [];
    const bucket = { put: async (k: string) => { puts.push(k); } };
    const a = createR2RawArchive({ bucket, db: asD1<RawArchiveD1>(d) });
    await archiveRawItems(a, { provider: "freetour", items: items([tour(1), tour(2)]), runId: "r1", now: T0 });
    await archiveRawItems(a, { provider: "freetour", items: items([tour(1), tour(2, { title: { es: "Cambió" } })]), runId: "r2", now: T1 });
    expect(puts).toHaveLength(3);
    const rows = d.prepare(`SELECT "externalId","runId","r2Key" FROM "ProviderRecord" ORDER BY "fetchedAt","externalId"`).all() as { externalId: string; runId: string; r2Key: string }[];
    expect(rows.map((r) => `${r.externalId}:${r.runId}`)).toEqual(["1:r1", "2:r1", "2:r2"]);
    expect(rows.every((r) => puts.includes(r.r2Key))).toBe(true);
  });
});
