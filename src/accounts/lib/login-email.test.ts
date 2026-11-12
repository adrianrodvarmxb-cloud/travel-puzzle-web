import { describe, it, expect } from "vitest";
import { buildLoginLinkEmail } from "./login-email";

const url = "https://travelpuzzle.com.mx/mi-cuenta/entrar/verificar?email=a%40b.com&exp=1&sig=x";

describe("REQ-3317: el correo del enlace para entrar es transaccional (no Promociones)", () => {
  it("REQ-3317: sin imágenes, íconos de redes ni texto oculto de vista previa", () => {
    const { html } = buildLoginLinkEmail({ url, logoUrl: "https://travelpuzzle.com.mx/brand/logo.png" });
    expect(html).not.toMatch(/<img/i);
    expect(html).not.toMatch(/instagram|facebook|tiktok|youtube|linkedin/i);
    expect(html).not.toMatch(/display:none/);
  });
  it("REQ-3317: corto, con el enlace visible como botón y como texto", () => {
    const { html, text, subject } = buildLoginLinkEmail({ url, logoUrl: "" });
    expect(html.length).toBeLessThan(2500);
    expect(html.split(`href="${url.replace(/&/g, "&amp;")}"`).length - 1).toBe(2);
    expect(text).toContain(url);
    expect(subject).toBe("Tu enlace para entrar a Travel Puzzle");
  });
});
