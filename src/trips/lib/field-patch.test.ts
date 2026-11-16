import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { buildFieldPatchSql } from "./field-patch";

const rows = [
  { ref: "FCH-R1", trip: { minPax: 2, importantInfo: "Lleva pasaporte.\nHabitación triple: es una doble con cama plegable.", titleEs: "No se toca" } },
  { ref: "FCH-L9", trip: { minPax: 2, importantInfo: "It's fine", status: "draft" } },
];

describe("REQ-10726 corrección puntual de campos de viajes", () => {
  it("REQ-10726: escribe solo los campos pedidos, por id y agencia", () => {
    const r = buildFieldPatchSql(rows, "FCH", ["minPax", "importantInfo"], "ag-fch");
    expect(r.ids).toEqual(["fch-fch-r1", "fch-fch-l9"]);
    expect(r.sql[0]).toBe(`UPDATE "Trip" SET "minPax"=2,"importantInfo"='Lleva pasaporte.\nHabitación triple: es una doble con cama plegable.' WHERE "id"='fch-fch-r1' AND "agencyId"='ag-fch';`);
    expect(r.sql.join("\n")).not.toMatch(/titleEs|status|slug|code|images|difficultyLevel|category/);
  });
  it("REQ-10726: escapa las comillas", () => {
    expect(buildFieldPatchSql(rows, "FCH", ["importantInfo"], "ag-fch").sql[1]).toContain(`'It''s fine'`);
  });
  it("REQ-10726: rechaza campos fuera de la lista cerrada y campos que el archivo no trae", () => {
    expect(() => buildFieldPatchSql(rows, "FCH", ["status"], "ag-fch")).toThrow(/no permitido/);
    expect(() => buildFieldPatchSql(rows, "FCH", [], "ag-fch")).toThrow(/al menos un campo/);
    expect(() => buildFieldPatchSql([{ ref: "X", trip: {} }], "FCH", ["minPax"], "ag-fch")).toThrow(/no trae/);
  });
  it("REQ-10726: con el archivo de Fantástica China salen 51 UPDATE, uno por viaje", () => {
    const b = JSON.parse(readFileSync("imports/fantasticachina-2027.json", "utf8")) as { agency: { id: string; initials: string }; trips: { ref: string; trip: Record<string, unknown> }[] };
    const r = buildFieldPatchSql(b.trips, b.agency.initials, ["minPax", "importantInfo"], b.agency.id);
    expect(r.sql.length).toBe(51);
    expect(new Set(r.ids).size).toBe(51);
    expect(r.sql.every((s) => s.startsWith(`UPDATE "Trip" SET "minPax"=2,"importantInfo"='`))).toBe(true);
  });
});
