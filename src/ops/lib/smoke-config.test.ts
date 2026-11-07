import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { discoverPages, legacyFailures, parseSmokeConfig, smokeVerdict } from "./smoke";

const config = parseSmokeConfig(JSON.parse(readFileSync("tests/smoke/pages.json", "utf8")));

describe("Lista de la prueba de humo con La Primera Pieza encendida (REQ-305)", () => {
  it("REQ-223: conserva las páginas tras bandera (/ayuda, /admin/entrar) como opcionales", () => {
    expect(config.optional).toEqual(["/ayuda", "/admin/entrar"]);
  });

  it("REQ-242: el formato nuevo conserva `flagged` (bandera → páginas) y no las mete en fijas ni opcionales", () => {
    expect(config.flagged.NOSOTROS_ENABLED).toContain("/nosotros");
    expect(config.fixed).not.toContain("/nosotros");
    expect(config.optional).not.toContain("/nosotros");
    expect(parseSmokeConfig({ fixed: ["/"] }).flagged).toEqual({});
    expect(() => parseSmokeConfig({ fixed: ["/"], flagged: { NOSOTROS_ENABLED: ["nosotros"] } })).toThrow();
    expect(config.flagged["BLOG_ENABLED+BLOG_SHOW_DRAFTS"]).toContain("/blog");
    expect(() => parseSmokeConfig({ fixed: ["/"], flagged: { "BLOG_ENABLED+": ["/blog"] } })).toThrow();
  });

  it("REQ-305: revisa La Primera Pieza, destinos, país, ciudad y el sitemap", () => {
    for (const p of ["/la-primera-pieza", "/destinos", "/destinos/mx", "/destinos/mx/ciudad-de-mexico", "/sitemap-index.xml"]) expect(config.fixed, p).toContain(p);
  });

  it("REQ-305: la ficha de tour se toma de la página de la ciudad (slug real, no fijo) y es obligatoria", () => {
    const rule = config.discover.find((r) => r.from === "/destinos/mx/ciudad-de-mexico");
    expect(rule).toBeDefined();
    expect(rule!.required).toBe(true);
    expect(new RegExp(rule!.pattern).test("/destinos/mx/ciudad-de-mexico/free-tour-centro-historico")).toBe(true);
    expect(new RegExp(rule!.pattern).test("/destinos/mx/ciudad-de-mexico")).toBe(false);
    expect(config.fixed.some((p) => /^\/destinos\/mx\/ciudad-de-mexico\/[^/]+$/.test(p))).toBe(false);
  });

  it("REQ-305: una URL vieja /tours/{id} debe dar 301 o 410 (nunca 5xx) y ya no se carga como página", () => {
    expect(config.legacy.length).toBeGreaterThan(0);
    for (const l of config.legacy) {
      expect(l.path).toMatch(/^\/tours\/[^/?#]+$/);
      expect(l.expect).toEqual([301, 410]);
    }
    expect(config.discover.some((r) => new RegExp(r.pattern).test("/tours/abc"))).toBe(false);
  });
});

describe("discoverPages (REQ-305)", () => {
  const rules = [
    { from: "/tours", pattern: "^/viajes/[^/]+/[^/?#]+$", take: 2, required: false },
    { from: "/destinos/mx/ciudad-de-mexico", pattern: "^/destinos/mx/ciudad-de-mexico/[^/?#]+$", take: 1, required: true },
  ];

  it("REQ-305: toma de cada página las primeras ligas que cumplen su patrón, sin repetir", () => {
    const r = discoverPages(rules, {
      "/tours": ["/viajes/peru/a", "/viajes/peru/a", "/viajes/china/b", "/viajes/x/c", "/tours/1"],
      "/destinos/mx/ciudad-de-mexico": ["/destinos/mx/ciudad-de-mexico/ficha-1?x=1", "/destinos/mx/ciudad-de-mexico/ficha-2", "/destinos/mx"],
    });
    expect(r.pages).toEqual(["/viajes/peru/a", "/viajes/china/b", "/destinos/mx/ciudad-de-mexico/ficha-2"]);
    expect(r.failures).toEqual([]);
  });

  it("REQ-305: si una regla obligatoria no encuentra fichas, es una falla (antes bajaba de 22 a 14 cargas en silencio)", () => {
    const r = discoverPages(rules, { "/tours": [], "/destinos/mx/ciudad-de-mexico": [] });
    expect(r.pages).toEqual([]);
    expect(r.failures).toEqual(["/destinos/mx/ciudad-de-mexico: no se encontró ninguna ficha (se esperaban 1)"]);
  });

  it("REQ-305: la falla de descubrimiento bloquea la publicación aunque las páginas fijas estén sanas", () => {
    const ok = { path: "/", viewport: 390, status: 200, pageErrors: [], appError: false };
    const v = smokeVerdict([ok], ["/destinos/mx/ciudad-de-mexico: no se encontró ninguna ficha (se esperaban 1)"]);
    expect(v.ok).toBe(false);
    expect(v.failures[0]).toContain("no se encontró ninguna ficha");
  });
});

describe("legacyFailures (REQ-305)", () => {
  const legacy = [{ path: "/tours/abc", expect: [301, 410] }];
  it("REQ-305: 301 o 410 está bien", () => {
    expect(legacyFailures(legacy, { "/tours/abc": 301 })).toEqual([]);
    expect(legacyFailures(legacy, { "/tours/abc": 410 })).toEqual([]);
  });
  it("REQ-305: 200, 404, 5xx o sin respuesta fallan", () => {
    for (const s of [200, 404, 500, 503, null]) expect(legacyFailures(legacy, { "/tours/abc": s }), String(s)).toHaveLength(1);
    expect(legacyFailures(legacy, { "/tours/abc": 502 })[0]).toBe("/tours/abc: URL vieja respondió 502 (se esperaba 301 o 410)");
  });
});

describe("parseSmokeConfig (REQ-305)", () => {
  it("REQ-305: rechaza una lista mal formada en lugar de probar menos páginas", () => {
    expect(() => parseSmokeConfig({ fixed: "/" })).toThrow();
    expect(() => parseSmokeConfig({ fixed: ["/"], discover: [{ from: "/x", pattern: "(", take: 1 }] })).toThrow();
  });
  it("REQ-305: la lista anterior (solo fixed) sigue siendo válida", () => {
    expect(parseSmokeConfig({ fixed: ["/"] })).toEqual({ fixed: ["/"], optional: [], discover: [], legacy: [], flagged: {}, flaggedDiscover: {}, localeContract: {} }); // REQ-675: nuevas claves con valor vacío por defecto
  });
});
