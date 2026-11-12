import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";

describe("REQ-1592: registro con contraseña apagado", () => {
  it("REQ-1592: /api/auth/signup responde 410 antes de tocar la base", async () => {
    const { POST } = await import("@/app/api/auth/signup/route");
    const res = await POST(new Request("http://x/api/auth/signup", { method: "POST", body: JSON.stringify({ name: "A", email: "a@x.com", password: "1234567890" }) }));
    expect(res.status).toBe(410);
  });
  it("REQ-1592: el inicio de sesión con contraseña revisa el rol ADMIN", () => {
    expect(readFileSync("src/lib/auth.ts", "utf8")).toMatch(/if \(!passwordLoginAllowed\(user\.role\)\) return null;/);
  });
});

describe("REQ-1599: pedir el enlace con cuentas apagadas", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
  it("REQ-1599: /api/cuenta/enlace responde 404 con ACCOUNTS_ENABLED apagado", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_ACCOUNTS_ENABLED", "false");
    const { POST } = await import("@/app/api/cuenta/enlace/route");
    const res = await POST(new Request("http://x/api/cuenta/enlace", { method: "POST", body: JSON.stringify({ email: "a@x.com" }) }));
    expect(res.status).toBe(404);
  });
});

describe("REQ-1599: pedir el enlace con cuentas encendidas", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
  it("REQ-1599: un correo inválido responde 400 sin tocar la base", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_ACCOUNTS_ENABLED", "true");
    const { POST } = await import("@/app/api/cuenta/enlace/route");
    const res = await POST(new Request("http://x/api/cuenta/enlace", { method: "POST", body: JSON.stringify({ email: "no-es-correo" }) }));
    expect(res.status).toBe(400);
  });
});
