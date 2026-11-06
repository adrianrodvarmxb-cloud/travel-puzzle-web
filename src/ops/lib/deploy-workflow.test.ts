import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parse } from "yaml";

type Step = { name?: string; id?: string; if?: string; run?: string; "continue-on-error"?: boolean };
const raw = readFileSync(".github/workflows/deploy-cloudflare.yml", "utf8");
const wf = parse(raw) as { on: { workflow_dispatch: { inputs: Record<string, { type: string; default: unknown }> } }; jobs: { deploy: { steps: Step[] } } };
const steps = wf.jobs.deploy.steps;
const activos = steps.filter((s) => String(s.if ?? "").replace(/\s/g, "") !== "${{false}}");
const paso = (nombre: string) => {
  const s = steps.find((x) => x.name === nombre);
  if (!s) throw new Error(`falta el paso «${nombre}»`);
  return s;
};

describe("workflow «Publicar en Cloudflare» (INC-006)", () => {
  it("REQ-155: ningún paso activo usa `wrangler secret put` (falla si la última versión no es la desplegada)", () => {
    for (const s of activos) expect(s.run ?? "", s.name).not.toMatch(/wrangler (versions )?secret (put|bulk)/);
  });

  it("REQ-155: los secretos suben dentro de la misma versión que se prueba y se despliega", () => {
    const subir = paso("Subir versión (sin tráfico)");
    expect(subir.run).toMatch(/opennextjs-cloudflare upload[^\n]*--secrets-file[= ]"?\$SECRETOS_FILE/);
    expect(paso("Publicar").run).toMatch(/versions deploy "\$\{\{ steps\.version\.outputs\.id \}\}@100%"/);
    const orden = steps.map((s) => s.name);
    expect(orden.indexOf("Secretos de la versión")).toBeLessThan(orden.indexOf("Subir versión (sin tráfico)"));
    expect(orden.indexOf("Subir versión (sin tráfico)")).toBeLessThan(orden.indexOf("Prueba de humo (antes de publicar)"));
    expect(orden.indexOf("Prueba de humo (antes de publicar)")).toBeLessThan(orden.indexOf("Publicar"));
  });

  it("REQ-155: el archivo de secretos se borra siempre y nunca se imprime", () => {
    const borrar = paso("Borrar archivo de secretos");
    expect(borrar.if).toMatch(/always\(\)/);
    expect(borrar.run).toMatch(/rm -f "\$SECRETOS_FILE"/);
    for (const s of activos) expect(s.run ?? "", s.name).not.toMatch(/cat "?\$SECRETOS_FILE|echo "?\$\{?(FREETOUR_PASSWORD|GATEWAY_SECRET|RESEND_API_KEY|BANXICO_TOKEN)/);
  });

  it("REQ-155: modo ensayo manual que nunca publica", () => {
    expect(wf.on.workflow_dispatch.inputs.ensayo).toMatchObject({ type: "boolean", default: false });
    expect(paso("Publicar").if).toMatch(/!inputs\.ensayo/);
    expect(paso("Migraciones D1").if).toMatch(/!inputs\.ensayo/);
  });

  it("REQ-155: si se publicó, la prueba de humo de producción corre aunque un paso posterior falle", () => {
    expect(paso("Publicar").id).toBe("publicar");
    expect(paso("Prueba de humo (producción)").if).toMatch(/always\(\) && steps\.publicar\.outcome == 'success'/);
  });

  it("REQ-155: la subida reintenta ante fallas pasajeras de la API de Cloudflare (runs 42192992880 y 42194778238)", () => {
    expect(paso("Subir versión (sin tráfico)").run).toMatch(/for intento in 1 2 3/);
  });
});
