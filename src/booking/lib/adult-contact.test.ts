import { describe, it, expect } from "vitest";
import { checkAdultContact, isAdultContactCheckEnabled } from "./adult-contact";

describe("REQ-083 contacto de la reserva adulto", () => {
  it("REQ-083: con la revisión encendida, solo pasa si el contacto declaró ser adulto (true exacto)", () => {
    expect(checkAdultContact(true, true)).toEqual({ ok: true });
    for (const v of [false, undefined, null, "true", 1, "on"]) {
      expect(checkAdultContact(v, true), String(v)).toEqual({ ok: false, code: "adult_required" });
    }
  });

  it("REQ-083: con la bandera apagada no bloquea (comportamiento actual)", () => {
    expect(checkAdultContact(undefined, false)).toEqual({ ok: true });
  });

  it("REQ-083: la bandera ADULT_CONTACT_CHECK_ENABLED solo se enciende con \"true\"", () => {
    expect(isAdultContactCheckEnabled(undefined)).toBe(false);
    expect(isAdultContactCheckEnabled("false")).toBe(false);
    expect(isAdultContactCheckEnabled("true")).toBe(true);
  });
});
