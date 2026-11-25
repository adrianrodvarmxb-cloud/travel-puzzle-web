import { describe, expect, it } from "vitest";
import { panelView, type PanelContext } from "./panel-view";
import { panelPlan, type PanelFlags } from "./panel-plan";
import { fichaEjemplo } from "./fixtures";
import { advisorConfirmation } from "./payment-copy";
import type { FichaModel } from "./model";

const off: PanelFlags = { bookings: false, paidTours: false, directPurchase: false };
const on: PanelFlags = { bookings: true, paidTours: true, directPurchase: true };
const ctx = (extra: Partial<PanelContext> = {}): PanelContext => ({
  visitorCountry: null, fx: null, whatsapp: "5215512345678", prefill: {}, milaEnabled: true, cartEnabled: true, ...extra,
});
const ficha = (extra: Partial<FichaModel> = {}): FichaModel => ({ ...fichaEjemplo(), ...extra });
const view = (f: FichaModel, flags: PanelFlags, c = ctx()) => panelView(f, panelPlan(f, flags), c);

describe("Panel de reserva de la ficha única (vista pura)", () => {
  it("REQ-10851: precio con la moneda del cargo y cancelación resumida junto al precio (decisiones 32 y 34)", () => {
    const v = view(ficha(), off);
    expect(v.price!.text).toBe("USD $98 por persona · se cobra en USD");
    expect(v.cancellation).toContain("48");
    const mx = view(ficha(), off, ctx({ visitorCountry: "MX", fx: { base: "USD", date: "2026-11-21", rates: { MXN: 18.2 } } }));
    expect(mx.price!.text).toContain("MXN $1,784 aprox.");
    expect(mx.price!.text).toContain("se cobra en USD $98");
    expect(view(ficha({ price: null }), off).price).toBeNull();
    expect(view(ficha({ cancellation: null }), off).cancellation).toBeNull();
  });

  it("REQ-10851: sin dato no hay «N/D» en ninguna parte del panel", () => {
    const v = view(ficha({ price: null, cancellation: null }), off, ctx({ whatsapp: null, cartEnabled: false }));
    expect(JSON.stringify(v)).not.toContain("N/D");
    expect(v.advisor).toBeNull();
    expect(v.addToTrip).toBeNull();
  });

  it("REQ-10854: texto de pago por clave del plan; ningún proveedor recibe el texto de otro (INC-020)", () => {
    expect(view(ficha({ booking: { mode: "request", chargedBy: "travelpuzzle", leadHours: null } }), on).payment!.text).toBe(advisorConfirmation("es"));
    const tip = view(ficha({ provider: "freetour", price: { amount: 0, currency: "EUR", per: "person" }, booking: { mode: "calendar", chargedBy: "none", leadHours: null } }), on);
    expect(tip.plan.paymentNote).toBe("tip-at-end");
    expect(tip.payment!.text).toBe("Al final de la experiencia, deja al guía la propina que consideres justa.");
    const checkout = view(ficha({ provider: "freetour", price: { amount: 20, currency: "EUR", per: "person" }, booking: { mode: "calendar", chargedBy: "provider", leadHours: null } }), on);
    expect(checkout.payment!.text).toBe("Pagas EUR 20 al reservar.");
    const tangol = view(ficha({ provider: "tangol", booking: { mode: "calendar", chargedBy: "travelpuzzle", leadHours: null } }), on);
    expect(tangol.payment!.text).toBe("Pagas USD 98 al reservar.");
    expect(tangol.payment!.text).not.toContain("propina");
    expect(view(ficha({ booking: { mode: "calendar", chargedBy: "travelpuzzle", leadHours: null } }), off).payment!.text).toBe(advisorConfirmation("es"));
  });

  it("REQ-10855: «Agregar a mi viaje» en toda ficha; sin cobro en línea va «por cotizar» sin monto (decisión 23)", () => {
    const req = view(ficha(), off).addToTrip!;
    expect(req.quote).toBe(true);
    expect(req.label).toBe("Agregar a mi viaje");
    expect(req.note).toBe("Por cotizar");
    expect(req.ref).toBe("ejemplo-1");
    const paid = view(ficha({ booking: { mode: "purchase", chargedBy: "travelpuzzle", leadHours: null } }), on).addToTrip!;
    expect(paid.quote).toBe(false);
    expect(paid.note).toBeNull();
    const free = view(ficha({ provider: "freetour", price: { amount: 0, currency: "EUR", per: "person" }, booking: { mode: "calendar", chargedBy: "none", leadHours: null } }), on).addToTrip!;
    expect(free.quote).toBe(false);
    expect(view(ficha(), off, ctx({ cartEnabled: false })).addToTrip).toBeNull();
    expect(view({ ...ficha(), lang: "en" }, off).addToTrip!.label).toBe("Add to my trip");
  });

  it("REQ-10856: acceso a Mila en el panel (decisión 43); en FREETOUR el asesor por WhatsApp, nunca Mila (decisión 42)", () => {
    const v = view(ficha(), off);
    expect(v.advisor!.kind).toBe("mila");
    expect(v.advisor!.cta).toBe("Escribir a Mila");
    expect(decodeURIComponent(v.advisor!.href)).toContain("código ejemplo-1");
    const ft = view(ficha({ provider: "freetour" }), off);
    expect(ft.advisor!.kind).toBe("asesor");
    expect(ft.advisor!.cta).toBe("Hablar con un asesor");
    expect(view(ficha(), off, ctx({ milaEnabled: false })).advisor!.kind).toBe("asesor");
    expect(v.advisor!.title).toBe("Apártalo con un asesor");
  });

  it("REQ-10874: con LOCAL_CURRENCY_ENABLED el precio lleva la ruta de /api/precio-local (sin país en el HTML); apagada o gratis, no", () => {
    const v = view(ficha(), off, ctx({ localCurrency: true }));
    expect(v.price!.text).toBe("USD $98 por persona · se cobra en USD");
    expect(v.price!.localUrl).toBe("/api/precio-local?amount=98&currency=USD&per=person&lang=es");
    expect(view(ficha(), off, ctx({ localCurrency: false })).price!.localUrl).toBeNull();
    expect(view(ficha(), off).price!.localUrl).toBeNull();
    expect(view(ficha({ price: { amount: 0, currency: "EUR", per: "person" } }), off, ctx({ localCurrency: true })).price!.localUrl).toBeNull();
  });
});
