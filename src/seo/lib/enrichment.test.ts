import { describe, expect, it } from "vitest";
import { indexableEnrichment, PROVIDER_ENRICHMENT } from "./enrichment";

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
