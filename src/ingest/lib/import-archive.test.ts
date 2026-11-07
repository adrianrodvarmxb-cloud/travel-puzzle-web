import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { sqlite, MIGRATION_0022 } from "../test-utils";
import { planImportArchive, providerOfAgency, recordSql, documentFor, AGENCY_PROVIDER } from "./import-archive";

// Paquete inventado (REQ-748): nunca datos reales de proveedor en las pruebas.
const bundle = {
  agency: { id: "ag-ext", name: "Agencia Demo", initials: "EXT" },
  keyStamp: 1, seqStart: 1,
  trips: [
    { ref: "AAA", status: "draft", hold: "nota interna", source: "Programa demo (código AAA)", taxonomia: { formato: "excursion-dia", temas: ["cultural"] }, photos: [], trip: { kind: "tour", titleEs: "Demo" } },
    { ref: "BBB", status: "published", photos: [], trip: { kind: "circuito", titleEs: "Demo 2" }, original: { pagina: 7 } },
  ],
};
const ctx = { runId: "imp-1", now: new Date("2026-11-06T20:00:00Z") };

describe("REQ-745 imports: la copia exacta guarda el item completo (source, hold y taxonomia incluidos)", () => {
  it("REQ-745 cada viaje se guarda íntegro, con su ref como externalId y ligado a su Trip.id", async () => {
    const p = await planImportArchive(bundle, ctx);
    expect(p.provider).toBe("extime");
    expect(p.writes).toHaveLength(2);
    const a = p.writes[0];
    expect(a.key).toMatch(/^raw\/extime\/AAA\/[0-9a-f]{64}\.json$/);
    expect(JSON.parse(a.body)).toEqual(bundle.trips[0]);
    expect(JSON.parse(a.body)).toHaveProperty("hold", "nota interna");
    expect(a.row).toMatchObject({ experienceKind: "trip", experienceId: "ext-aaa", sourceRef: "Programa demo (código AAA)", runId: "imp-1" });
    expect(p.writes[1].row.sourcePage).toBe(7);
  });
  it("REQ-753 el índice guarda la denominación original y lo declarado en taxonomia", async () => {
    const b = { ...bundle, agency: { ...bundle.agency, id: "ag-fch", initials: "FCH" }, trips: [{ ref: "FCH-R1", taxonomia: { formato: "circuito" }, trip: {} }] };
    const p = await planImportArchive(b, ctx);
    expect(p.writes[0].row).toMatchObject({ originalField: "ref", originalCategory: "TOUR REGULAR", declaredTaxonomy: '{"formato":"circuito"}' });
  });
  it("REQ-745 el documento original (PDF) va a source/<agencia>/… y cada viaje apunta a él", async () => {
    const doc = await documentFor("extime", "Programa Invierno 2026.pdf", new TextEncoder().encode("%PDF-demo"), ctx.now);
    const p = await planImportArchive(bundle, { ...ctx, doc });
    expect(doc.key).toMatch(/^source\/extime\/[0-9a-f]{8}-Programa-Invierno-2026\.pdf$/);
    expect(doc.contentType).toBe("application/pdf");
    expect(p.writes.every((w) => w.row.sourceDocKey === doc.key)).toBe(true);
    expect(recordSql(p.writes.map((w) => w.row), doc).join("\n")).toMatch(/INSERT INTO "ProviderDocument"/);
  });
  it("REQ-745 el SQL del índice es idempotente: misma huella = solo actualiza lastSeenAt", async () => {
    const p = await planImportArchive(bundle, ctx);
    const sql = recordSql(p.writes.map((w) => w.row)).join("\n");
    expect(sql).toMatch(/ON CONFLICT\("provider","externalId","rawHash"\) DO UPDATE SET "lastSeenAt"=excluded\."lastSeenAt","runId"=excluded\."runId"/);
    expect(sql).not.toMatch(/\b(DELETE|DROP|UPDATE "Trip")\b/);
  });
  it("REQ-745 el SQL corre sobre la migración 0022 (SQLite real) y correrlo dos veces no duplica", async () => {
    const d = sqlite(MIGRATION_0022);
    const doc = await documentFor("extime", "p.pdf", new Uint8Array([1, 2]), ctx.now);
    const p = await planImportArchive(bundle, { ...ctx, doc });
    const sql = recordSql(p.writes.map((w) => w.row), doc).join("\n");
    d.exec(sql);
    d.exec(sql);
    expect(d.prepare(`SELECT COUNT(*) AS n FROM "ProviderRecord"`).all()).toEqual([{ n: 2 }]);
    expect(d.prepare(`SELECT COUNT(*) AS n FROM "ProviderDocument"`).all()).toEqual([{ n: 1 }]);
  });
  it("REQ-745 cada imports/*.json del repo tiene proveedor declarado", () => {
    for (const f of readdirSync("imports").filter((x) => x.endsWith(".json"))) {
      const b = JSON.parse(readFileSync(`imports/${f}`, "utf8"));
      expect(providerOfAgency(b.agency.id), f).toBeTruthy();
    }
    expect(Object.keys(AGENCY_PROVIDER)).toHaveLength(7);
  });
  it("REQ-745 una agencia sin proveedor declarado no se puede archivar", async () => {
    await expect(planImportArchive({ ...bundle, agency: { ...bundle.agency, id: "ag-x" } }, ctx)).rejects.toThrow(/proveedor/);
  });
});
