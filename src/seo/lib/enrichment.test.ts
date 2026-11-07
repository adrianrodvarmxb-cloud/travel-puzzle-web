import { describe, expect, it } from "vitest";
import { indexableEnrichment, indexableProvider, PROVIDER_ENRICHMENT, PROVIDER_INDEXABLE, providerRobots } from "./enrichment";

describe("REQ-570: interruptor de enriquecimiento indexable por proveedor", () => {
  it("REQ-570: FREETOUR no se enriquece (decisión C2) y los demás sí", () => {
    expect(indexableEnrichment("freetour")).toBe(false);
    expect(indexableEnrichment(" FreeTour ")).toBe(false);
    expect(indexableEnrichment("propios")).toBe(true);
    expect(indexableEnrichment("agencia:extime-travel")).toBe(true);
    expect(indexableEnrichment("bemyguest")).toBe(true);
  });
  it("REQ-570: un proveedor declarado en false no se puede volver true por accidente (tabla congelada)", () => {
    expect(Object.isFrozen(PROVIDER_ENRICHMENT)).toBe(true);
    expect(PROVIDER_ENRICHMENT.freetour).toBe(false);
  });
});

describe("REQ-830: «noindex hasta su permiso» por proveedor (PO, 6 nov 2026, 22:36)", () => {
  it("REQ-830: las fichas de FREETOUR no se indexan; los demás proveedores sí", () => {
    expect(indexableProvider("freetour")).toBe(false);
    expect(indexableProvider(" FreeTour ")).toBe(false);
    expect(indexableProvider("propios")).toBe(true);
    expect(indexableProvider("agencia:extime-travel")).toBe(true);
    expect(indexableProvider("bemyguest")).toBe(true);
  });
  it("REQ-830: robots «noindex, follow» (los enlaces se siguen) solo para el proveedor apagado", () => {
    expect(providerRobots("freetour")).toEqual({ index: false, follow: true });
    expect(providerRobots("agencia:extime-travel")).toBeNull();
  });
  it("REQ-830: tabla congelada y reversible en una línea (freetour: false hasta el permiso escrito)", () => {
    expect(Object.isFrozen(PROVIDER_INDEXABLE)).toBe(true);
    expect(PROVIDER_INDEXABLE).toEqual({ freetour: false });
  });
  it("REQ-834: la prueba de humo deduce el noindex del enriquecimiento; ambas tablas apagan a los mismos proveedores", () => {
    const off = (t: Readonly<Record<string, boolean>>) => Object.keys(t).filter((k) => t[k] === false).sort();
    expect(off(PROVIDER_INDEXABLE)).toEqual(off(PROVIDER_ENRICHMENT));
  });
});
