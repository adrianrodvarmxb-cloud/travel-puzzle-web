// REQ-470…472: el workflow que escribe los geonameid v2. npx vitest run src/ops/geo-escribir-workflow.test.ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const wf = readFileSync(".github/workflows/geo-escribir-geonameid.yml", "utf8");
const paso = (nombre: string) => {
  const i = wf.indexOf(`- name: ${nombre}`);
  const j = wf.indexOf("\n      - ", i + 1);
  return wf.slice(i, j < 0 ? undefined : j);
};

describe("REQ-470…472: workflow «Geo: escribir geonameid»", () => {
  it("REQ-471: solo a mano, escribir apagado por omisión, en la fila de datos de producción", () => {
    expect(wf).toMatch(/\non:\n {2}workflow_dispatch:\n/);
    expect(wf).not.toMatch(/\n {2}(push|pull_request|schedule):/);
    expect(wf).toMatch(/ {6}escribir:\n.*\n {8}type: boolean\n {8}default: false/);
    expect(wf).toMatch(/concurrency: \{ group: datos-produccion, cancel-in-progress: false \}/);
  });
  it("REQ-471: no corre con una publicación de main en curso o en fila", () => {
    expect(paso("Sin publicación de main en curso")).toMatch(/deploy-cloudflare\.yml\/runs\?status=\$st/);
    expect(wf.indexOf("Sin publicación de main en curso")).toBeLessThan(wf.indexOf("name: Escribir en lotes"));
  });
  it("REQ-471: Time Travel y ensayo antes de escribir; la escritura solo con escribir=true y en lotes con --command", () => {
    const tt = wf.indexOf("name: Instante para Time Travel");
    const ens = wf.indexOf("name: Ensayo (solo lectura)");
    const esc = wf.indexOf("name: Escribir en lotes");
    expect(tt).toBeGreaterThan(0);
    expect(ens).toBeGreaterThan(tt);
    expect(esc).toBeGreaterThan(ens);
    expect(paso("Instante para Time Travel")).toMatch(/wrangler d1 time-travel info "\$DB" --json/);
    expect(paso("Escribir en lotes (solo con escribir=true)")).toMatch(/if: inputs\.escribir && /);
    expect(paso("Escribir en lotes (solo con escribir=true)")).toMatch(/--command "\$\(cat "\$f"\)"/);
  });
  it("REQ-472: verifica conteo y repetidos, hace humo y restaura al instante anotado si algo falla", () => {
    expect(paso("Verificar (conteo y repetidos)")).toMatch(/repetidos geo\/repetidos-despues\.json "\$PERMITIR" geo\/repetidos-antes\.json/);
    expect(wf).toMatch(/smoke\.ts https:\/\/travelpuzzle\.com\.mx/);
    const r = paso("Restaurar D1 al instante anotado si algo falló después de escribir");
    expect(r).toMatch(/if: failure\(\) && [^\n]*inputs\.escribir && steps\.escribir\.outcome != 'skipped'/);
    expect(r).toMatch(/time-travel restore "\$DB" --bookmark="\$BOOKMARK"/);
  });
  it("REQ-470: el workflow no trae SQL que borre o cambie otra cosa (INSERT solo en la validación del SQL de país)", () => {
    expect(wf).not.toMatch(/\b(DELETE|DROP|ALTER)\b/);
    expect(wf.split("\n").filter((l) => /\bINSERT\b/.test(l)).every((l) => l.trim().startsWith('if grep -vE "^(--.*|UPDATE'))).toBe(true);
    expect(wf).not.toMatch(/SET "(slug|translations|countryId)"/);
  });
  it("REQ-473: país y alias en corrida aparte, con ensayo, verificación, humo y la misma restauración", () => {
    expect(wf).toMatch(/ {6}escribir_pais:\n.*\n {8}type: boolean\n {8}default: false/);
    expect(paso("Un cambio por corrida")).toMatch(/if: inputs\.escribir && inputs\.escribir_pais\n[\s\S]*exit 1/);
    expect(wf.indexOf("name: Ensayo de país y alias")).toBeGreaterThan(wf.indexOf("name: Instante para Time Travel"));
    expect(paso("Escribir país y alias (solo con escribir_pais=true)")).toMatch(/if: inputs\.escribir_pais && !inputs\.escribir/);
    expect(paso("Verificar país y alias")).toMatch(/revisar-pais geo\/pais-despues\.json geo\/alias-despues\.json despues/);
    expect(paso("Prueba de humo (producción) y páginas de destinos")).toMatch(/if: \(inputs\.escribir \|\| inputs\.escribir_pais\)/);
    expect(paso("Restaurar D1 al instante anotado si algo falló después de escribir")).toMatch(/inputs\.escribir_pais && steps\.escribir_pais\.outcome != 'skipped'/);
  });
});
