import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

// REQ-3511 (INC-015): la limpieza única es a mano, ensayo por omisión, con punto de regreso y por tandas.
describe("REQ-3511: workflow de limpieza de taxonomía", () => {
  const y = readFileSync(".github/workflows/limpieza-taxonomia.yml", "utf8");
  it("REQ-3511: solo a mano y sin borrar por omisión", () => {
    expect(y).toMatch(/on:\n  workflow_dispatch:/);
    expect(y).not.toMatch(/schedule:|push:|pull_request:/);
    expect(y).toMatch(/borrar:[\s\S]*?default: false/);
  });
  it("REQ-3511: anota el punto de regreso antes de borrar y solo borra con la casilla", () => {
    const punto = y.indexOf("time-travel info"), borrar = y.indexOf("DELETE FROM");
    expect(punto).toBeGreaterThan(0);
    expect(borrar).toBeGreaterThan(punto);
    expect(y.match(/if: inputs\.borrar/g)?.length).toBe(2);
  });
  it("REQ-3511: borra por tandas y conserva la corrida en curso y las 3 publicadas más recientes; no toca TaxonomyRun", () => {
    expect(y).toMatch(/LIMIT 20000/);
    expect(y).toMatch(/"status\\"='running'/);
    expect(y).toMatch(/ORDER BY \\"finishedAt\\" DESC LIMIT 3/);
    expect(y).not.toMatch(/DELETE FROM \\"TaxonomyRun\\"/);
    expect(y).toMatch(/concurrency: \{ group: datos-produccion/);
  });
  it("REQ-3511: cada tanda se reintenta hasta 3 veces y una respuesta sin conteo no se toma como cero (corrida 43445820673)", () => {
    expect(y).toMatch(/for intento in 1 2 3; do/);
    expect(y).toMatch(/typeof c==="number"/);
    expect(y).toMatch(/respuesta inesperada de D1/);
    expect(y).toMatch(/3 intentos fallidos; se detiene/);
  });
});
