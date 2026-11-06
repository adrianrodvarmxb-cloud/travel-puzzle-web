import { describe, expect, it } from "vitest";
import { trasladosMode } from "./page-mode";

describe("Modo de /traslados", () => {
  it("REQ-120: con ARMA_TU_VIAJE_ENABLED apagada, /traslados se queda como hoy", () => {
    expect(trasladosMode({ TRANSFERS_ENABLED: "true" })).toBe("widget");
    expect(trasladosMode({ TRANSFERS_ENABLED: "true", ARMA_TU_VIAJE_ENABLED: "false" })).toBe("widget");
    expect(trasladosMode({})).toBe("hidden");
  });

  it("REQ-120: con la bandera encendida es entrada al carrito y el cuadro suelto se oculta", () => {
    expect(trasladosMode({ TRANSFERS_ENABLED: "true", ARMA_TU_VIAJE_ENABLED: "true" })).toBe("cart-entry");
    expect(trasladosMode({ ARMA_TU_VIAJE_ENABLED: "true" })).toBe("cart-entry");
  });
});

import { trasladosView } from "./page-mode";
describe("REQ-172: sección «Transporte turístico» en /traslados", () => {
  it("REQ-172: con TRANSPORT_ENABLED la sección sale sin depender de ARMA_TU_VIAJE_ENABLED", () => {
    expect(trasladosView({ TRANSFERS_ENABLED: "true", TRANSPORT_ENABLED: "true", ARMA_TU_VIAJE_ENABLED: "false" })).toEqual({ mode: "widget", transport: true, found: true });
    expect(trasladosView({ TRANSFERS_ENABLED: "true", TRANSPORT_ENABLED: "true", ARMA_TU_VIAJE_ENABLED: "true" })).toEqual({ mode: "cart-entry", transport: true, found: true });
  });
  it("REQ-172: con TRANSPORT_ENABLED apagada /traslados queda como hoy", () => {
    expect(trasladosView({ TRANSFERS_ENABLED: "true" })).toEqual({ mode: "widget", transport: false, found: true });
    expect(trasladosView({})).toEqual({ mode: "hidden", transport: false, found: false });
  });
  it("REQ-172: sin el cuadro de traslados pero con transporte, la página existe solo con la sección", () => {
    expect(trasladosView({ TRANSPORT_ENABLED: "true" })).toEqual({ mode: "hidden", transport: true, found: true });
  });
});
