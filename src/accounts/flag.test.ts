import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

describe("REQ-1598: cuentas de cliente encendidas en producción", () => {
  it.each([".github/workflows/deploy-cloudflare.yml", ".github/workflows/prueba-humo.yml"])("REQ-1598: %s construye con NEXT_PUBLIC_ACCOUNTS_ENABLED=true", (f) => {
    expect(readFileSync(f, "utf8")).toMatch(/^\s+NEXT_PUBLIC_ACCOUNTS_ENABLED: "true"$/m);
  });
  it("REQ-1598: la prueba de humo revisa la entrada de cuentas", () => {
    expect(JSON.parse(readFileSync("tests/smoke/pages.json", "utf8")).fixed).toContain("/mi-cuenta/entrar");
  });
});

// REQ-3494: los previews de los agentes diarios se construyen igual que producción (si no, /mi-cuenta/entrar da 404
// en su prueba de humo y la publicación diaria se detiene; pasó con las guías del 12 nov 2026, corrida 43246182143).
describe("REQ-3494: los workflows de los agentes diarios construyen con cuentas encendidas", () => {
  it.each([".github/workflows/guias-ciudad.yml", ".github/workflows/blog-diario.yml"])("REQ-3494: %s construye con NEXT_PUBLIC_ACCOUNTS_ENABLED=true", (f) => {
    expect(readFileSync(f, "utf8")).toMatch(/^\s+NEXT_PUBLIC_ACCOUNTS_ENABLED: "true"$/m);
  });
});

