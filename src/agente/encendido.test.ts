// REQ-221 (PO, 6 nov 2026): la ventana del catálogo del agente queda encendida en producción. npx vitest run src/agente/encendido.test.ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

describe("REQ-221: ventana del agente encendida", () => {
  it("REQ-221: AGENTE_API_ENABLED es \"true\" en wrangler.jsonc (la llave AGENTE_TOKEN viaja con la versión, REQ-188)", () => {
    expect(readFileSync("wrangler.jsonc", "utf8")).toMatch(/"AGENTE_API_ENABLED": "true",/);
  });
});
