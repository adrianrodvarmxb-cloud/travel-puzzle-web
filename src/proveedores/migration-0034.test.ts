import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

type Db = { exec: (s: string) => void; prepare: (s: string) => { all: (...v: unknown[]) => unknown[]; run: (...v: unknown[]) => unknown } };
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as { DatabaseSync: new (p: string) => Db };
const SQL = readFileSync("migrations/0034_proveedor_borrador.sql", "utf8");

function dbAntes() {
  const d = new DatabaseSync(":memory:");
  d.exec(`CREATE TABLE "Proveedor"("id" TEXT PRIMARY KEY, "nombre" TEXT NOT NULL)`);
  d.prepare(`INSERT INTO "Proveedor" ("id", "nombre") VALUES ('tangol', 'Tangol')`).run();
  return d;
}

// REQ-10713 (bandeja de borradores REQ-10693): tabla nueva, sin tocar las demás; se puede volver a correr.
describe("REQ-10713 migración 0034: ProveedorBorrador", () => {
  it("REQ-10713: crea la tabla con sus estados y su índice; un borrador se guarda y se lee; no toca Proveedor", () => {
    const d = dbAntes();
    d.exec(SQL);
    d.prepare(`INSERT INTO "ProveedorBorrador" ("id","proveedorId","tipo","para","cc","asunto","texto","enviarEn","createdAt","updatedAt") VALUES ('b1','tangol','recordatorio','["r@tangol.com"]','[]','Hola','Texto','2026-11-10T11:00:00.000Z','x','x')`).run();
    const fila = d.prepare(`SELECT "estado", "para" FROM "ProveedorBorrador" WHERE "id"='b1'`).all()[0] as { estado: string; para: string };
    expect(fila).toEqual({ estado: "programado", para: '["r@tangol.com"]' });
    expect(() => d.prepare(`UPDATE "ProveedorBorrador" SET "estado"='raro' WHERE "id"='b1'`).run()).toThrow();
    expect((d.prepare(`SELECT COUNT(*) AS n FROM "Proveedor"`).all()[0] as { n: number }).n).toBe(1);
    expect(() => d.exec(SQL)).not.toThrow();
    expect((d.prepare(`SELECT COUNT(*) AS n FROM "ProveedorBorrador"`).all()[0] as { n: number }).n).toBe(1);
  });
});
