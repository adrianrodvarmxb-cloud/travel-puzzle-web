import { describe, expect, it } from "vitest";
import { fichaEjemplo } from "./fixtures";
import { API_PROVIDERS, hiddenByQuality, qualityCheck, qualityReport } from "./quality";

describe("REQ-10824: mínimo de publicación para tours por API (decisión 50)", () => {
  it("REQ-10824: una ficha con descripción, foto y precio cumple", () => {
    expect(qualityCheck(fichaEjemplo())).toEqual({ ok: true, missing: [] });
  });

  it("REQ-10824: sin descripción, sin foto o sin precio no cumple y dice qué falta", () => {
    const f = fichaEjemplo();
    f.descriptionHtml = "<p> </p>"; f.brief = null; f.gallery = []; f.price = null;
    expect(qualityCheck(f)).toEqual({ ok: false, missing: ["descripcion", "foto", "precio"] });
    const g = fichaEjemplo(); g.descriptionHtml = null; g.brief = "Un texto corto basta.";
    expect(qualityCheck(g).ok).toBe(true);
    const h = fichaEjemplo(); h.price = { amount: 0, currency: "EUR", per: "person" };
    expect(qualityCheck(h).ok).toBe(true); // gratis es un precio real
  });

  it("REQ-10824: con la bandera apagada nada se oculta; encendida, solo los tours por API que no cumplen", () => {
    const mala = fichaEjemplo(); mala.provider = "tangol"; mala.gallery = [];
    expect(hiddenByQuality(mala, { gateEnabled: false })).toBe(false);
    expect(hiddenByQuality(mala, { gateEnabled: true })).toBe(true);
    const viaje = fichaEjemplo(); viaje.provider = "agencia:tas"; viaje.gallery = [];
    expect(hiddenByQuality(viaje, { gateEnabled: true })).toBe(false);
    const buena = fichaEjemplo(); buena.provider = "freetour";
    expect(hiddenByQuality(buena, { gateEnabled: true })).toBe(false);
    expect([...API_PROVIDERS]).toEqual(["tangol", "freetour", "bigbus"]);
  });

  it("REQ-10824: el reporte dice cuántos quedarían ocultos por proveedor y por qué (para informar al PO antes de encender)", () => {
    const a = fichaEjemplo(); a.id = "a"; a.provider = "tangol"; a.gallery = [];
    const b = fichaEjemplo(); b.id = "b"; b.provider = "tangol";
    const c = fichaEjemplo(); c.id = "c"; c.provider = "freetour"; c.price = null; c.descriptionHtml = null; c.brief = null;
    const d = fichaEjemplo(); d.id = "d"; d.provider = "agencia:tas"; d.gallery = [];
    const r = qualityReport([a, b, c, d]);
    expect(r).toEqual({
      total: 3,
      hidden: 2,
      byProvider: { tangol: { total: 2, hidden: 1 }, freetour: { total: 1, hidden: 1 } },
      items: [
        { id: "a", provider: "tangol", missing: ["foto"] },
        { id: "c", provider: "freetour", missing: ["descripcion", "precio"] },
      ],
    });
  });
});
