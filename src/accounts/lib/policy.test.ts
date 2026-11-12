import { describe, it, expect } from "vitest";
import { passwordLoginAllowed, PASSWORD_SIGNUP_ENABLED, accountNameSchema } from "./policy";

describe("REQ-1592: contraseña solo para el equipo", () => {
  it("REQ-1592: el registro con contraseña queda apagado", () => {
    expect(PASSWORD_SIGNUP_ENABLED).toBe(false);
  });
  it("REQ-1592: solo cuentas ADMIN entran con contraseña", () => {
    expect(passwordLoginAllowed("ADMIN")).toBe(true);
    expect(passwordLoginAllowed("CLIENT")).toBe(false);
    expect(passwordLoginAllowed(undefined)).toBe(false);
  });
});

describe("REQ-1594: nombre de la cuenta", () => {
  it("REQ-1594: se recorta y valida (1 a 80 caracteres)", () => {
    expect(accountNameSchema.parse("  Ana García ")).toBe("Ana García");
    expect(accountNameSchema.safeParse("   ").success).toBe(false);
    expect(accountNameSchema.safeParse("x".repeat(81)).success).toBe(false);
  });
});

describe("REQ-1596: invitación en la página de la reserva", () => {
  it("REQ-1596: solo con cuentas encendidas y sin sesión", async () => {
    const { showAccountInvite } = await import("./policy");
    expect(showAccountInvite({ accountsEnabled: true, signedIn: false })).toBe(true);
    expect(showAccountInvite({ accountsEnabled: true, signedIn: true })).toBe(false);
    expect(showAccountInvite({ accountsEnabled: false, signedIn: false })).toBe(false);
  });
  it("REQ-1596: la página de reserva pasa la invitación a la vista", async () => {
    const { readFileSync } = await import("node:fs");
    expect(readFileSync("src/app/reserva/[token]/page.tsx", "utf8")).toMatch(/accountInvite=\{showAccountInvite\(/);
  });
});
