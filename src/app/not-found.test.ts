import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// La página 404 es asíncrona y lee el idioma de la cookie; el Navbar y el pie reales necesitan sesión e idioma.
vi.mock("@/lib/utils/cookies", () => ({ getPreferredLanguage: async () => "es" }));
vi.mock("@/components/layout/Navbar", () => ({ Navbar: () => createElement("nav", { "data-testid": "site-navbar" }) }));
vi.mock("@/components/home/v2/SiteFooter", () => ({
  SiteFooter: (p: { contact: { whatsapp?: string; email?: string; socials: unknown[] }; helpEnabled?: boolean }) =>
    createElement("footer", { "data-testid": "site-footer", "data-email": p.contact.email ?? "", "data-wa": p.contact.whatsapp ?? "", "data-help": String(!!p.helpEnabled) }),
}));

import NotFound from "./not-found";

const ENV = { WHATSAPP_NUMBER: "5215555555555", EMAIL_REPLY_TO: "info@travelpuzzle.com.mx", BOOKINGS_ENABLED: "true" };
const render = async () => renderToStaticMarkup(await NotFound());

describe("Página 404 con el pie del home (REQ-304)", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("REQ-304: monta el header y el pie del home una sola vez, con el contacto del sitio", async () => {
    for (const [k, v] of Object.entries(ENV)) vi.stubEnv(k, v);
    const h = await render();
    expect(h.match(/data-testid="site-navbar"/g)).toHaveLength(1);
    expect(h.match(/data-testid="site-footer"/g)).toHaveLength(1);
    expect(h).toContain('data-email="info@travelpuzzle.com.mx"');
    expect(h).toContain('data-wa="5215555555555"');
    expect(h).toContain('data-help="true"');
  });

  it("REQ-304: el enlace a /ayuda del pie sigue a BOOKINGS_ENABLED, como en el home", async () => {
    vi.stubEnv("BOOKINGS_ENABLED", "false");
    expect(await render()).toContain('data-help="false"');
  });

  it("REQ-304: conserva el mensaje y los botones de la 404", async () => {
    const h = await render();
    expect(h).toContain("No encontramos esta página");
    expect(h).toContain('href="/"');
    expect(h).toContain('href="/tours"');
  });
});
