import { describe, it, expect } from "vitest";
import { bookingSteps, isCardHoldEnabled } from "./booking-steps";

describe("REQ-059 'Cómo funciona tu reserva' según lo que existe en producción", () => {
  it("REQ-059: sin Stripe (hoy) dice que no se cobra nada al solicitar y que se paga con enlace al confirmar", () => {
    const s = bookingSteps("es", { cardHold: false });
    expect(s.title).toBe("Cómo funciona tu reserva");
    expect(s.steps[0]).toMatch(/No te cobramos nada/);
    expect(s.steps.join(" ")).toMatch(/enlace de pago seguro/);
    expect(s.steps.join(" ")).not.toMatch(/retenemos/i);
  });
  it("REQ-059: con retención en tarjeta encendida explica retener, cobrar al confirmar o liberar por el mismo medio", () => {
    const s = bookingSteps("es", { cardHold: true });
    expect(s.steps.join(" ")).toMatch(/retenemos/i);
    expect(s.steps.join(" ")).toMatch(/mismo medio/);
  });
  it("REQ-059: 6 idiomas con respaldo en inglés y 4 pasos", () => {
    for (const l of ["es", "en", "pt", "de", "fr", "it", "xx"]) for (const cardHold of [false, true]) expect(bookingSteps(l, { cardHold }).steps).toHaveLength(4);
    expect(bookingSteps("xx", { cardHold: false }).title).toBe("How your booking works");
  });
  it("REQ-059: la bandera STRIPE_HOLD_ENABLED solo se enciende con \"true\"", () => {
    expect(isCardHoldEnabled(undefined)).toBe(false);
    expect(isCardHoldEnabled("true")).toBe(true);
  });
});
