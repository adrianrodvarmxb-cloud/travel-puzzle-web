// REQ-10878: el ciclo diario de Tangol repite los pasos por lotes hasta terminar, sin pisar la hora de FREETOUR. npx vitest run src/tangol/lib/diario-plan.test.ts
import { describe, expect, it } from "vitest";
import { siguientePasoDiario, TOPE_HORA_UTC, TOPE_PASOS_DIARIO } from "./diario-plan";

const inicio = new Date("2026-11-26T07:00:30Z"); // 1:00 CDMX

describe("REQ-10878: ciclo diario de Tangol (G-D1 a la 1:00 de CDMX; se repite hasta terminar)", () => {
  it("REQ-10878: tras un paso start o continue sigue con el siguiente; finish o idle terminan el ciclo", () => {
    expect(siguientePasoDiario({ accion: "start", paso: 1, ahora: new Date("2026-11-26T07:10:00Z"), inicio })).toEqual({ seguir: true, motivo: "lote escrito; sigue el siguiente" });
    expect(siguientePasoDiario({ accion: "continue", paso: 5, ahora: new Date("2026-11-26T07:40:00Z"), inicio })).toMatchObject({ seguir: true });
    expect(siguientePasoDiario({ accion: "finish", paso: 20, ahora: new Date("2026-11-26T08:10:00Z"), inicio })).toEqual({ seguir: false, motivo: "corrida cerrada (finish)" });
    expect(siguientePasoDiario({ accion: "idle", paso: 1, ahora: inicio, inicio })).toEqual({ seguir: false, motivo: "nada que hacer (idle)" });
  });

  it("REQ-10878: un paso abortado o fallido detiene el ciclo y lo dice (nunca se sigue escribiendo tras un error)", () => {
    expect(siguientePasoDiario({ accion: "abort", paso: 3, ahora: inicio, inicio })).toEqual({ seguir: false, motivo: "paso abortado: no se sigue" });
    expect(siguientePasoDiario({ accion: null, paso: 3, ahora: inicio, inicio })).toEqual({ seguir: false, motivo: "paso sin reporte: no se sigue" });
  });

  it("REQ-10878: no pisa la hora del sync de FREETOUR (3:00 CDMX = 9:00 UTC): a partir de las 8:45 UTC no arranca otro lote", () => {
    expect(TOPE_HORA_UTC).toEqual({ hora: 8, minuto: 45 });
    expect(siguientePasoDiario({ accion: "continue", paso: 9, ahora: new Date("2026-11-26T08:44:59Z"), inicio })).toMatchObject({ seguir: true });
    expect(siguientePasoDiario({ accion: "continue", paso: 9, ahora: new Date("2026-11-26T08:45:00Z"), inicio })).toEqual({ seguir: false, motivo: "tope de hora (8:45 UTC): la corrida arranca de nuevo mañana sin pisar el sync de FREETOUR" });
  });

  it("REQ-10878: tope de pasos por corrida como red de seguridad", () => {
    expect(TOPE_PASOS_DIARIO).toBe(60);
    expect(siguientePasoDiario({ accion: "continue", paso: 60, ahora: new Date("2026-11-26T07:30:00Z"), inicio })).toEqual({ seguir: false, motivo: "tope de 60 pasos: se revisa el workflow" });
  });
});
