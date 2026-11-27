import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PricePanel } from "./PricePanel";
import { BookingControl, type BookingControlSlotProps } from "./BookingControl";
import { PaymentNote } from "./PaymentNote";
import { AddToTripButton } from "./AddToTripButton";
import { AdvisorLink } from "./AdvisorLink";
import { panelView, type PanelContext } from "@/ficha/lib/panel-view";
import { panelPlan, type PanelFlags } from "@/ficha/lib/panel-plan";
import { fichaEjemplo } from "@/ficha/lib/fixtures";
import type { FichaModel } from "@/ficha/lib/model";

const r = renderToStaticMarkup;
const on: PanelFlags = { bookings: true, paidTours: true, directPurchase: true };
const off: PanelFlags = { bookings: false, paidTours: false, directPurchase: false };
const ctx: PanelContext = { visitorCountry: null, fx: null, whatsapp: "5215512345678", prefill: {}, milaEnabled: true, cartEnabled: true };
const build = (f: FichaModel, flags: PanelFlags) => panelView(f, panelPlan(f, flags), ctx);
const Calendario = ({ plan }: BookingControlSlotProps) => createElement("div", { "data-cal": plan.chargedBy }, "calendario");
const Formulario = () => createElement("form", null, "formulario");

describe("Panel de reserva de la ficha única (componentes)", () => {
  it("REQ-10852: precio, moneda del cargo y cancelación; el control va como children; sin precio no hay fila", () => {
    const v = build(fichaEjemplo(), off);
    const out = r(createElement(PricePanel, { price: v.price, cancellation: v.cancellation }, createElement("span", null, "hijo")));
    expect(out).toContain('data-panel="reserva"');
    expect(out).toContain("se cobra en USD");
    expect(out).toContain("data-cancelacion");
    expect(out).toContain("hijo");
    const vacio = r(createElement(PricePanel, { price: null, cancellation: null }));
    expect(vacio).not.toContain("data-precio");
    expect(vacio).not.toContain("N/D");
  });

  it("REQ-10853: monta el control del plan; si no está registrado o el plan cae al asesor, monta el asesor (LSP, INC-020)", () => {
    const f = { ...fichaEjemplo(), booking: { mode: "calendar" as const, chargedBy: "travelpuzzle" as const, leadHours: null } };
    const fallback = createElement("p", null, "asesor");
    const plan = panelPlan(f, on);
    const cal = r(createElement(BookingControl, { plan, lang: "es", controls: { calendar: Calendario, "request-form": Formulario }, fallback }));
    expect(cal).toContain('data-control="calendar"');
    expect(cal).toContain('data-cal="travelpuzzle"');
    const sin = r(createElement(BookingControl, { plan, lang: "es", controls: { "request-form": Formulario }, fallback }));
    expect(sin).toContain('data-control="advisor"');
    expect(sin).toContain("asesor");
    const apagado = r(createElement(BookingControl, { plan: panelPlan(f, off), lang: "es", controls: { calendar: Calendario }, fallback }));
    expect(apagado).not.toContain("calendario");
    const pedido = r(createElement(BookingControl, { plan: panelPlan(fichaEjemplo(), off), lang: "es", controls: { "request-form": Formulario }, fallback }));
    expect(pedido).toContain("<form>formulario</form>");
  });

  it("REQ-10854: texto de pago con su clave; null no pinta", () => {
    const v = build({ ...fichaEjemplo(), booking: { mode: "purchase", chargedBy: "travelpuzzle", leadHours: null } }, on);
    expect(r(createElement(PaymentNote, { view: v.payment }))).toBe('<p data-pago="pay-now" class="text-sm text-[#E3E9F7]">Pagas USD 98 al reservar.</p>');
    expect(r(createElement(PaymentNote, { view: null }))).toBe("");
  });

  it("REQ-10855: «Agregar a mi viaje» con la referencia y «Por cotizar» sin monto", () => {
    const out = r(createElement(AddToTripButton, { view: build(fichaEjemplo(), off).addToTrip }));
    expect(out).toContain('data-agregar="por-cotizar"');
    expect(out).toContain('data-ref="ejemplo-1"');
    expect(out).toContain("Agregar a mi viaje");
    expect(out).toContain("Por cotizar");
    expect(out).not.toContain("USD");
    expect(r(createElement(AddToTripButton, { view: null }))).toBe("");
  });

  it("REQ-10856: Mila con el contexto; en FREETOUR el asesor; compacto sin título", () => {
    const mila = r(createElement(AdvisorLink, { view: build(fichaEjemplo(), off).advisor }));
    expect(mila).toContain('data-ayuda="mila"');
    expect(mila).toContain("https://wa.me/5215512345678");
    expect(mila).toContain("Apártalo con un asesor");
    const ft = r(createElement(AdvisorLink, { view: build({ ...fichaEjemplo(), provider: "freetour" }, off).advisor, compact: true }));
    expect(ft).toContain('data-ayuda="asesor"');
    expect(ft).not.toContain("Mila");
    expect(ft).not.toContain("Apártalo");
    expect(r(createElement(AdvisorLink, { view: null }))).toBe("");
  });

  it("REQ-10874: con `localUrl` el precio se pinta con el texto del servidor y marcado para que el navegador pida el local; sin ella, texto plano", () => {
    const v = panelView(fichaEjemplo(), panelPlan(fichaEjemplo(), off), { ...ctx, localCurrency: true });
    const out = r(createElement(PricePanel, { price: v.price, cancellation: null }));
    expect(out).toContain("se cobra en USD");
    expect(out).toContain('data-precio-local="servidor"');
    const plano = r(createElement(PricePanel, { price: build(fichaEjemplo(), off).price, cancellation: null }));
    expect(plano).toContain("se cobra en USD");
    expect(plano).not.toContain("data-precio-local");
  });
});
