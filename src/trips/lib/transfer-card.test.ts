// REQ-10753: tarjeta de traslado (Kiwitaxi, afiliado) en fichas que no son de FREETOUR, tras FICHA_TRANSFER_CARD_ENABLED.
import { describe, expect, it } from "vitest";
import { transferCard, transferCardEnabled } from "./transfer-card";

const base = { cityName: "Buenos Aires", tourId: "tangol-123", provider: "tangol", lang: "es" } as const;

describe("REQ-10753: tarjeta de Kiwitaxi en la ficha", () => {
  it("REQ-10753: la bandera solo cuenta en «true» exacto", () => {
    expect(transferCardEnabled({ FICHA_TRANSFER_CARD_ENABLED: "true" })).toBe(true);
    expect(transferCardEnabled({ FICHA_TRANSFER_CARD_ENABLED: "TRUE" })).toBe(false);
    expect(transferCardEnabled({})).toBe(false);
  });
  it("REQ-10753: con la bandera encendida y una ficha de Tangol, la tarjeta lleva el enlace de afiliado de Travelpayouts con la ciudad y la ficha como subID", () => {
    const c = transferCard({ ...base, enabled: true });
    expect(c).not.toBeNull();
    expect(c!.external).toBe(true);
    expect(c!.title).toBe("Traslado desde el aeropuerto");
    expect(c!.by).toBe("Lo reservas con Kiwitaxi");
    const u = new URL(c!.url);
    expect(u.host).toBe("tp.media");
    expect(u.searchParams.get("marker")).toBe("800669.ficha_tangol123");
    expect(new URL(u.searchParams.get("u")!).searchParams.get("to")).toBe("Buenos Aires");
  });
  it("REQ-10753: nunca en FREETOUR (decisión 29), ni apagada, ni sin ciudad", () => {
    expect(transferCard({ ...base, provider: "freetour", enabled: true })).toBeNull();
    expect(transferCard({ ...base, provider: "FreeTour ", enabled: true })).toBeNull();
    expect(transferCard({ ...base, enabled: false })).toBeNull();
    expect(transferCard({ ...base, cityName: "  ", enabled: true })).toBeNull();
    expect(transferCard({ ...base, cityName: null, enabled: true })).toBeNull();
  });
  it("REQ-10753: textos en los 6 idiomas de la página; un idioma desconocido cae al inglés", () => {
    for (const lang of ["es", "en", "pt", "fr", "de", "it"]) expect(transferCard({ ...base, lang, enabled: true })!.title.length).toBeGreaterThan(5);
    expect(transferCard({ ...base, lang: "xx", enabled: true })!.title).toBe("Airport transfer");
  });
});
