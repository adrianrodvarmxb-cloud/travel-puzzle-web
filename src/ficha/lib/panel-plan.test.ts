// REQ-10782: un caso por combinación; ningún proveedor recibe el texto de otro (INC-020).
import { describe, expect, it } from "vitest";
import { panelPlan, type PanelFlags } from "./panel-plan";
import { fichaEjemplo } from "./fixtures";

const on: PanelFlags = { bookings: true, paidTours: true, directPurchase: true };
const off: PanelFlags = { bookings: false, paidTours: false, directPurchase: false };
const f = (booking: ReturnType<typeof fichaEjemplo>["booking"], extra: Partial<ReturnType<typeof fichaEjemplo>> = {}) => ({ ...fichaEjemplo(), ...extra, booking });

describe("REQ-10782: panel en dos ejes", () => {
  it("REQ-10782: free tour por calendario: propina al final, sin cobro ni moneda", () => {
    expect(panelPlan(f({ mode: "calendar", chargedBy: "none", leadHours: null }, { price: null }), on)).toEqual({ control: "calendar", chargedBy: "none", chargeCurrency: null, paymentNote: "tip-at-end", fellBackToAdvisor: false, leadHours: null });
  });
  it("REQ-10782: tour de pago por calendario: cobra el proveedor en su checkout, en su moneda", () => {
    expect(panelPlan(f({ mode: "calendar", chargedBy: "provider", leadHours: null }, { price: { amount: 25, currency: "EUR", per: "person" } }), on)).toMatchObject({ control: "calendar", chargedBy: "provider", chargeCurrency: "EUR", paymentNote: "provider-checkout" });
  });
  it("REQ-10782: Tangol (solicitud, cobra Travel Puzzle): formulario y «el asesor confirma»; NUNCA el calendario ni la moneda de FREETOUR (INC-020)", () => {
    const p = panelPlan(f({ mode: "request", chargedBy: "travelpuzzle", leadHours: 24 }, { provider: "tangol", price: { amount: 98, currency: "USD", per: "person" } }), on);
    expect(p).toEqual({ control: "request-form", chargedBy: "none", chargeCurrency: null, paymentNote: "advisor-confirms", fellBackToAdvisor: false, leadHours: 24 });
    expect(p.control).not.toBe("calendar");
  });
  it("REQ-10782: Big Bus con compra directa: caja de compra, cobra Travel Puzzle, paga ahora; apagada, cae al asesor", () => {
    expect(panelPlan(f({ mode: "purchase", chargedBy: "travelpuzzle", leadHours: null }, { price: { amount: 49, currency: "USD", per: "person" } }), on)).toMatchObject({ control: "purchase-box", chargedBy: "travelpuzzle", chargeCurrency: "USD", paymentNote: "pay-now" });
    expect(panelPlan(f({ mode: "purchase", chargedBy: "travelpuzzle", leadHours: null }), { ...on, directPurchase: false })).toMatchObject({ control: "advisor", fellBackToAdvisor: true, paymentNote: "advisor-confirms" });
  });
  it("REQ-10782: con las banderas apagadas todo cae al asesor, sin prometer cobro (payment-copy); el modo asesor no cuenta como caída", () => {
    for (const mode of ["calendar", "purchase"] as const) expect(panelPlan(f({ mode, chargedBy: "provider", leadHours: null }), off)).toMatchObject({ control: "advisor", chargeCurrency: null, fellBackToAdvisor: true });
    expect(panelPlan(f({ mode: "calendar", chargedBy: "provider", leadHours: null }), { ...on, paidTours: false })).toMatchObject({ control: "advisor", fellBackToAdvisor: true });
    expect(panelPlan(f({ mode: "advisor", chargedBy: "none", leadHours: null }), on)).toMatchObject({ control: "advisor", fellBackToAdvisor: false });
  });
});
