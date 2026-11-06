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
