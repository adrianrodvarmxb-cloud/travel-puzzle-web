import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { footerPageLinks, sitePagesFromEnv, flaggedSmokePages, wranglerVars, PAGE_FLAGS } from "./pages";

describe("páginas institucionales tras bandera", () => {
  it("REQ-240: solo \"true\" exacto enciende una página; ausente, vacío o \"TRUE\" la dejan apagada", () => {
    expect(sitePagesFromEnv({}).nosotros).toBe(false);
    expect(sitePagesFromEnv({ NOSOTROS_ENABLED: "TRUE" }).nosotros).toBe(false);
    expect(sitePagesFromEnv({ NOSOTROS_ENABLED: "1" }).nosotros).toBe(false);
    expect(sitePagesFromEnv({ NOSOTROS_ENABLED: "true" }).nosotros).toBe(true);
  });

  it("REQ-240: wrangler.jsonc trae cada bandera de página en \"false\"", () => {
    const vars = wranglerVars(readFileSync("wrangler.jsonc", "utf8"));
    for (const flag of Object.values(PAGE_FLAGS)) expect(vars[flag], flag).toBe("false");
  });

  it("REQ-241: el pie no enlaza páginas apagadas; encendida, «Nosotros» aparece con su ruta", () => {
    expect(footerPageLinks(sitePagesFromEnv({}), "es")).toEqual([]);
    expect(footerPageLinks(sitePagesFromEnv({ NOSOTROS_ENABLED: "true" }), "es")).toEqual([{ href: "/nosotros", label: "Nosotros" }]);
    expect(footerPageLinks(sitePagesFromEnv({ NOSOTROS_ENABLED: "true" }), "en")).toEqual([{ href: "/nosotros", label: "About us" }]);
  });

  it("REQ-241: el menú principal no agrega páginas institucionales (van en el pie, D3)", () => {
    const navbar = readFileSync("src/components/layout/Navbar.tsx", "utf8");
    expect(navbar).not.toMatch(/\/nosotros|\/contacto|\/blog|\/asesores/);
  });

  it("REQ-242: la prueba de humo agrega la página solo si su bandera está encendida (env manda sobre wrangler)", () => {
    const flagged = { NOSOTROS_ENABLED: ["/nosotros"] };
    expect(flaggedSmokePages(flagged, { NOSOTROS_ENABLED: "false" }, {})).toEqual([]);
    expect(flaggedSmokePages(flagged, { NOSOTROS_ENABLED: "true" }, {})).toEqual(["/nosotros"]);
    expect(flaggedSmokePages(flagged, { NOSOTROS_ENABLED: "false" }, { NOSOTROS_ENABLED: "true" })).toEqual(["/nosotros"]);
  });

  it("REQ-242: tests/smoke/pages.json declara /nosotros bajo su bandera y no en las fijas", () => {
    const cfg = JSON.parse(readFileSync("tests/smoke/pages.json", "utf8")) as { fixed: string[]; flagged: Record<string, string[]> };
    expect(cfg.fixed).not.toContain("/nosotros");
    expect(cfg.flagged.NOSOTROS_ENABLED).toContain("/nosotros");
  });
});
