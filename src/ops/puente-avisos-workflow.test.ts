// REQ-10758: el sitio llama al puente de avisos de Mila (zoefel-mila REQ-035/REQ-045): el secreto viaja con la versión
// del Worker y los workflows que avisan al PO llevan la URL y el secreto. Nunca se escribe el valor en el repo.
// npx vitest run src/ops/puente-avisos-workflow.test.ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { SECRETOS_DE_GITHUB, armarSecretos } from "./lib/worker-secrets";

const deploy = readFileSync(".github/workflows/deploy-cloudflare.yml", "utf8");
const tangol = readFileSync(".github/workflows/tangol-sync.yml", "utf8");
const wrangler = readFileSync("wrangler.jsonc", "utf8");

describe("REQ-10758: puente de avisos del lado del sitio", () => {
  it("REQ-10758: MILA_AVISOS_SECRET es un secreto de GitHub que viaja con la versión del Worker", () => {
    expect(SECRETOS_DE_GITHUB).toContain("MILA_AVISOS_SECRET");
    expect(armarSecretos({ env: { MILA_AVISOS_SECRET: "x" }, existentes: ["CRON_SECRET", "AUTH_SECRET"], generar: () => "g" }).secretos).toEqual({ MILA_AVISOS_SECRET: "x" });
    expect(deploy).toMatch(/MILA_AVISOS_SECRET: \$\{\{ secrets\.MILA_AVISOS_SECRET \}\}/);
  });
  it("REQ-10758: MILA_AVISOS_URL apunta al puente de Mila y el aviso por tipo nuevo lo lleva en los dos pasos de tangol-sync", () => {
    expect(wrangler).toMatch(/"MILA_AVISOS_URL": "https:\/\/mila-zoefel\.adrianrodvarmxb\.workers\.dev\/api\/avisos"/);
    expect(tangol.match(/MILA_AVISOS_URL: https:\/\/mila-zoefel\.adrianrodvarmxb\.workers\.dev\/api\/avisos/g)).toHaveLength(2);
    expect(tangol.match(/MILA_AVISOS_SECRET: \$\{\{ secrets\.MILA_AVISOS_SECRET \}\}/g)).toHaveLength(2);
  });
  it("REQ-10758: ningún valor de secreto en el repo", () => {
    for (const f of [deploy, tangol, wrangler]) expect(f).not.toMatch(/MILA_AVISOS_SECRET[^\n]*[0-9a-f]{32}/);
  });
});
