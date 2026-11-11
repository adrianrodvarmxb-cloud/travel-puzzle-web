import { describe, it, expect } from "vitest";
import { isAdmin } from "./admin";

describe("isAdmin", () => {
  it("solo cuentas con rol ADMIN", () => {
    expect(isAdmin({ user: { role: "ADMIN" } })).toBe(true);
    expect(isAdmin({ user: { role: "CLIENT" } })).toBe(false);
    expect(isAdmin(null)).toBe(false);
    expect(isAdmin({})).toBe(false);
  });
});

describe("REQ-1532: entrar con Google sin cuentas de cliente", () => {
  it("REQ-1532: con cuentas apagadas, un correo sin cuenta no se crea (deny)", async () => {
    const { googleSignInDecision } = await import("./admin");
    expect(googleSignInDecision({ exists: false, accountsEnabled: false })).toBe("deny");
  });
  it("REQ-1532: una cuenta que ya existe entra igual; con cuentas encendidas se crea", async () => {
    const { googleSignInDecision } = await import("./admin");
    expect(googleSignInDecision({ exists: true, accountsEnabled: false })).toBe("allow");
    expect(googleSignInDecision({ exists: true, accountsEnabled: true })).toBe("allow");
    expect(googleSignInDecision({ exists: false, accountsEnabled: true })).toBe("create");
  });
});

describe("REQ-1533: el rol ADMIN se confirma en la base", () => {
  it("REQ-1533: sesión ADMIN pero la base ya dice CLIENT → se niega", async () => {
    const { isAdminFresh } = await import("./admin");
    expect(await isAdminFresh({ user: { id: "u1", role: "ADMIN" } }, async () => "CLIENT")).toBe(false);
  });
  it("REQ-1533: sesión ADMIN y la base ADMIN → pasa; sin sesión o sin id no consulta", async () => {
    const { isAdminFresh } = await import("./admin");
    let calls = 0;
    const roleOf = async () => { calls++; return "ADMIN"; };
    expect(await isAdminFresh({ user: { id: "u1", role: "ADMIN" } }, roleOf)).toBe(true);
    expect(await isAdminFresh(null, roleOf)).toBe(false);
    expect(await isAdminFresh({ user: { role: "ADMIN" } }, roleOf)).toBe(false);
    expect(await isAdminFresh({ user: { id: "u2", role: "CLIENT" } }, roleOf)).toBe(false);
    expect(calls).toBe(1);
  });
  it("REQ-1533: usuario borrado (null) → se niega", async () => {
    const { isAdminFresh } = await import("./admin");
    expect(await isAdminFresh({ user: { id: "u1", role: "ADMIN" } }, async () => null)).toBe(false);
  });
});
