import { describe, expect, it } from "vitest";
import { fichaFacets } from "./taxonomy-facets";

describe("REQ-581: tipo principal y etiquetas desde la lib de taxonomía", () => {
  it("REQ-581: un circuito propio da su tipo y solo etiquetas activas del diccionario", () => {
    const f = fichaFacets({ proveedor: "propios", categoriaId: "circuito", precio: 1200, durationDays: 8, titulo: "Francia esencial en tren", idiomas: ["es"], modos: ["private"], vueloIncluido: false }, "es");
    expect(f.tipo).toBe("Circuito (varios días)");
    expect(f.etiquetas).toContain("Privado");
    expect(f.etiquetas).toContain("En español");
    // Ni calificación ni favorito: salen de reseñas, no describen el producto.
    expect(f.etiquetas).not.toContain("Calificación");
  });
  it("REQ-581: en inglés usa el término en inglés del diccionario", () => {
    const f = fichaFacets({ proveedor: "propios", categoriaId: "circuito", precio: 1200, durationDays: 8, titulo: "Francia esencial", idiomas: ["es"] }, "en");
    expect(f.tipo).toBe("Multi-day tour");
    expect(f.etiquetas).toContain("In Spanish");
  });
  it("REQ-581: sin formato publicable (fuera / por revisar) no hay tipo ni etiquetas", () => {
    const f = fichaFacets({ proveedor: "proveedor-sin-mapeo", categoriaId: "x", precio: null, titulo: "Algo" }, "es");
    expect(f.tipo).toBeNull();
    expect(f.etiquetas).toEqual([]);
  });
});
