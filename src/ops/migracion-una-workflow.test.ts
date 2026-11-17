// REQ-10746: el workflow «D1: aplicar una sola migración» no escribe sin `archivo`, deja punto de regreso y solo
// restaura si de verdad escribió (regla de INC-025).
// npx vitest run src/ops/migracion-una-workflow.test.ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const wf = readFileSync(".github/workflows/migracion-una.yml", "utf8");
const pasos = wf.split(/\n {6}- name: /).slice(1);
const paso = (nombre: RegExp) => pasos.find((p) => nombre.test(p.split("\n")[0])) ?? "";
const nombres = pasos.map((p) => p.split("\n")[0]);
const i = (re: RegExp) => nombres.findIndex((n) => re.test(n));

describe("REQ-10746: una sola migración por corrida, a mano y con punto de regreso", () => {
  it("REQ-10746: solo se dispara a mano y `archivo` viene vacío (sin archivo no se aplica nada)", () => {
    expect(wf).toMatch(/\non:\n {2}workflow_dispatch:/);
    expect(wf).not.toMatch(/\n {2}schedule:/);
    expect(wf).not.toMatch(/\n {2}push:/);
    expect(wf).toMatch(/archivo:\n[\s\S]*?type: string\n\s+default: ""/);
    expect(paso(/Aplicar la migración pedida/)).toMatch(/if: inputs\.archivo != ''/);
  });

  it("REQ-10746: el bookmark y el listado van antes de aplicar; la elección pasa por la regla pura", () => {
    expect(i(/Instante para Time Travel/)).toBeGreaterThan(-1);
    expect(i(/Migraciones pendientes/)).toBeGreaterThan(i(/Instante para Time Travel/));
    expect(i(/más baja pendiente/)).toBeGreaterThan(i(/Migraciones pendientes/));
    expect(i(/Aplicar la migración pedida/)).toBeGreaterThan(i(/más baja pendiente/));
    expect(paso(/Instante para Time Travel/)).not.toMatch(/inputs\.archivo/);
    expect(paso(/más baja pendiente/)).toMatch(/migracion-una\.ts elegir/);
    expect(paso(/Aplicar la migración pedida/)).toMatch(/steps\.elegir\.outputs\.decision == 'aplicar'/);
  });

  it("REQ-10746: aplica solo el archivo pedido con execute --file y lo registra en d1_migrations; nunca `migrations apply`", () => {
    const aplicar = paso(/Aplicar la migración pedida/);
    expect(aplicar).toMatch(/wrangler d1 execute "\$DB" --remote --file "migrations\/\$ARCHIVO"/);
    expect(aplicar).toMatch(/migracion-una\.ts marcar/);
    expect(aplicar).toMatch(/sigue pendiente tras aplicarla/);
    for (const p of pasos) expect(p).not.toMatch(/migrations apply/); // los pasos nunca aplican todas de golpe
  });

  it("REQ-10746: humo de producción tras escribir y regreso automático solo con la marca escribio=1 (INC-025)", () => {
    expect(paso(/Aplicar la migración pedida/)).toMatch(/echo "escribio=1" >> "\$GITHUB_OUTPUT"\n\s+npx wrangler d1 execute/);
    expect(paso(/Prueba de humo \(producción\)/)).toMatch(/smoke\.ts https:\/\/travelpuzzle\.com\.mx/);
    expect(paso(/Prueba de humo \(producción\)/)).toMatch(/steps\.migrar\.outputs\.escribio == '1'/);
    const regreso = paso(/Restaurar D1 al instante anotado/);
    expect(regreso).toMatch(/failure\(\)[\s\S]*steps\.migrar\.outputs\.escribio == '1'[\s\S]*time-travel restore/);
    expect(regreso).not.toMatch(/inputs\.archivo/);
    expect(wf).toMatch(/concurrency: \{ group: datos-produccion/);
  });
});
