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
    expect(paso(/Restaurar D1 al instante anotado/)).toMatch(/steps\.migrar\.outputs\.escribio/); // REQ-10745: cubre la migración por su marca, no por la casilla
  });

  it("REQ-10740: el plan es simulación (archivos), el SQL se valida línea por línea y los export son solo SELECT", () => {
    expect(paso(/^"?Plan \(simulación/)).toMatch(/geo-coordenadas-ciudad\.ts plan[\s\S]*geo-coordenadas-ciudad\.ts validar/);
    expect(paso(/^"?Plan \(simulación/)).not.toMatch(/wrangler d1 execute/);
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

// INC-025 (17-11-2026 02:04 UTC): el regreso automático restauró D1 al bookmark aunque la migración no se había aplicado
// (el candado «una por corrida» la detuvo antes). La condición miraba la casilla, no si de verdad se escribió.
describe("REQ-10745: el regreso automático solo corre si un paso escribió de verdad en D1", () => {
  it("REQ-10745: la condición del regreso no depende de las casillas, sino de la marca escribio=1 de los pasos que escriben", () => {
    const regreso = paso(/Restaurar D1 al instante anotado/);
    expect(regreso).toMatch(/steps\.migrar\.outputs\.escribio == '1'/);
    expect(regreso).toMatch(/steps\.escribir\.outputs\.escribio == '1'/);
    expect(regreso).not.toMatch(/\|\| inputs\.aplicar_migracion/);
    expect(regreso).not.toMatch(/inputs\.escribir &&/);
  });

  it("REQ-10745: la marca escribio=1 se escribe justo antes del comando que toca la base, nunca antes de los candados", () => {
    const migrar = paso(/Aplicar la migración 0035/);
    expect(migrar).toMatch(/id: migrar/);
    const iCandado = migrar.indexOf("Una por corrida");
    const iMarca = migrar.indexOf('echo "escribio=1" >> "$GITHUB_OUTPUT"');
    const iApply = migrar.indexOf("d1 migrations apply");
    expect(iCandado).toBeGreaterThan(-1);
    expect(iMarca).toBeGreaterThan(iCandado);
    expect(iApply).toBeGreaterThan(iMarca);
    const escribir = paso(/Escribir en lotes/);
    const iMarcaE = escribir.indexOf('echo "escribio=1" >> "$GITHUB_OUTPUT"');
    const iExec = escribir.indexOf("d1 execute");
    expect(iMarcaE).toBeGreaterThan(-1);
    expect(iExec).toBeGreaterThan(iMarcaE);
    expect(escribir.indexOf("primero aplicar_migracion=true")).toBeLessThan(iMarcaE);
  });
});

// INC-026 (17-11-2026 04:29 UTC, run 44017375623): la 0035 se aplicó bien y, acto seguido, el paso falló con
// «yes: standard output: Broken pipe» (`yes | wrangler … | tee` bajo `set -o pipefail`: `yes` muere por SIGPIPE
// cuando wrangler cierra su entrada) y el regreso automático deshizo la migración. Wrangler ya contesta «yes» solo
// en un contexto no interactivo, así que no hace falta alimentarlo.
describe("REQ-10747: ningún comando que escribe va alimentado por `yes |` dentro de un paso con pipefail", () => {
  it("REQ-10747: el paso que aplica la migración no usa `yes |` (SIGPIPE bajo pipefail haría fallar un paso que ya escribió)", () => {
    const migrar = paso(/Aplicar la migración 0035/);
    expect(migrar).toMatch(/set -euo pipefail/);
    expect(migrar).not.toMatch(/yes \|/);
    expect(migrar).toMatch(/wrangler d1 migrations apply "\$DB" --remote <\/dev\/null \| tee/);
  });

  it("REQ-10747: en todo el workflow, `yes |` solo aparece en pasos sin pipefail (los de restaurar), nunca junto a un `| tee`", () => {
    for (const p of pasos) {
      if (!/yes \|/.test(p)) continue;
      expect(p, p.split("\n")[0]).not.toMatch(/pipefail/);
      expect(p, p.split("\n")[0]).not.toMatch(/yes \|[^\n]*\| tee/);
    }
  });
});
