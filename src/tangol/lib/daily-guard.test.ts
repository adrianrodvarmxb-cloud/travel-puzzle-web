import { describe, it, expect } from "vitest";
import { decidirTopeDiario, TOPE_DIARIO } from "./daily-guard";

// REQ-10876: tope del 80 % del sync diario de Tangol (plan docs/plan-actualizacion-diaria-2026-11.md, D1).
describe("REQ-10876: tope diario de Tangol", () => {
  it("REQ-10876: el tope es 80 %", () => {
    expect(TOPE_DIARIO).toBe(0.8);
  });
  it("REQ-10876: sin corrida anterior no hay con qué comparar y se permite retirar", () => {
    expect(decidirTopeDiario({ ayer: 0, hoy: 500 })).toMatchObject({ permitirRetiros: true, motivo: "sin-referencia" });
  });
  it("REQ-10876: con 80 % o más de los tours de ayer se permite retirar", () => {
    expect(decidirTopeDiario({ ayer: 1000, hoy: 800 })).toMatchObject({ permitirRetiros: true, motivo: "dentro-del-tope" });
    expect(decidirTopeDiario({ ayer: 1000, hoy: 1200 })).toMatchObject({ permitirRetiros: true });
  });
  it("REQ-10876: con menos del 80 % no retira nada y avisa", () => {
    const d = decidirTopeDiario({ ayer: 1000, hoy: 799 });
    expect(d).toMatchObject({ permitirRetiros: false, motivo: "bajo-el-tope", avisar: true });
    expect(d.mensaje).toMatch(/799 de 1000/);
  });
  it("REQ-10876: una corrida vacía nunca retira", () => {
    expect(decidirTopeDiario({ ayer: 1215, hoy: 0 })).toMatchObject({ permitirRetiros: false, avisar: true });
  });
  it("REQ-10876: valores no válidos se tratan como sin referencia, nunca como permiso para vaciar", () => {
    expect(decidirTopeDiario({ ayer: Number.NaN, hoy: 10 })).toMatchObject({ motivo: "sin-referencia" });
    expect(decidirTopeDiario({ ayer: 1000, hoy: Number.NaN })).toMatchObject({ permitirRetiros: false });
  });
});
