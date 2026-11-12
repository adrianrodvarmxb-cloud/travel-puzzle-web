import { describe, it, expect } from "vitest";
import { mentionsProvider, scrubProviderName, scrubProviderDescription } from "./text";

describe("textos del proveedor (Tangol)", () => {
  it("REQ-3372: detecta el nombre y el dominio del proveedor, con o sin acentos y mayúsculas", () => {
    expect(mentionsProvider("City tour by TANGOL")).toBe(true);
    expect(mentionsProvider("https://www.tangol.com/ar/city-tour")).toBe(true);
    expect(mentionsProvider("Tángol Viajes")).toBe(true);
    expect(mentionsProvider("City tour en Buenos Aires")).toBe(false);
    expect(mentionsProvider(null)).toBe(false);
  });

  it("REQ-3372: limpia el título: quita el nombre, el paréntesis que lo contiene y los separadores sueltos", () => {
    expect(scrubProviderName("City Tour Buenos Aires - Tangol")).toBe("City Tour Buenos Aires");
    expect(scrubProviderName("City Tour (operado por Tangol)")).toBe("City Tour");
    expect(scrubProviderName("Tangol: Cataratas del Iguazú")).toBe("Cataratas del Iguazú");
    expect(scrubProviderName("Visita a tangol.com/ar/city-tour hoy")).toBe("Visita a hoy");
    expect(scrubProviderName("Cataratas del Iguazú")).toBe("Cataratas del Iguazú");
    expect(scrubProviderName("Tangol")).toBe("");
  });

  it("REQ-3372: en la descripción solo caen las frases que nombran al proveedor", () => {
    expect(scrubProviderDescription("Paseo de 3 horas. Reserva en tangol.com. Incluye guía.")).toBe("Paseo de 3 horas. Incluye guía.");
    expect(scrubProviderDescription("Tangol es el operador.")).toBeNull();
    expect(scrubProviderDescription("Paseo de 3 horas.")).toBe("Paseo de 3 horas.");
    expect(scrubProviderDescription(null)).toBeNull();
  });
});
