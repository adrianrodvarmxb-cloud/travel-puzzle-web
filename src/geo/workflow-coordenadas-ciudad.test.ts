// Ficha única, ola 4: el workflow «Geo: coordenadas de ciudad» no escribe sin casilla y siempre deja punto de regreso.
// npx vitest run src/geo/workflow-coordenadas-ciudad.test.ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const wf = readFileSync(".github/workflows/geo-coordenadas-ciudad.yml", "utf8");
const pasos = wf.split(/\n {6}- name: /).slice(1);
const paso = (nombre: RegExp) => pasos.find((p) => nombre.test(p.split("\n")[0])) ?? "";

describe("REQ-10741: aplicar la 0035 y escribir coordenadas solo a mano, con bookmark y copia de City", () => {
  it("REQ-10741: solo se dispara a mano y las dos casillas vienen apagadas", () => {
    expect(wf).toMatch(/\non:\n {2}workflow_dispatch:/);
    expect(wf).not.toMatch(/\n {2}schedule:/);
    expect(wf).not.toMatch(/\n {2}push:/);
    expect(wf).toMatch(/aplicar_migracion:\n[\s\S]*?type: boolean\n\s+default: false/);
    expect(wf).toMatch(/escribir:\n[\s\S]*?type: boolean\n\s+default: false/);
  });

  it("REQ-10741: el bookmark de Time Travel y la copia de City van antes de la migración y de la escritura, sin casilla", () => {
    const nombres = pasos.map((p) => p.split("\n")[0]);
    const i = (re: RegExp) => nombres.findIndex((n) => re.test(n));
    expect(i(/Instante para Time Travel/)).toBeGreaterThan(-1);
    expect(i(/Copia de City/)).toBeGreaterThan(i(/Instante para Time Travel/));
    expect(i(/Aplicar la migración 0035/)).toBeGreaterThan(i(/Copia de City/));
    expect(i(/Escribir en lotes/)).toBeGreaterThan(i(/Aplicar la migración 0035/));
    expect(paso(/Instante para Time Travel/)).not.toMatch(/inputs\.escribir|inputs\.aplicar_migracion/);
    expect(paso(/Copia de City/)).toMatch(/geo-coordenadas-ciudad\.ts restaurar/);
  });

  it("REQ-10741: la migración y la escritura están detrás de su casilla; la restauración automática cubre ambas", () => {
    expect(paso(/Aplicar la migración 0035/)).toMatch(/if: inputs\.aplicar_migracion/);
    expect(paso(/Escribir en lotes/)).toMatch(/if: inputs\.escribir/);
    expect(paso(/Restaurar D1 al instante anotado/)).toMatch(/failure\(\)[\s\S]*time-travel restore/);
    expect(paso(/Restaurar D1 al instante anotado/)).toMatch(/inputs\.aplicar_migracion/);
  });

  it("REQ-10740: el plan es simulación (archivos), el SQL se valida línea por línea y los export son solo SELECT", () => {
    expect(paso(/^Plan \(simulación/)).toMatch(/geo-coordenadas-ciudad\.ts plan[\s\S]*geo-coordenadas-ciudad\.ts validar/);
    expect(paso(/^Plan \(simulación/)).not.toMatch(/wrangler d1 execute/);
    const consultas = [...wf.matchAll(/(?:^|[\s;(])q ["']([^"']+)/gm)].map((m) => m[1].trim());
    expect(consultas.length).toBeGreaterThanOrEqual(3);
    for (const c of consultas) expect(c, c).toMatch(/^(SELECT\b|\$\(cat )/);
    expect(paso(/Exportar ciudades/)).not.toMatch(/UPDATE|DELETE|INSERT/);
  });

  it("REQ-10741: una migración por corrida y humo de producción después de tocar la base", () => {
    expect(paso(/Aplicar la migración 0035/)).toMatch(/Una por corrida/);
    expect(paso(/Prueba de humo \(producción\)/)).toMatch(/smoke\.ts https:\/\/travelpuzzle\.com\.mx/);
    expect(paso(/Prueba de humo \(producción\)/)).toMatch(/inputs\.escribir \|\| inputs\.aplicar_migracion/);
    expect(wf).toMatch(/concurrency: \{ group: datos-produccion/);
  });
});
