import { describe, expect, it } from "vitest";
import { CONFIRMATION_BUSINESS_HOURS, advisorConfirmation, confirmationDeadline, confirmationStep, promisesAnotherDeadline } from "./payment-copy";
import { bookingSteps } from "@/trips/lib/booking-steps";
import { bookingCopy } from "@/tours/lib/booking-cta";

const LANGS = ["es", "en", "pt", "de", "fr", "it"] as const;

// REQ-10653 (construye la decisión 33, REQ-10611): un solo texto de 48 horas hábiles para todos los proveedores.
describe("REQ-10653: plazo único de confirmación, 48 horas hábiles", () => {
  it("REQ-10653: el plazo es uno y sale en cada idioma del sitio; un idioma desconocido cae al inglés", () => {
    expect(CONFIRMATION_BUSINESS_HOURS).toBe(48);
    for (const l of LANGS) expect(confirmationDeadline(l)).toMatch(/^48 /);
    expect(confirmationDeadline("es")).toBe("48 horas hábiles");
    expect(confirmationDeadline("xx")).toBe(confirmationDeadline("en"));
  });
  it("REQ-10653: «Cómo funciona tu reserva» (viajes) toma el paso de la confirmación de la única fuente, con y sin retención", () => {
    for (const l of LANGS) for (const cardHold of [false, true]) {
      const s = bookingSteps(l, { cardHold });
      expect(s.steps[1]).toBe(confirmationStep(l));
      expect(s.steps[1]).toContain(confirmationDeadline(l));
      expect(s.steps.some((x) => x.includes("{confirmacion}"))).toBe(false);
      expect(s.steps.some(promisesAnotherDeadline)).toBe(false);
    }
  });
  it("REQ-10653: el panel «Apártalo con un asesor» de la ficha de tour dice el mismo plazo", () => {
    expect(bookingCopy("es").advisorSub).toBe(advisorConfirmation("es"));
    expect(bookingCopy("en").advisorSub).toBe(advisorConfirmation("en"));
    expect(bookingCopy("es").advisorSub).toContain("48 horas hábiles");
    expect(bookingCopy("en").advisorSub).toContain("48 business hours");
  });
  it("REQ-10653: la guarda detecta otro plazo y deja pasar el único", () => {
    expect(promisesAnotherDeadline("Te confirmamos en 24 horas.")).toBe(true);
    expect(promisesAnotherDeadline("We confirm within 72 hours.")).toBe(true);
    expect(promisesAnotherDeadline(confirmationStep("de"))).toBe(false);
    expect(promisesAnotherDeadline("Cancelación gratis hasta 48 h antes.")).toBe(false);
  });
});
