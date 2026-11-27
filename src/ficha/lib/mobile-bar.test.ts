// REQ-10910: barra fija de precio y reserva en celular (ficha única de viajes, decisión 25).
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MobileBar } from "@/components/ficha/panel/MobileBar";
import { fichaEjemplo } from "./fixtures";
import { mobileBarView } from "./mobile-bar";
import { panelPlan } from "./panel-plan";
import { panelView, type PanelContext, type PanelView } from "./panel-view";

const ctx: PanelContext = { whatsapp: "5215512345678", prefill: {}, visitorCountry: null, fx: null, cartEnabled: false, milaEnabled: false, localCurrency: true };
const panel = (over: Partial<ReturnType<typeof fichaEjemplo>> = {}): PanelView => {
  const f = { ...fichaEjemplo(), ...over };
  return panelView(f, panelPlan(f, { bookings: false, paidTours: false, directPurchase: false }), ctx);
};

describe("REQ-10910: barra fija en celular para viajes", () => {
  it("REQ-10910: con precio, la barra lleva el precio «desde» del proveedor, su ruta de precio local y el botón al panel; sin precio, solo el botón", () => {
    const con = mobileBarView(panel(), "es");
    expect(con).toMatchObject({ href: "#reserva", cta: expect.any(String) });
    expect(con?.priceText).toMatch(/USD/);
    expect(con?.localUrl).toMatch(/^\/api\/precio-local\?/);
    const sin = mobileBarView(panel({ price: null }), "es");
    expect(sin?.priceText).toBeNull();
    expect(sin?.cta).toBeTruthy();
    expect(mobileBarView(panel(), "en")?.cta).not.toBe(mobileBarView(panel(), "es")?.cta);
  });

  it("REQ-10910: el componente pinta la barra con el ancla #reserva y el precio marcado para la moneda local; sin vista, nada", () => {
    const html = renderToStaticMarkup(createElement(MobileBar, { view: mobileBarView(panel(), "es") }));
    expect(html).toContain('data-barra-celular');
    expect(html).toContain('href="#reserva"');
    expect(html).toContain('data-precio-local');
    expect(renderToStaticMarkup(createElement(MobileBar, { view: null }))).toBe("");
  });
});
