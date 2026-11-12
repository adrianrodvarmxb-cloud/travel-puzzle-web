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
