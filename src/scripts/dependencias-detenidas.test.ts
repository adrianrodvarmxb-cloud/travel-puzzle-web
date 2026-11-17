import { describe, expect, it } from "vitest";
import { motivo } from "./dependencias-detenidas";

describe("REQ-10742: qué detiene a cada folio", () => {
  it("REQ-10742: un folio que depende de otro sin cerrar se clasifica por esa dependencia antes que por su texto", () => {
    expect(motivo("PENDIENTE (falta el OK del PO)", "CÓDIGO", ["REQ-1663"])).toBe("Depende de otro folio sin cerrar");
  });
  it("REQ-10742: borrador o sin construir es pieza sin construir; secreto por cargar va aparte", () => {
    expect(motivo("EN CURSO (PR en borrador, sin ruta ni envío)", "CÓDIGO")).toBe("Pieza sin construir o en borrador");
    expect(motivo("PENDIENTE (apagada; faltan los secretos de Actions)", "BANDERA")).toBe("Secreto o variable por cargar");
  });
  it("REQ-10742: un estado que no dice qué falta se reporta así, no se inventa el motivo", () => {
    expect(motivo("PENDIENTE", "CÓDIGO")).toBe("Sin iniciar (el estado no dice qué falta)");
    expect(motivo("EN CURSO", "CÓDIGO")).toBe("A medias (el estado no dice qué falta)");
    expect(motivo("PENDIENTE", "TAREA-PO")).toBe("Tarea a mano del PO");
  });
});
