import { describe, expect, it } from "vitest";
import { es } from "./es";
import { en } from "./en";

describe("REQ-220: botón de la ficha de pago", () => {
  it("dice «Lo quiero» en español y «I want it» en inglés", () => {
    expect(es["tours.bookNow"]).toBe("Lo quiero");
    expect(en["tours.bookNow"]).toBe("I want it");
  });
});
