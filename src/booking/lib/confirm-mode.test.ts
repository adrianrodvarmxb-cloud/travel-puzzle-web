import { describe, expect, it } from "vitest";
import { confirmMode } from "./confirm-mode";

// REQ-935: con el piloto encendido, el paso «Confirmar» de un tour de pago lleva al cobro (antes se bloqueaba siempre).
describe("REQ-935 confirmMode", () => {
  it("REQ-935: reservas apagadas → cerrado", () => {
    expect(confirmMode({ bookingsEnabled: false, isPaid: true, paidEnabled: true })).toBe("closed");
  });
  it("REQ-935: free tour → confirmar aquí", () => {
    expect(confirmMode({ bookingsEnabled: true, isPaid: false, paidEnabled: false })).toBe("free");
  });
  it("REQ-935: de pago con PAID_TOURS_ENABLED apagada → «muy pronto», sin botón", () => {
    expect(confirmMode({ bookingsEnabled: true, isPaid: true, paidEnabled: false })).toBe("paid_soon");
  });
  it("REQ-935: de pago con el piloto encendido → reservar e ir a pagar", () => {
    expect(confirmMode({ bookingsEnabled: true, isPaid: true, paidEnabled: true })).toBe("pay");
  });
});
