import { describe, it, expect } from "vitest";
import { signLoginLink, verifyLoginLink, accountFingerprint, LOGIN_LINK_TTL_MS, normEmail } from "./login-link";

const now = new Date("2026-11-11T20:00:00Z");
const exp = now.getTime() + LOGIN_LINK_TTL_MS;

describe("REQ-1599/REQ-1591: enlace para entrar a la cuenta", () => {
  it("REQ-1599: vence en 15 minutos", () => {
    expect(LOGIN_LINK_TTL_MS).toBe(15 * 60 * 1000);
  });
  it("REQ-1591: el enlace firmado sirve para ese correo y esa huella", async () => {
    const fp = await accountFingerprint(null);
    const sig = await signLoginLink("s3cr3t", "ana@x.com", fp, exp);
    expect(await verifyLoginLink("s3cr3t", "ana@x.com", fp, exp, sig, now)).toBe(true);
  });
  it("REQ-1591: otro correo, otro secreto, firma alterada o vencido → no sirve", async () => {
    const fp = await accountFingerprint(null);
    const sig = await signLoginLink("s3cr3t", "ana@x.com", fp, exp);
    expect(await verifyLoginLink("s3cr3t", "otra@x.com", fp, exp, sig, now)).toBe(false);
    expect(await verifyLoginLink("otro", "ana@x.com", fp, exp, sig, now)).toBe(false);
    expect(await verifyLoginLink("s3cr3t", "ana@x.com", fp, exp, sig.slice(0, -1) + "A", now)).toBe(false);
    expect(await verifyLoginLink("s3cr3t", "ana@x.com", fp, exp, sig, new Date(exp + 1))).toBe(false);
    expect(await verifyLoginLink("", "ana@x.com", fp, exp, sig, now)).toBe(false);
  });
  it("REQ-1591: un solo uso — al entrar cambia la huella de la cuenta y el mismo enlace deja de servir", async () => {
    const before = await accountFingerprint(null);
    const sig = await signLoginLink("s3cr3t", "ana@x.com", before, exp);
    const after = await accountFingerprint("2026-11-11T20:01:00.000Z");
    expect(after).not.toBe(before);
    expect(await verifyLoginLink("s3cr3t", "ana@x.com", after, exp, sig, now)).toBe(false);
  });
  it("REQ-1599: el correo se normaliza (espacios y mayúsculas)", () => {
    expect(normEmail("  Ana@X.COM ")).toBe("ana@x.com");
  });
});
