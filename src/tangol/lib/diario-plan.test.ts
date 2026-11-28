// REQ-10878, REQ-10957: el ciclo diario de Tangol repite los pasos por lotes hasta terminar, sin pisar la ventana de FREETOUR ni el presupuesto del job. npx vitest run src/tangol/lib/diario-plan.test.ts
import { describe, expect, it } from "vitest";
import { PRESUPUESTO_MINUTOS_CORRIDA, siguientePasoDiario, TOPE_HORA_UTC, TOPE_PASOS_DIARIO, VENTANA_FREETOUR_UTC } from "./diario-plan";

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
    const inicio730 = new Date("2026-11-26T07:30:00Z"); // dentro del presupuesto de 90 min (REQ-10957)
    expect(siguientePasoDiario({ accion: "continue", paso: 9, ahora: new Date("2026-11-26T08:44:59Z"), inicio: inicio730 })).toMatchObject({ seguir: true });
    expect(siguientePasoDiario({ accion: "continue", paso: 9, ahora: new Date("2026-11-26T08:45:00Z"), inicio: inicio730 })).toEqual({ seguir: false, motivo: "ventana de FREETOUR (8:45–12:15 UTC): no se arranca otro lote; la corrida sigue en la próxima (programada o a mano)" });
  });

  it("REQ-10957: la pausa por FREETOUR es una ventana (8:45–12:15 UTC), no un tope abierto: una corrida que GitHub dispare tarde (p. ej. 17:17 UTC) sigue lote tras lote", () => {
    expect(VENTANA_FREETOUR_UTC).toEqual({ desde: { hora: 8, minuto: 45 }, hasta: { hora: 12, minuto: 15 } });
    const tarde = new Date("2026-11-28T17:17:00Z");
    expect(siguientePasoDiario({ accion: "start", paso: 1, ahora: new Date("2026-11-28T17:27:00Z"), inicio: tarde })).toMatchObject({ seguir: true });
    expect(siguientePasoDiario({ accion: "continue", paso: 5, ahora: new Date("2026-11-28T18:10:00Z"), inicio: tarde })).toMatchObject({ seguir: true });
    expect(siguientePasoDiario({ accion: "continue", paso: 3, ahora: new Date("2026-11-28T12:14:59Z"), inicio: new Date("2026-11-28T12:00:00Z") })).toMatchObject({ seguir: false, motivo: expect.stringMatching(/ventana de FREETOUR/) });
    expect(siguientePasoDiario({ accion: "continue", paso: 3, ahora: new Date("2026-11-28T12:15:00Z"), inicio: new Date("2026-11-28T12:00:00Z") })).toMatchObject({ seguir: true });
    // Antes de la ventana, como siempre.
    expect(siguientePasoDiario({ accion: "continue", paso: 3, ahora: new Date("2026-11-28T07:40:00Z"), inicio: new Date("2026-11-28T07:17:00Z") })).toMatchObject({ seguir: true });
  });

  it("REQ-10957: presupuesto de tiempo por corrida: pasados 90 min desde el inicio no arranca otro lote (el job tiene 120 min; un lote ~10 y el humo ~10), y la corrida sigue mañana con `continue`", () => {
    expect(PRESUPUESTO_MINUTOS_CORRIDA).toBe(90);
    const tarde = new Date("2026-11-28T17:17:00Z");
    expect(siguientePasoDiario({ accion: "continue", paso: 8, ahora: new Date("2026-11-28T18:46:59Z"), inicio: tarde })).toMatchObject({ seguir: true });
    expect(siguientePasoDiario({ accion: "continue", paso: 9, ahora: new Date("2026-11-28T18:47:00Z"), inicio: tarde })).toEqual({ seguir: false, motivo: "presupuesto de la corrida (90 min): no se arranca otro lote; la corrida sigue en la próxima (programada o a mano)" });
    // finish gana aunque el presupuesto se haya agotado.
    expect(siguientePasoDiario({ accion: "finish", paso: 9, ahora: new Date("2026-11-28T19:00:00Z"), inicio: tarde })).toEqual({ seguir: false, motivo: "corrida cerrada (finish)" });
  });

  it("REQ-10878: tope de pasos por corrida como red de seguridad", () => {
    expect(TOPE_PASOS_DIARIO).toBe(60);
    expect(siguientePasoDiario({ accion: "continue", paso: 60, ahora: new Date("2026-11-26T07:30:00Z"), inicio })).toEqual({ seguir: false, motivo: "tope de 60 pasos: se revisa el workflow" });
  });
});
