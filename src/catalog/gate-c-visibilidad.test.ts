/**
 * Candado 2 del gate C (REQ-1625, REQ-3312): con la bandera del proveedor apagada, nada de ese
 * proveedor puede llegar al público. Estas pruebas vigilan los dos caminos por los que sale un tour:
 * Prisma (toda lectura pasa por la extensión) y el SQL crudo (cada consulta pública lleva el filtro).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { providerExtension } from "./lib/provider-visibility";

const leer = (p: string) => readFileSync(p, "utf8");

describe("gate C: con TANGOL_ENABLED apagada no sale nada de Tangol", () => {
  it("REQ-3312: la extensión de Prisma filtra las lecturas de Tour y deja pasar las escrituras", () => {
    const ext = providerExtension({});
    const vistos: unknown[] = [];
    const query = (args: unknown) => { vistos.push(args); return args; };
    ext.query.tour.$allOperations({ operation: "findMany", args: { where: { isActive: true } }, query });
    ext.query.tour.$allOperations({ operation: "count", args: {}, query });
    ext.query.tour.$allOperations({ operation: "upsert", args: { where: { id: "x" }, create: {}, update: {} }, query });
    expect(vistos[0]).toEqual({ where: { isActive: true, providerId: { notIn: ["tangol"] } } });
    expect(vistos[1]).toEqual({ where: { providerId: { notIn: ["tangol"] } } });
    expect(vistos[2]).toEqual({ where: { id: "x" }, create: {}, update: {} });
  });

  it("REQ-3312: con la bandera encendida la extensión no toca nada", () => {
    const ext = providerExtension({ TANGOL_ENABLED: "true" });
    const vistos: unknown[] = [];
    ext.query.tour.$allOperations({ operation: "findMany", args: { where: { isActive: true } }, query: (a) => vistos.push(a) });
    expect(vistos[0]).toEqual({ where: { isActive: true } });
  });

  it("REQ-3312: el cliente público de Prisma nace con el filtro y el sync pide el crudo a propósito", () => {
    expect(leer("src/lib/prisma.ts")).toMatch(/conFiltroDeProveedor\(crudo, env as ProviderVisibilityEnv\)/);
    expect(leer("src/lib/prisma.ts")).toMatch(/opciones\?\.todosLosProveedores \? par\.crudo : par\.publico/);
    expect(leer("src/app/api/cron/sync-tours/route.ts")).toMatch(/getPrisma\(\{ todosLosProveedores: true \}\)/);
  });

  it("REQ-3312: toda consulta cruda a Tour en código público lleva el filtro del proveedor", () => {
    // Archivos que leen Tour en SQL crudo y que el público ve. Cada uno debe importar el filtro.
    const publicos = ["src/destinations/repository.ts", "src/home/load.ts"];
    for (const f of publicos) expect(leer(f), f).toMatch(/provider-visibility/);

    // Si aparece un archivo nuevo con SQL crudo sobre Tour, esta prueba lo caza: o lleva el filtro,
    // o entra en la lista de exentos con su motivo (sync, índice derivado, correos de una reserva ya hecha).
    const exentos = [
      "src/catalog/", "src/scripts/", "src/lib/db/sync/",   // escriben o sincronizan: ven todo a propósito
      "src/search/lib/fts-query.ts", "src/search/lib/fts-stem.ts", // construyen el índice FTS (debe tener todo; el filtro va al servir)
      "src/departures/repository.ts",                        // trabajo interno de salidas (no es una vista pública)
      "src/notifications/lib/", "src/booking/",              // correos y fichas de una reserva ya hecha
      "src/trips/lib/", "src/taxonomy/", "src/seo/lib/titles.ts", "src/destinations/lib/hub-copy.ts", // textos, no lecturas de tours
    ];
    const salida = execFileSync("grep", ["-rl", "-e", 'FROM "Tour"', "-e", "FROM Tour ", "src"], { encoding: "utf8" });
    const archivos = salida.split("\n").filter((f) => f && !f.includes(".test."));
    // Pasa si el archivo trae el filtro (importa la lib) o recibe la lista de ocultos por parámetro (marcado REQ-3311).
    const cubierto = (f: string) => { const t = leer(f); return t.includes("provider-visibility") || t.includes("REQ-3311"); };
    const sinFiltro = archivos.filter((f) => !exentos.some((e) => f.startsWith(e)) && !cubierto(f));
    expect(sinFiltro, `consultas crudas a Tour sin el filtro del gate C: ${sinFiltro.join(", ")}`).toEqual([]);
  });
});
