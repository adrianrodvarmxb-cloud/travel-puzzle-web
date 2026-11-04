import { describe, expect, it } from "vitest";
import { isHydrationError, smokePages, smokeVerdict } from "./smoke";

const ok = { path: "/", viewport: 390, status: 200, pageErrors: [], appError: false };

describe("smokeVerdict", () => {
  it("REQ-003: todo sano → se puede publicar", () => {
    expect(smokeVerdict([ok, { ...ok, viewport: 1366 }])).toEqual({ ok: true, failures: [] });
  });
  it("REQ-003: sin páginas probadas no se publica", () => {
    expect(smokeVerdict([]).ok).toBe(false);
  });
  it("REQ-001: la falla de INC-001 (hidratación #418 o Application error) bloquea la publicación", () => {
    const v = smokeVerdict([{ ...ok, path: "/tours", pageErrors: ["Minified React error #418"] }, { ...ok, appError: true }]);
    expect(v.ok).toBe(false);
    expect(v.failures).toHaveLength(2);
    expect(v.failures[0]).toContain("/tours @390");
  });
  it("REQ-030: una página opcional (tras bandera) puede dar 404, pero nunca 500 ni excepciones", () => {
    expect(smokeVerdict([{ ...ok, path: "/ayuda", status: 404, optional: true }]).ok).toBe(true);
    expect(smokeVerdict([{ ...ok, path: "/ayuda", status: 500, optional: true }]).ok).toBe(false);
    expect(smokeVerdict([{ ...ok, path: "/ayuda", status: 404, optional: true, pageErrors: ["boom"] }]).ok).toBe(false);
    expect(smokeVerdict([{ ...ok, path: "/", status: 404 }]).ok).toBe(false);
  });
  it("REQ-003: 404/500 o sin respuesta bloquean", () => {
    expect(smokeVerdict([{ ...ok, status: 500 }]).ok).toBe(false);
    expect(smokeVerdict([{ ...ok, status: null }]).ok).toBe(false);
  });
});

describe("smokePages", () => {
  it("REQ-003: agrega fichas reales de viajes y tours sin repetir", () => {
    const found = ["/viajes/francia/a", "/viajes/hong-kong/b", "/viajes/x/c", "/tours/123", "/tours", "/tours/9?x=1", "/ayuda"];
    expect(smokePages(["/", "/tours"], found)).toEqual(["/", "/tours", "/viajes/francia/a", "/viajes/hong-kong/b", "/tours/123"]);
  });
});

describe("isHydrationError", () => {
  it("REQ-001: reconoce la hidratación fallida de INC-001 y no otros errores", () => {
    expect(isHydrationError("Uncaught Error: Minified React error #418; visit https://react.dev/errors/418")).toBe(true);
    expect(isHydrationError("Hydration failed because the server rendered text didn't match the client")).toBe(true);
    expect(isHydrationError("Minified React error #4181")).toBe(false);
    expect(isHydrationError("Failed to load resource: 404")).toBe(false);
  });
});
