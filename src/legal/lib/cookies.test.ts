import { describe, it, expect } from "vitest";
import { POLITICA_COOKIES_BORRADOR, isCookiesPolicyEnabled } from "./cookies";
import { toBlocks } from "./blocks";

describe("REQ-084 política de cookies (borrador)", () => {
  it("REQ-084: la página /cookies queda tras COOKIES_POLICY_ENABLED, apagada salvo \"true\"", () => {
    expect(isCookiesPolicyEnabled(undefined)).toBe(false);
    expect(isCookiesPolicyEnabled("false")).toBe(false);
    expect(isCookiesPolicyEnabled("true")).toBe(true);
  });

  it("REQ-084: cubre cookies necesarias, analíticas y de afiliados, y cómo desactivarlas", () => {
    const t = POLITICA_COOKIES_BORRADOR;
    expect(t).toContain("preferredLanguage");
    expect(t).toMatch(/analíticas/i);
    expect(t).toMatch(/afiliad/i);
    expect(t).toMatch(/navegador/i);
  });

  it("REQ-084: lleva la nota de revisión pendiente y no menciona a FREETOUR", () => {
    expect(POLITICA_COOKIES_BORRADOR).toMatch(/pendiente de revisión del PO y de un abogado/i);
    expect(POLITICA_COOKIES_BORRADOR).not.toMatch(/freetour/i);
  });

  it("REQ-084: usa el formato de los textos legales (títulos ##)", () => {
    expect(toBlocks(POLITICA_COOKIES_BORRADOR).filter((b) => b.type === "h2").length).toBeGreaterThanOrEqual(4);
  });
});
