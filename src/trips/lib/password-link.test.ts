import { describe, it, expect } from "vitest";
import { passwordFingerprint, signPasswordLink, verifyPasswordLink, checkNewPassword, PASSWORD_LINK_TTL_MS } from "./password-link";

const now = new Date("2026-11-03T20:00:00Z");
const exp = now.getTime() + PASSWORD_LINK_TTL_MS;

describe("enlace para crear o cambiar contraseña", () => {
  it("válido con la misma contraseña guardada y antes de vencer", async () => {
    const fp = await passwordFingerprint("");
    const sig = await signPasswordLink("s3cr3t", "ana@tp.mx", fp, exp);
    expect(await verifyPasswordLink("s3cr3t", "ana@tp.mx", fp, exp, sig, now)).toBe(true);
  });
  it("solo sirve una vez: al cambiar la contraseña deja de valer", async () => {
    const sig = await signPasswordLink("s3cr3t", "ana@tp.mx", await passwordFingerprint(""), exp);
    expect(await verifyPasswordLink("s3cr3t", "ana@tp.mx", await passwordFingerprint("$2b$10$nuevo"), exp, sig, now)).toBe(false);
  });
  it("vencido, otro correo, otra firma o sin secreto: no vale", async () => {
    const fp = await passwordFingerprint("");
    const sig = await signPasswordLink("s3cr3t", "ana@tp.mx", fp, exp);
    expect(await verifyPasswordLink("s3cr3t", "ana@tp.mx", fp, exp, sig, new Date(exp + 1))).toBe(false);
    expect(await verifyPasswordLink("s3cr3t", "otra@tp.mx", fp, exp, sig, now)).toBe(false);
    expect(await verifyPasswordLink("s3cr3t", "ana@tp.mx", fp, exp, sig.slice(1) + "A", now)).toBe(false);
    expect(await verifyPasswordLink("", "ana@tp.mx", fp, exp, sig, now)).toBe(false);
  });
  it("dura 1 hora", () => {
    expect(PASSWORD_LINK_TTL_MS).toBe(60 * 60 * 1000);
  });
});

describe("checkNewPassword", () => {
  it("mínimo 10 caracteres y que coincidan", () => {
    expect(checkNewPassword("corta", "corta")).toMatch(/10/);
    expect(checkNewPassword("unaclavelarga1", "otraclavelarga")).toMatch(/no coinciden/);
    expect(checkNewPassword("unaclavelarga1", "unaclavelarga1")).toBeNull();
    expect(checkNewPassword("x".repeat(129), "x".repeat(129))).toMatch(/128/);
  });
});
