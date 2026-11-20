import { describe, expect, it } from "vitest";
import { briefText } from "./brief-view";

describe("«En breve» de la ficha única", () => {
  it("REQ-10816: sale el texto del modelo; oculto en FREETOUR (REQ-570) y si viene vacío", () => {
    expect(briefText({ brief: " Un día en el glaciar. ", provider: "ejemplo", operator: "Operador X" })).toBe("Un día en el glaciar.");
    expect(briefText({ brief: "Un día en el glaciar.", provider: "freetour", operator: null })).toBeNull();
    expect(briefText({ brief: "  ", provider: "ejemplo", operator: null })).toBeNull();
  });

  it("REQ-10816: nunca nombra al operador: si el texto lo menciona, el bloque se oculta", () => {
    expect(briefText({ brief: "Con Operador X conoces el glaciar.", provider: "ejemplo", operator: "operador x" })).toBeNull();
  });
});
