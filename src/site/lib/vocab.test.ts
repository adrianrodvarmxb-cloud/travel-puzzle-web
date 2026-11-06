import { describe, expect, it } from "vitest";
import { PROHIBIDAS_SITIO, textsOf } from "./vocab";

describe("vocabulario prohibido de las páginas nuevas", () => {
  it("REQ-244: rechaza FREETOUR, proveedores, «expertos», garantías e inflados", () => {
    for (const bad of [
      "Reserva en FreeTour.com", "freetour", "Viajes diseñados por expertos", "viajeros expertos", "expert travelers",
      "garantía de no gastos adicionales", "somos la única agencia", "miles de viajeros", "reseñas reales", "el mejor precio",
      "Inca World", "Fantástica China", "Big Bus", "Kiwitaxi", "Civitatis", "GetYourGuide", "GuruWalk", "Klook",
    ]) expect(PROHIBIDAS_SITIO.test(bad), bad).toBe(true);
  });

  it("REQ-244: deja pasar el copy permitido", () => {
    for (const ok of ["Te armamos tu viaje", "Habla con un asesor de viaje", "free tours con guías locales", "Registro Nacional de Turismo"]) {
      expect(PROHIBIDAS_SITIO.test(ok), ok).toBe(false);
    }
  });

  it("textsOf junta todas las cadenas de un objeto anidado", () => {
    expect(textsOf({ a: "x", b: [{ c: "y" }, 3], d: null })).toEqual(["x", "y"]);
  });
});
