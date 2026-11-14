import { describe, it, expect } from "vitest";
import { createFileRawArchive } from "./file-raw-archive";
import { archiveTangolResponse } from "./tangol-archive";

const now = new Date("2026-11-13T10:00:00Z");
const lista = { ListTours: [{ TourId: 101, Title: "City tour", NetRate: 80 }, { TourId: 102, Title: "Bodegas" }] };

function setup(exportRows: unknown = []) {
  const escritos = new Map<string, string>();
  const fa = createFileRawArchive({ exportRows, writeObject: (key, body) => { escritos.set(key, typeof body === "string" ? body : new TextDecoder().decode(body)); } });
  return { fa, escritos };
}

describe("REQ-3518: copia exacta de Tangol en archivos + índice en SQL (sync por GitHub)", () => {
  it("REQ-3518: guarda cada registro íntegro (con el neto) como archivo y arma el SQL del índice", async () => {
    const { fa, escritos } = setup();
    const rep = await archiveTangolResponse(fa.archive, { operation: "getTourList", body: lista, params: { destinationId: 7 }, runId: "r1", now });
    expect(rep).toMatchObject({ written: 2, failed: 0 });
    expect(fa.keys()).toHaveLength(2);
    for (const k of fa.keys()) expect(k).toMatch(/^raw\/tangol\/10[12]\/[0-9a-f]{64}\.json$/);
    const guardado = [...escritos.values()].find((b) => b.includes("City tour"))!;
    expect(guardado).toContain("NetRate");
    const sql = fa.sql();
    expect(sql).toContain('INSERT INTO "ProviderRecord"');
    expect(sql).toContain("'tangol'");
    expect(sql).not.toMatch(/NetRate|Utilidad/);
  });

  it("REQ-3518: lo que ya está en el export con la misma huella no se vuelve a escribir", async () => {
    const primero = setup();
    await archiveTangolResponse(primero.fa.archive, { operation: "getTourList", body: lista, params: { destinationId: 7 }, runId: "r1", now });
    const filas = primero.fa.rows().map((r) => ({ externalId: r.externalId, rawHash: r.rawHash, lastSeenAt: r.lastSeenAt }));
    const segundo = setup([{ results: filas }]);
    const rep = await archiveTangolResponse(segundo.fa.archive, { operation: "getTourList", body: lista, params: { destinationId: 7 }, runId: "r2", now });
    expect(rep).toMatchObject({ written: 0, same: 2 });
    expect(segundo.escritos.size).toBe(0);
  });

  it("REQ-3518: sin nada que archivar el SQL queda vacío (el workflow no aplica nada)", () => {
    const { fa } = setup();
    expect(fa.keys()).toEqual([]);
    expect(fa.sql().trim()).toBe("");
  });
});
