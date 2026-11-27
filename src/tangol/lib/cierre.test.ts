// REQ-10876 / REQ-10877: cierre de la corrida diaria de Tangol (tope del 80 % y ocultar tras dos corridas). npx vitest run src/tangol/lib/cierre.test.ts
import { describe, expect, it } from "vitest";
import { planCierreTangol, toPresenciaTangol, TANGOL_OCULTAR_TRAS_CORRIDAS } from "./cierre";

const inicio = new Date("2026-11-26T07:05:00Z");
const antes = "2026-11-25 07:10:00";
const hoy = "2026-11-26 07:20:00";
const fila = (externalId: number, o: Partial<{ syncStatus: string; missingRuns: number; isActive: number | boolean; lastSeenAt: string | number | null }> = {}) => ({
  externalId, syncStatus: "active", missingRuns: 0, isActive: 1, lastSeenAt: hoy, ...o,
});

describe("REQ-10877: Tangol oculta un tour solo tras dos corridas seguidas sin verlo (G-D2, «Tras dos corridas»)", () => {
  it("REQ-10877: el umbral de Tangol es 2 corridas", () => {
    expect(TANGOL_OCULTAR_TRAS_CORRIDAS).toBe(2);
  });

  it("REQ-10877: un tour visto en esta corrida (lastSeenAt ≥ inicio) cuenta como visto; uno de antes, como faltante", () => {
    const p = toPresenciaTangol([fila(1), fila(2, { lastSeenAt: antes }), fila(3, { lastSeenAt: null }), fila(4, { lastSeenAt: inicio.getTime() + 1000 })], inicio);
    expect(p.map((r) => [r.externalId, r.seen])).toEqual([[1, true], [2, false], [3, false], [4, true]]);
    expect(p[0].isActive).toBe(true);
  });

  it("REQ-10877: primera corrida sin verlo → missing (sigue visible); segunda → oculto (isActive = false), sin borrar; si reaparece, vuelve", () => {
    const r = planCierreTangol({ tours: [
      fila(1, { lastSeenAt: antes }), // falta por primera vez
      fila(2, { syncStatus: "missing", missingRuns: 1, lastSeenAt: antes }), // falta por segunda vez
      fila(3, { syncStatus: "missing", missingRuns: 1 }), // reapareció
      fila(4, { syncStatus: "removed", missingRuns: 2, isActive: 0, lastSeenAt: antes }), // ya oculto, sigue sin venir: no se toca
      fila(5), fila(6), fila(7), fila(8), fila(9), fila(10), fila(11), fila(12), // 9 vistos de 11 activos: dentro del tope
    ], runStartedAt: inicio });
    expect(r.decision.permitirRetiros).toBe(true);
    expect(r.updates).toEqual([
      { externalId: 1, syncStatus: "missing", missingRuns: 1, isActive: true },
      { externalId: 2, syncStatus: "removed", missingRuns: 2, isActive: false },
      { externalId: 3, syncStatus: "active", missingRuns: 0, isActive: true },
    ]);
    expect(r.counts).toEqual({ missing: 1, removed: 1, reactivated: 1 });
    expect(r.resumen).toMatch(/1 oculto/);
  });
});

describe("REQ-10876: tope del 80 % conectado al cierre («menos del 80 % de los tours del día anterior: no retira nada y avisa al PO»)", () => {
  it("REQ-10876: con menos del 80 % de los activos vistos, no hay ningún cambio de presencia y se avisa", () => {
    const tours = [fila(1), fila(2), ...[3, 4, 5, 6, 7, 8, 9, 10].map((n) => fila(n, { lastSeenAt: antes }))]; // 2 de 10 vistos
    const r = planCierreTangol({ tours, runStartedAt: inicio });
    expect(r.decision).toMatchObject({ permitirRetiros: false, avisar: true, motivo: "bajo-el-tope" });
    expect(r.conteo).toEqual({ ayer: 10, hoy: 2 });
    expect(r.updates).toEqual([]);
    expect(r.aviso).not.toBeNull();
    expect(r.aviso!.asunto).toMatch(/Tangol/);
    expect(r.aviso!.texto).toMatch(/2 de 10/);
    expect(r.aviso!.texto).toMatch(/no se retira nada/i);
    expect(r.aviso!.whatsapp.length).toBeLessThan(600);
  });

  it("REQ-10876: «ayer» son los tours activos (los ya ocultos no cuentan) y «hoy» los vistos en esta corrida", () => {
    const tours = [fila(1), fila(2), fila(3, { isActive: 0, syncStatus: "removed", missingRuns: 2, lastSeenAt: antes }), fila(4, { lastSeenAt: antes })];
    const r = planCierreTangol({ tours, runStartedAt: inicio });
    expect(r.conteo).toEqual({ ayer: 3, hoy: 2 });
  });

  it("REQ-10876: sin corrida anterior (ningún tour activo) no hay con qué comparar y no se avisa", () => {
    const r = planCierreTangol({ tours: [], runStartedAt: inicio });
    expect(r.decision.motivo).toBe("sin-referencia");
    expect(r.aviso).toBeNull();
    expect(r.updates).toEqual([]);
  });

  it("REQ-10876: sin fecha de inicio de la corrida no se puede saber qué se vio: no se retira nada y se avisa", () => {
    const r = planCierreTangol({ tours: [fila(1), fila(2)], runStartedAt: null });
    expect(r.decision.permitirRetiros).toBe(false);
    expect(r.updates).toEqual([]);
    expect(r.aviso).not.toBeNull();
  });
});
