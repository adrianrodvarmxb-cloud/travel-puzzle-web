import { describe, expect, it } from "vitest";
import type { PanelPlan } from "@/ficha/lib/panel-plan";
import { bookingFlow, bookingFlowUnicoOn, UNIFIED_STEPS, type FlowProduct } from "./flow";

const prod = "www.travelpuzzle.com.mx";
const prev = "pr-800-travel-puzzle-web.adrianrodvarmxb.workers.dev";

const plan = (p: Partial<PanelPlan>): PanelPlan => ({
  control: "advisor", chargedBy: "none", chargeCurrency: null, paymentNote: "advisor-confirms", fellBackToAdvisor: false, leadHours: null, ...p,
});

const freetourFree: FlowProduct = { provider: "freetour", booking: { mode: "calendar", chargedBy: "none", leadHours: null }, price: null };
const freetourPaid: FlowProduct = { provider: "freetour", booking: { mode: "calendar", chargedBy: "provider", leadHours: null }, price: { amount: 35, currency: "EUR" } };
const tangol: FlowProduct = { provider: "tangol", booking: { mode: "request", chargedBy: "travelpuzzle", leadHours: 48 }, price: { amount: 1200, currency: "MXN" } };
const bigbus: FlowProduct = { provider: "propios", booking: { mode: "purchase", chargedBy: "travelpuzzle", leadHours: null }, price: { amount: 900, currency: "MXN" } };
const agencia: FlowProduct = { provider: "propios", booking: { mode: "request", chargedBy: "travelpuzzle", leadHours: 72 }, price: { amount: 25000, currency: "MXN" } };
const sinPrecio: FlowProduct = { provider: "propios", booking: { mode: "request", chargedBy: "travelpuzzle", leadHours: null }, price: null };

describe("flow: paso de reserva único (ola 8, REQ-10952 / REQ-10766 / REQ-10775)", () => {
  it("REQ-10952: BOOKING_FLOW_UNICO_ENABLED tiene tres valores y arranca en «false»: nada cambia en producción ni en preview", () => {
    expect(bookingFlowUnicoOn({}, prod)).toBe(false);
    expect(bookingFlowUnicoOn({ BOOKING_FLOW_UNICO_ENABLED: "false" }, prev)).toBe(false);
    expect(bookingFlowUnicoOn({ BOOKING_FLOW_UNICO_ENABLED: "1" }, prev)).toBe(false);
    expect(bookingFlowUnicoOn({ BOOKING_FLOW_UNICO_ENABLED: "preview" }, prev)).toBe(true);
    expect(bookingFlowUnicoOn({ BOOKING_FLOW_UNICO_ENABLED: "preview" }, prod)).toBe(false);
    expect(bookingFlowUnicoOn({ BOOKING_FLOW_UNICO_ENABLED: "true" }, prod)).toBe(true);
  });

  it("REQ-10952: con la bandera apagada el flujo es el de hoy, control por control (regreso del plan §7: «apagar la bandera»)", () => {
    const f = bookingFlow(tangol, plan({ control: "request-form", chargedBy: "none" }), { unified: false });
    expect(f.unified).toBe(false);
    expect(f.steps).toEqual(["date-time", "people", "details", "confirmation"]);
    expect(f.channel).toBe("request");
    expect(f.payment).toBe("none");

    const c = bookingFlow(freetourPaid, plan({ control: "calendar", chargedBy: "provider", chargeCurrency: "EUR", paymentNote: "provider-checkout" }), { unified: false });
    expect(c.steps).toEqual(["date-time", "people", "details", "payment", "confirmation", "my-booking"]);
    expect(c.channel).toBe("freetour-api");
    expect(c.payment).toBe("provider-checkout");

    const b = bookingFlow(bigbus, plan({ control: "purchase-box", chargedBy: "travelpuzzle", chargeCurrency: "MXN", paymentNote: "pay-now" }), { unified: false });
    expect(b.steps).toEqual(["date-time", "people", "details", "payment", "confirmation"]);
    expect(b.channel).toBe("octo");
    expect(b.payment).toBe("stripe-travelpuzzle");

    const a = bookingFlow(agencia, plan({ control: "advisor", fellBackToAdvisor: true }), { unified: false });
    expect(a.steps).toEqual(["advisor"]);
    expect(a.channel).toBe("advisor");
    expect(a.payment).toBe("none");
  });

  it("REQ-10775: encendido, Tangol, Big Bus y las agencias siguen los mismos pasos que FREETOUR y cobran con nuestro Stripe", () => {
    const t = bookingFlow(tangol, plan({ control: "request-form" }), { unified: true });
    expect(t.unified).toBe(true);
    expect(t.steps).toEqual(UNIFIED_STEPS);
    expect(t.channel).toBe("tangol-api");
    expect(t.payment).toBe("stripe-travelpuzzle");
    expect(t.leadHours).toBe(48);

    const b = bookingFlow(bigbus, plan({ control: "purchase-box", chargedBy: "travelpuzzle", chargeCurrency: "MXN", paymentNote: "pay-now" }), { unified: true });
    expect(b.steps).toEqual(UNIFIED_STEPS);
    expect(b.channel).toBe("octo");
    expect(b.payment).toBe("stripe-travelpuzzle");

    const a = bookingFlow(agencia, plan({ control: "request-form" }), { unified: true });
    expect(a.steps).toEqual(UNIFIED_STEPS);
    expect(a.channel).toBe("request");
    expect(a.payment).toBe("stripe-travelpuzzle");
  });

  it("REQ-10775: FREETOUR no cambia con la bandera encendida: su calendario y su checkout siguen siendo los suyos (nada de FREETOUR)", () => {
    const paid = bookingFlow(freetourPaid, plan({ control: "calendar", chargedBy: "provider", chargeCurrency: "EUR", paymentNote: "provider-checkout" }), { unified: true });
    expect(paid.steps).toEqual(UNIFIED_STEPS);
    expect(paid.channel).toBe("freetour-api");
    expect(paid.payment).toBe("provider-checkout");

    const free = bookingFlow(freetourFree, plan({ control: "calendar", chargedBy: "none", paymentNote: "tip-at-end" }), { unified: true });
    expect(free.steps).toEqual(["date-time", "people", "details", "confirmation", "my-booking"]);
    expect(free.channel).toBe("freetour-api");
    expect(free.payment).toBe("none");
    // bandera apagada: idéntico
    expect(bookingFlow(freetourFree, plan({ control: "calendar", chargedBy: "none", paymentNote: "tip-at-end" }), { unified: false })).toEqual({ ...free, unified: false });
  });

  it("REQ-10766: sin precio conocido no hay paso de pago: la solicitud va con el asesor, nunca un cobro a ciegas", () => {
    const s = bookingFlow(sinPrecio, plan({ control: "request-form" }), { unified: true });
    expect(s.steps).toEqual(["date-time", "people", "details", "confirmation", "my-booking"]);
    expect(s.channel).toBe("request");
    expect(s.payment).toBe("none");
  });

  it("REQ-10952: el panel caído al asesor manda sobre la bandera: encendida o no, el flujo es el asesor", () => {
    const f = bookingFlow(tangol, plan({ control: "advisor", fellBackToAdvisor: true }), { unified: true });
    expect(f).toEqual({ unified: true, steps: ["advisor"], channel: "advisor", payment: "none", leadHours: 48 });
  });
});
