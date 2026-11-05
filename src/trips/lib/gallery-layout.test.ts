import { describe, it, expect } from "vitest";
import { mosaicLayout } from "./gallery-layout";

// REQ-042: galería en mosaico que se acomoda al número de fotos (como "Destinos" del home)
describe("REQ-042 mosaicLayout", () => {
  it("REQ-042: sin fotos no pinta nada", () => {
    expect(mosaicLayout(0)).toEqual({ shown: 0, extra: 0, grid: "", tiles: [] });
  });
  it("REQ-042: 1 foto ocupa todo el ancho", () => {
    const l = mosaicLayout(1);
    expect(l.shown).toBe(1);
    expect(l.tiles[0]).toContain("col-span-2");
  });
  it("REQ-042: 2 fotos van mitad y mitad", () => {
    const l = mosaicLayout(2);
    expect(l.tiles).toHaveLength(2);
    l.tiles.forEach((t) => expect(t).not.toContain("row-span-2"));
  });
  it("REQ-042: 3 o más fotos: una grande y las demás chicas", () => {
    for (const n of [3, 4, 5]) {
      const l = mosaicLayout(n);
      expect(l.shown).toBe(n);
      expect(l.tiles[0]).toContain("md:row-span-2");
      expect(l.tiles.slice(1).some((t) => t.includes("md:row-span-2"))).toBe(false);
    }
  });
  it("REQ-042: nunca deja huecos: con chicas impares la última llena la fila", () => {
    expect(mosaicLayout(3).tiles[2]).toBe(mosaicLayout(3).tiles[1]); // 2 chicas: pares
    expect(mosaicLayout(4).tiles[3]).toContain("col-span-2"); // 3 chicas: la última ocupa dos columnas
  });
  it("REQ-042: más de 5 fotos muestra 5 y avisa cuántas faltan", () => {
    expect(mosaicLayout(9)).toMatchObject({ shown: 5, extra: 4 });
  });
});
