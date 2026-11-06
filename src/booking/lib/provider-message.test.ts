import { describe, it, expect } from "vitest";
import { checkProviderMessage, PROVIDER_MESSAGE_MAX } from "./provider-message";

describe("REQ-083 mensajes al proveedor (/booking/messages)", () => {
  it("REQ-083: acepta texto normal y lo regresa recortado", () => {
    expect(checkProviderMessage("  Llegamos 10 min tarde, ¿nos esperan?  ")).toEqual({ ok: true, text: "Llegamos 10 min tarde, ¿nos esperan?" });
    expect(checkProviderMessage("Somos 2 adultos; el tour es a las 8.30 y pagamos 3.50 €")).toMatchObject({ ok: true });
  });

  it("REQ-083: rechaza cualquier enlace antes de enviarlo", () => {
    for (const msg of [
      "Mira https://travelpuzzle.com.mx/reserva/abc",
      "http://x.io",
      "visita www.ejemplo.com",
      "escríbenos en travelpuzzle.com.mx",
      "mi perfil instagram.com/ana",
      "bit.ly/abc",
      "WWW.EJEMPLO.NET",
      "mailto:ana@example.com",
      "wa.me/5255",
    ]) {
      expect(checkProviderMessage(msg), msg).toEqual({ ok: false, code: "has_link" });
    }
  });

  it("REQ-083: máximo 5000 caracteres", () => {
    expect(PROVIDER_MESSAGE_MAX).toBe(5000);
    expect(checkProviderMessage("a".repeat(5000))).toMatchObject({ ok: true });
    expect(checkProviderMessage("a".repeat(5001))).toEqual({ ok: false, code: "too_long" });
    // Cuenta caracteres, no unidades UTF-16: 5000 emojis caben.
    expect(checkProviderMessage("😀".repeat(5000))).toMatchObject({ ok: true });
  });

  it("REQ-083: vacío o no texto se rechaza", () => {
    expect(checkProviderMessage("   ")).toEqual({ ok: false, code: "empty" });
    expect(checkProviderMessage(undefined)).toEqual({ ok: false, code: "empty" });
    expect(checkProviderMessage(42)).toEqual({ ok: false, code: "empty" });
  });
});
