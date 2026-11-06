import { describe, expect, it } from "vitest";
import { cartFlags } from "./flags";

describe("Banderas de Arma tu viaje", () => {
  it("REQ-104: todo apagado salvo \"true\" exacto (la ruta responde 404)", () => {
    expect(cartFlags({})).toEqual({ enabled: false, payments: false, visa: false, etias: false });
    expect(cartFlags({ ARMA_TU_VIAJE_ENABLED: "TRUE", CART_PAYMENTS_ENABLED: "1" }).enabled).toBe(false);
    expect(cartFlags({ ARMA_TU_VIAJE_ENABLED: "true", CART_PAYMENTS_ENABLED: "true", VISA_ENABLED: "true", ETIAS_ENABLED: "true" }))
      .toEqual({ enabled: true, payments: true, visa: true, etias: true });
  });
});
