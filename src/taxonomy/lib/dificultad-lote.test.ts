import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { leerLote, planDificultad, verificarDificultad, type FilaD1 } from "./dificultad-lote";

const lote = leerLote(JSON.parse(readFileSync("src/taxonomy/data/dificultad-2026-11-11.json", "utf8")));
const filas = (over: Record<string, Partial<FilaD1>> = {}): FilaD1[] =>
  lote.viajes.map((v) => ({ id: v.id, kind: v.kind, difficultyLevel: null, ...over[v.id] }));

describe("REQ-1518 / REQ-1520 lote de dificultad", () => {
  it("REQ-1518: el lote firmado trae 370 viajes, cada uno con nivel 1–5 o sin dato, y ningún traslado con nivel", () => {
    expect(lote.viajes).toHaveLength(370);
    expect(new Set(lote.viajes.map((v) => v.id)).size).toBe(370);
    for (const v of lote.viajes) {
      expect(v.nivel === null || [1, 2, 3, 4, 5].includes(v.nivel)).toBe(true);
      if (v.kind === "transporte") expect(v.nivel).toBeNull();
    }
    const n = (k: number | null) => lote.viajes.filter((v) => v.nivel === k).length;
    expect([n(1), n(2), n(3), n(4), n(5)]).toEqual([22, 26, 37, 30, 11]);
  });
  it("REQ-1518: un lote con un nivel inválido o un id raro se rechaza", () => {
    expect(() => leerLote({ viajes: [{ id: "x", ref: "X", kind: "tour", nivel: 7 }] })).toThrow();
    expect(() => leerLote({ viajes: [{ id: "x'; DROP", ref: "X", kind: "tour", nivel: 2 }] })).toThrow();
    expect(() => leerLote({ viajes: [{ id: "ext-ab", ref: "AB", kind: "transporte", nivel: 2 }] })).toThrow();
  });
  it("REQ-1520: el plan solo cambia filas que existen y cuyo valor es distinto; arma el regreso con el valor anterior", () => {
    const d1 = filas({ "iwp-cus-10": { difficultyLevel: 5 }, "iwp-cus-13": { difficultyLevel: 2 } }).filter((f) => f.id !== "fch-fch-r1");
    const plan = planDificultad(lote, d1);
    expect(plan.faltan).toEqual(["fch-fch-r1"]);
    expect(plan.cambios.find((c) => c.id === "iwp-cus-10")).toBeUndefined();
    expect(plan.cambios.find((c) => c.id === "iwp-cus-13")).toEqual({ id: "iwp-cus-13", antes: 2, despues: 4 });
    expect(plan.sql).toContain(`UPDATE "Trip" SET "difficultyLevel" = 4 WHERE "id" = 'iwp-cus-13';`);
    expect(plan.regreso).toContain(`UPDATE "Trip" SET "difficultyLevel" = 2 WHERE "id" = 'iwp-cus-13';`);
    for (const l of plan.sql.trim().split("\n")) expect(l).toMatch(/^UPDATE "Trip" SET "difficultyLevel" = ([1-5]|NULL) WHERE "id" = '[a-z0-9-]+';$/);
  });
  it("REQ-1520: si en D1 el viaje es de otro tipo (traslado), no se le pone nivel", () => {
    const plan = planDificultad(lote, filas({ "iwp-cus-10": { kind: "transporte" } }));
    expect(plan.cambios.find((c) => c.id === "iwp-cus-10")).toBeUndefined();
    expect(plan.omitidos).toContain("iwp-cus-10");
  });
  it("REQ-1520: la verificación falla si una fila no quedó con su valor", () => {
    const plan = planDificultad(lote, filas());
    const ok = plan.cambios.map((c) => ({ id: c.id, difficultyLevel: c.despues }));
    expect(verificarDificultad(plan, ok).ok).toBe(true);
    const mal = ok.map((f, i) => (i === 0 ? { ...f, difficultyLevel: 9 } : f));
    expect(verificarDificultad(plan, mal)).toMatchObject({ ok: false });
  });
});
