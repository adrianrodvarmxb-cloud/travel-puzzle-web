// REQ-028 — página /traslados con el buscador de Kiwitaxi (Travelpayouts), apagada por defecto.
import { describe, expect, it } from "vitest";
import { isTransfersVisible, transfersWidgetUrl } from "./widget";

describe("widget de traslados", () => {
  it("REQ-028: apagado por defecto; solo 'true' enciende", () => {
    expect(isTransfersVisible(undefined)).toBe(false);
    expect(isTransfersVisible("1")).toBe(false);
    expect(isTransfersVisible("true")).toBe(true);
  });

  it("REQ-028: URL del widget con nuestra cuenta, español, USD y sin marcas externas", () => {
    const u = new URL(transfersWidgetUrl());
    expect(u.origin + u.pathname).toBe("https://tpwgts.com/content");
    const p = u.searchParams;
    expect(p.get("trs")).toBe("595791");
    expect(p.get("shmarker")).toBe("800669");
    expect(p.get("promo_id")).toBe("3879");
    expect(p.get("locale")).toBe("es");
    expect(p.get("currency")).toBe("USD");
    expect(p.get("powered_by")).toBe("false");
    expect(p.get("hide_external_links")).toBe("true");
  });

  it("REQ-028: idioma soportado o español por defecto", () => {
    expect(new URL(transfersWidgetUrl("en")).searchParams.get("locale")).toBe("en");
    expect(new URL(transfersWidgetUrl("xx")).searchParams.get("locale")).toBe("es");
  });
});
