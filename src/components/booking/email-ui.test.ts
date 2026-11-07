import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// El Navbar real necesita sesión e idioma; aquí basta saber que el marco lo monta una sola vez.
vi.mock("@/components/layout/Navbar", () => ({ Navbar: () => createElement("nav", { "data-testid": "site-navbar" }) }));
vi.mock("@/components/home/v2/SiteFooter", () => ({ SiteFooter: () => createElement("footer", { "data-testid": "site-footer" }) }));

import { EmailFrame } from "./email-ui";

const WA = "https://wa.me/5215555555555?text=Hola";
const site = { contact: { socials: [] }, helpEnabled: false };
const render = (props: { wa?: string | null; cardHeader?: boolean } = {}) =>
  renderToStaticMarkup(createElement(EmailFrame, { wa: WA, socials: [], site, children: createElement("p", null, "cuerpo"), ...props }));

describe("Marco de reservas y eventos (EmailFrame) con el header del home", () => {
  it("REQ-062: monta el header del home (Navbar con el logo animado) una sola vez", () => {
    const h = render();
    expect(h.match(/data-testid="site-navbar"/g)).toHaveLength(1);
  });

  it("REQ-300: no pinta un segundo encabezado con el logo fijo dentro de la tarjeta", () => {
    const h = render();
    expect(h).not.toContain("/brand/logo-tp-oscuro.png");
    expect(h).not.toMatch(/<header\b/);
  });

  it("REQ-300: el encabezado de la tarjeta sigue disponible de forma reversible (cardHeader)", () => {
    expect(render({ cardHeader: true })).toContain("/brand/logo-tp-oscuro.png");
  });

  it("REQ-300: la ayuda por WhatsApp no se pierde: burbuja flotante como en el home", () => {
    const h = render();
    expect(h).toContain(`href="${WA.replace(/&/g, "&amp;")}"`);
    expect(h).toContain("/brand/social/whatsapp.png");
    expect(h).toContain("fixed bottom-5 right-5");
  });

  it("REQ-300: sin WhatsApp configurado no pinta la burbuja", () => {
    expect(render({ wa: null })).not.toContain("fixed bottom-5 right-5");
  });
});
