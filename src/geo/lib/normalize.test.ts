import { describe, it, expect } from "vitest";
import { normalizeName, nameKeys, jaroWinkler } from "./normalize";

describe("normalizeName", () => {
  it("REQ-131: minúsculas, NFKD sin acentos y letras especiales", () => {
    expect(normalizeName("Český Krumlov")).toBe("cesky krumlov");
    expect(normalizeName("Lezhë")).toBe("lezhe");
    expect(normalizeName("Straße")).toBe("strasse");
    expect(normalizeName("Taipéi")).toBe("taipei");
  });

  it("REQ-131: quita el calificador «(XX)» y el sufijo de estado tras coma o guion", () => {
    expect(normalizeName("Córdoba (AR)")).toBe("cordoba");
    expect(normalizeName("La Paz (BO)")).toBe("la paz");
    expect(normalizeName("Portland, Oregon")).toBe("portland");
    expect(normalizeName("Santiago - Chile")).toBe("santiago");
  });

  it("REQ-131: quita apóstrofos y el posesivo «'s»", () => {
    expect(normalizeName("St. Julian's")).toBe("st julian");
    expect(normalizeName("L'Aquila")).toBe("laquila");
  });

  it("REQ-131: vacío o raro → cadena vacía", () => {
    expect(normalizeName("")).toBe("");
    expect(normalizeName("  ()  ")).toBe("");
  });
});

describe("nameKeys", () => {
  it("REQ-131: la llave exacta es el nombre normalizado", () => {
    expect(nameKeys("Edimburgo").exact).toBe("edimburgo");
  });

  it("REQ-131: unifica San/St./Saint/Sankt como variante", () => {
    expect(nameKeys("St. Julian's").variants).toContain("saint julian");
    expect(nameKeys("San Julián").variants).toContain("saint julian");
    expect(nameKeys("Sankt Gallen").variants).toContain("saint gallen");
  });

  it("REQ-131: quita prefijos («Isla de», «Ciudad de») y sufijos («City», «Old Town») como variante", () => {
    expect(nameKeys("Isla de Pascua").variants).toContain("pascua");
    expect(nameKeys("Taipei City").variants).toContain("taipei");
    expect(nameKeys("Kotor Old Town").variants).toContain("kotor");
    expect(nameKeys("Ciudad de Guatemala").variants).toContain("guatemala");
  });

  it("REQ-131: en nombres de GeoNames el calificador se queda en la exacta y el nombre sin él es variante", () => {
    expect(nameKeys("Zürich (Kreis 1)", { keepQualifiers: true })).toMatchObject({ exact: "zurich kreis 1" });
    expect(nameKeys("Zürich (Kreis 1)", { keepQualifiers: true }).variants).toContain("zurich");
  });

  it("REQ-131: las variantes nunca repiten la exacta ni quedan vacías", () => {
    const k = nameKeys("City");
    expect(k.variants).not.toContain("");
    expect(k.variants).not.toContain(k.exact);
  });
});

describe("jaroWinkler", () => {
  it("REQ-131: 1 para iguales, 0 para vacío y alto para errores de una letra", () => {
    expect(jaroWinkler("trogir", "trogir")).toBe(1);
    expect(jaroWinkler("", "x")).toBe(0);
    expect(jaroWinkler("medulin", "medullin")).toBeGreaterThan(0.93);
    expect(jaroWinkler("samana", "santo domingo")).toBeLessThan(0.8);
  });
});
