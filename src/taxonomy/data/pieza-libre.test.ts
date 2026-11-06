import { describe, expect, it } from "vitest";
import { DEFAULT_DICTIONARY } from "./index";

// Corrección del PO (6-11 10:43, anula la decisión 3): la etiqueta pública de `pieza-libre` es «Pieza libre».
describe("REQ-269 etiqueta pública de pieza-libre", () => {
  const e = DEFAULT_DICTIONARY.terminos.find((x) => x.slug === "pieza-libre")!;
  it("término ES «Pieza libre»; EN «Free tour» por ahora (propuesta «Free piece» para firma)", () => {
    expect(e.termino_es).toBe("Pieza libre");
    expect(e.termino_en).toBe("Free tour");
  });
  it("«Free tour», «free tour» y «tour gratis» quedan como sinónimos de búsqueda; la colección sigue siendo «La Primera Pieza»", () => {
    const s = e.sinonimos.map((x) => x.toLowerCase());
    expect(s).toContain("free tour");
    expect(s).toContain("tour gratis");
    expect((e as { coleccion_es?: string }).coleccion_es).toBe("La Primera Pieza");
  });
});
