import { describe, expect, it } from "vitest";
import { siteFooterFromEnv } from "./site-footer";

describe("Datos del pie del home para cualquier página (REQ-303)", () => {
  it("REQ-303: toma WhatsApp, correo y redes de las variables, igual que el home", () => {
    const f = siteFooterFromEnv({ WHATSAPP_NUMBER: "5215555555555", EMAIL_REPLY_TO: "info@travelpuzzle.com.mx", SOCIAL_INSTAGRAM: "https://instagram.com/tp", BOOKINGS_ENABLED: "true" });
    expect(f.contact).toEqual({ whatsapp: "5215555555555", email: "info@travelpuzzle.com.mx", socials: [{ name: "Instagram", url: "https://instagram.com/tp" }] });
    expect(f.helpEnabled).toBe(true);
  });

  it("REQ-303: el enlace a /ayuda sigue el mismo interruptor que el home (BOOKINGS_ENABLED)", () => {
    expect(siteFooterFromEnv({}).helpEnabled).toBe(false);
    expect(siteFooterFromEnv({ BOOKINGS_ENABLED: "false" }).helpEnabled).toBe(false);
  });

  it("REQ-303: sin variables no inventa contacto", () => {
    expect(siteFooterFromEnv({}).contact).toEqual({ whatsapp: undefined, email: undefined, socials: [] });
  });
});
