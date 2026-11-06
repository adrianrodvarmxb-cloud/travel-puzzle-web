import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";

// El Navbar y el pie reales necesitan sesión e idioma; aquí basta saber qué monta el marco y con qué datos.
vi.mock("@/components/layout/Navbar", () => ({ Navbar: () => createElement("nav", { "data-testid": "site-navbar" }) }));
vi.mock("@/components/home/v2/SiteFooter", () => ({
  SiteFooter: (p: { contact: { email?: string }; helpEnabled?: boolean }) =>
    createElement("footer", { "data-testid": "site-footer", "data-email": p.contact.email ?? "", "data-help": String(!!p.helpEnabled) }),
}));

import { EmailFrame } from "./email-ui";

const site = { contact: { whatsapp: "5215555555555", email: "info@travelpuzzle.com.mx", socials: [] }, helpEnabled: true };
const render = (props: { cardFooter?: boolean } = {}) =>
  renderToStaticMarkup(createElement(EmailFrame, { wa: null, socials: [], site, children: createElement("p", null, "cuerpo"), ...props }));

describe("Pie del home en reservas y eventos (EmailFrame)", () => {
  it("REQ-303: monta el pie del home (SiteFooter) una sola vez, con el contacto y la ayuda del sitio", () => {
    const h = render();
    expect(h.match(/data-testid="site-footer"/g)).toHaveLength(1);
    expect(h).toContain('data-email="info@travelpuzzle.com.mx"');
    expect(h).toContain('data-help="true"');
  });

  it("REQ-303: el pie de la tarjeta (copia del correo) queda oculto", () => {
    const h = render();
    expect(h).not.toContain("Travel Puzzle México · travelpuzzle.com.mx");
  });

  it("REQ-303: el pie de la tarjeta vuelve con cardFooter (reversible)", () => {
    expect(render({ cardFooter: true })).toContain("Travel Puzzle México · travelpuzzle.com.mx");
  });

  it("REQ-303: reservas, modificar y eventos le pasan al marco los datos del pie del sitio", () => {
    for (const p of ["src/app/reserva/[token]/BookingPageView.tsx", "src/app/reserva/[token]/modificar/page.tsx", "src/components/events/EventDetailClient.tsx"]) {
      const src = readFileSync(p, "utf8");
      expect(src, p).toMatch(/<EmailFrame[^>]*\bsite=\{/);
      expect(src, p).not.toMatch(/cardFooter/);
    }
  });
});
