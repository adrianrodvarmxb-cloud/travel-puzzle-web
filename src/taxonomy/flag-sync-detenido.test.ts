import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { taxonomySyncEnabled } from "./lib/run-plan";

// REQ-3510 (INC-015, contención): la base D1 llegó a ~9,998 MB de 10 GB porque cada corrida del recálculo
// deja ~50 mil filas en ExperienceTaxonomy y nunca se borran (19 millones de filas, 380 corridas). Mientras
// no exista la limpieza (REQ-3511), el recálculo automático queda detenido. El sitio sigue leyendo la última
// corrida buena (TAXONOMY_PUBLISH_ENABLED no depende de esta bandera).
describe("REQ-3510: recálculo de taxonomía detenido en producción (INC-015)", () => {
  const wrangler = readFileSync("wrangler.jsonc", "utf8");
  const valor = (k: string) => wrangler.match(new RegExp(`"${k}":\\s*"([^"]*)"`))?.[1];

  it("REQ-3510: wrangler.jsonc deja TAXONOMY_SYNC_ENABLED en \"false\" y el cron no recalcula", () => {
    expect(valor("TAXONOMY_SYNC_ENABLED")).toBe("false");
    expect(taxonomySyncEnabled({ TAXONOMY_SYNC_ENABLED: valor("TAXONOMY_SYNC_ENABLED") })).toBe(false);
  });

  it("REQ-3510: lo publicado sigue encendido (se lee la última corrida buena)", () => {
    expect(valor("TAXONOMY_PUBLISH_ENABLED")).toBe("true");
  });

  it("REQ-3510: solo el cron usa la bandera del recálculo", () => {
    const cron = readFileSync("src/app/api/cron/sync-tours/route.ts", "utf8");
    expect(cron).toMatch(/taxonomySyncEnabled\(process\.env/);
  });
});
