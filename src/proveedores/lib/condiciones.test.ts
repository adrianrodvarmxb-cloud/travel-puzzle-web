// REQ-3355, REQ-3520, REQ-3521: condiciones de proveedores (0030), su carga y lo que ve Mila.
// npx vitest run src/proveedores/lib/condiciones.test.ts
import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { revisarCondiciones, sqlCondiciones } from "./condiciones";
import { condicionesParaAgente, type FilaCondiciones } from "@/agente/lib/condiciones";

type Db = { exec: (s: string) => void; prepare: (s: string) => { all: (...v: unknown[]) => unknown[]; run: (...v: unknown[]) => unknown } };
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as { DatabaseSync: new (p: string) => Db };
const M0027 = readFileSync("migrations/0027_proveedores_mila.sql", "utf8");
const M0030 = readFileSync("migrations/0030_proveedor_condiciones.sql", "utf8");

function db() {
  const d = new DatabaseSync(":memory:");
  d.exec(M0027);
  const ins = d.prepare(`INSERT INTO "Proveedor" ("id","nombre","tipo","publicado","bloqueado","cobro","createdAt","updatedAt") VALUES (?,?,?,?,?,?,?,?)`);
  ins.run("destino-colombia", "Destino Colombia", "dmc", 1, 0, "travelpuzzle", "2026-11-12", "2026-11-12");
  ins.run("freetour", "FREETOUR", "plataforma", 0, 1, "proveedor", "2026-11-12", "2026-11-12");
  return d;
}

const OK = { id: "destino-colombia", cancelacion: "Sin cargo hasta 7 días antes; después, 100 %.", cambios: "Un cambio de fecha sin cargo con 7 días.",
  pagos: "Pago total al reservar con Travel Puzzle.", operacion: "Salidas diarias con guía en español.", fuente: "Acuerdo de intermediación 2026", fecha: "2026-11-13" };

describe("REQ-3520: migración 0030", () => {
  it("REQ-3520: agrega las columnas de condiciones vacías sin tocar lo que ya había", () => {
    const d = db();
    d.exec(M0030);
    const r = d.prepare(`SELECT "nombre","cancelacion","cambios","pagos","operacion","condicionesFuente","condicionesFecha" FROM "Proveedor" WHERE "id"='destino-colombia'`).all()[0];
    expect(r).toEqual({ nombre: "Destino Colombia", cancelacion: "", cambios: "", pagos: "", operacion: "", condicionesFuente: "", condicionesFecha: null });
  });
});

describe("REQ-3355: revisión de condiciones antes de cargar", () => {
  it("REQ-3355: acepta condiciones limpias", () => {
    expect(revisarCondiciones(OK)).toMatchObject({ ok: true });
  });
  it("REQ-3355: rechaza netos, márgenes y comisiones (REQ-3358)", () => {
    expect(revisarCondiciones({ ...OK, pagos: "Tarifa neta 120 USD" })).toMatchObject({ ok: false });
    expect(revisarCondiciones({ ...OK, pagos: "Comisión 20 %" })).toMatchObject({ ok: false });
    expect(revisarCondiciones({ ...OK, operacion: "Nuestro margen es 15 %" })).toMatchObject({ ok: false });
  });
  it("REQ-3355: rechaza teléfonos del operador o del guía", () => {
    expect(revisarCondiciones({ ...OK, operacion: "Guía Juan, +57 300 123 4567" })).toMatchObject({ ok: false, motivo: expect.stringContaining("teléfono") });
  });
  it("REQ-3355: FREETOUR nunca entra, ni renglones vacíos o mal formados", () => {
    expect(revisarCondiciones({ ...OK, id: "freetour" })).toMatchObject({ ok: false });
    expect(revisarCondiciones({ ...OK, cancelacion: "", cambios: "", pagos: "", operacion: "" })).toMatchObject({ ok: false });
    expect(revisarCondiciones({ ...OK, extra: 1 })).toMatchObject({ ok: false });
  });
});

describe("REQ-3521: SQL de la carga", () => {
  it("REQ-3521: actualiza solo al proveedor no bloqueado y escapa comillas", () => {
    const d = db();
    d.exec(M0030);
    const { sql, cargados, rechazados } = sqlCondiciones([{ ...OK, operacion: "Punto: Hotel O'Higgins" }, { ...OK, id: "freetour" }], "2026-11-13T12:00:00Z");
    expect(cargados).toEqual(["destino-colombia"]);
    expect(rechazados).toEqual([{ id: "freetour", motivo: "proveedor bloqueado" }]);
    d.exec(sql);
    const r = d.prepare(`SELECT "operacion","condicionesFecha" FROM "Proveedor" WHERE "id"='destino-colombia'`).all()[0];
    expect(r).toEqual({ operacion: "Punto: Hotel O'Higgins", condicionesFecha: "2026-11-13" });
    expect(d.prepare(`SELECT "cancelacion" FROM "Proveedor" WHERE "id"='freetour'`).all()[0]).toEqual({ cancelacion: "" });
  });
});

describe("REQ-3355: lo que ve Mila", () => {
  const base: FilaCondiciones = { id: "destino-colombia", nombre: "Destino Colombia", tipo: "dmc", cobro: "travelpuzzle", publicado: true, bloqueado: false };
  it("REQ-3355: solo condiciones de publicados no bloqueados, sin FREETOUR", () => {
    const filas = [{ ...base, ...OK, condicionesFecha: "2026-11-13" }, { ...base, id: "freetour", publicado: true, bloqueado: true }, { ...base, id: "otro", publicado: false }];
    const r = condicionesParaAgente(filas);
    expect(r.map((x) => x.id)).toEqual(["destino-colombia"]);
    expect(r[0]).toMatchObject({ cobra: "Travel Puzzle", tipo: "dmc", completas: true, actualizadas: "2026-11-13" });
  });
  it("REQ-3355: nunca expone correos, teléfono, notas ni campos internos", () => {
    const r = condicionesParaAgente([{ ...base, ...OK, telefono: "5512345678", correos: ["x@y.com"], notas: "neto 100" } as FilaCondiciones]);
    expect(Object.keys(r[0]).sort()).toEqual(["actualizadas", "cambios", "cancelacion", "cobra", "completas", "id", "nombre", "operacion", "pagos", "tipo"]);
  });
  it("REQ-3355: antes de la 0030 (sin columnas) responde vacío y «completas: false»", () => {
    expect(condicionesParaAgente([base])[0]).toMatchObject({ cancelacion: "", completas: false, actualizadas: null });
  });
});

describe("REQ-3525: condiciones reales de docs/proveedores/condiciones.json", () => {
  const reales = JSON.parse(readFileSync("docs/proveedores/condiciones.json", "utf8")) as unknown[];
  it("REQ-3525: cada renglón pasa la revisión y cita su fuente pública con liga", () => {
    for (const r of reales) {
      expect(revisarCondiciones(r)).toMatchObject({ ok: true });
      expect((r as { fuente: string }).fuente).toMatch(/https:\/\//);
    }
  });
  it("REQ-3525: el SQL se aplica sobre la 0027 + 0030 sin error", () => {
    const d = db();
    d.exec(M0030);
    d.exec(sqlCondiciones(reales, "2026-11-13T00:00:00Z").sql);
  });
});
