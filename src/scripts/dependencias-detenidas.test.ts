import { describe, expect, it } from "vitest";
import { estaCerrado, motivo } from "./dependencias-detenidas";

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
  it("REQ-10742: CERRADO cuenta como cerrado igual que CUMPLIDO; un cerrado que aún dice «falta» sigue abierto", () => {
    expect(estaCerrado("CERRADO (sin cambio de código; evidencia en la fila)")).toBe(true);
    expect(estaCerrado("CUMPLIDO")).toBe(true);
    expect(estaCerrado("CERRADO (falta la firma del PO)")).toBe(false);
    expect(estaCerrado("EN CURSO")).toBe(false);
    expect(estaCerrado("CERRADO (run verde) · Qué falta (inventario frente 5, 22-11-2026, 4.º lote): nada del folio")).toBe(true);
  });
  it("REQ-10742: «pendiente» dentro de código citado (`status: \"pendiente\"`) no reabre una fila CUMPLIDO", () => {
    expect(estaCerrado('CUMPLIDO (1 prueba verde; la sección está en `status: "pendiente"` en es y en)')).toBe(true);
    expect(estaCerrado("CUMPLIDO (falta la corrida)")).toBe(false);
  });
});
