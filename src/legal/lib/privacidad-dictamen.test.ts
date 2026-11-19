import { describe, it, expect } from "vitest";
import { PRIVACIDAD_INTEGRAL } from "./privacidad";

// REQ-10791 REQ-10792 · Textos del dictamen del abogado (19-11-2026), copiados tal cual.
const PLAZO_ARCO =
  "Travel Puzzle comunicará al titular la determinación adoptada en un plazo máximo de veinte (20) días hábiles contados desde la fecha en que se recibió la solicitud completa y, de resultar procedente, la hará efectiva dentro de los quince (15) días hábiles siguientes, conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares vigente.";

describe("Aviso de privacidad · dictamen del abogado", () => {
  it("REQ-10791: el plazo ARCO es §D literal (20 + 15 días hábiles), sin el «15 días» anterior", () => {
    expect(PRIVACIDAD_INTEGRAL).toContain(PLAZO_ARCO);
    expect(PRIVACIDAD_INTEGRAL).not.toMatch(/respuesta a su solicitud\?\n15 días\n/);
  });

  it("REQ-10792: las transferencias al operador se informan como necesarias y sin casilla", () => {
    expect(PRIVACIDAD_INTEGRAL).toContain(
      "Estas transferencias son necesarias para cumplir el servicio que contrata, por lo que no requieren su consentimiento.",
    );
  });
});
