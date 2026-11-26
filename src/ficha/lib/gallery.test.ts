import { describe, expect, it } from "vitest";
import { galleryCells, galleryLayout } from "./gallery";

const m = (n: number) => Array.from({ length: n }, (_, i) => ({ url: `https://img.example.com/${i}.jpg`, alt: null }));

describe("galleryLayout", () => {
  it("REQ-10809: con una foto, foto única", () => {
    expect(galleryLayout(m(1))).toEqual({ kind: "single", main: m(1)[0] });
  });

  it("REQ-10809: 1 grande + hasta 4 al lado; lo demás se cuenta", () => {
    const g = galleryLayout(m(8));
    expect(g.kind).toBe("mosaic");
    if (g.kind !== "mosaic") return;
    expect(g.main.url).toContain("/0.jpg");
    expect(g.side).toHaveLength(4);
    expect(g.more).toBe(3);
    const tres = galleryLayout(m(3));
    expect(tres.kind === "mosaic" && tres.side.length === 2 && tres.more === 0).toBe(true);
  });

  it("REQ-10809: descarta URLs vacías y repetidas; sin fotos no hay galería", () => {
    expect(galleryLayout([{ url: " ", alt: null }])).toEqual({ kind: "none" });
    expect(galleryLayout([...m(1), ...m(1)]).kind).toBe("single");
  });
});

describe("REQ-10896: la rejilla se adapta a 1–5 fotos sin huecos", () => {
  it("REQ-10896: cada número de fotos laterales llena las 2 columnas × 2 filas (4 celdas) sin dejar hueco", () => {
    const area = (n: number) => galleryCells(n).reduce((a, c) => a + c.colSpan * c.rowSpan, 0);
    expect(galleryCells(0)).toEqual([]);
    expect(galleryCells(1)).toEqual([{ colSpan: 2, rowSpan: 2 }]);
    expect(galleryCells(2)).toEqual([{ colSpan: 2, rowSpan: 1 }, { colSpan: 2, rowSpan: 1 }]);
    expect(galleryCells(3)).toEqual([{ colSpan: 2, rowSpan: 1 }, { colSpan: 1, rowSpan: 1 }, { colSpan: 1, rowSpan: 1 }]);
    expect(galleryCells(4)).toEqual([{ colSpan: 1, rowSpan: 1 }, { colSpan: 1, rowSpan: 1 }, { colSpan: 1, rowSpan: 1 }, { colSpan: 1, rowSpan: 1 }]);
    for (const n of [1, 2, 3, 4, 9]) expect(area(n)).toBe(4);
    const fotos = (n: number) => Array.from({ length: n }, (_, i) => ({ url: `https://img.example.com/${i}.jpg`, alt: null }));
    for (const n of [2, 3, 4, 5]) {
      const l = galleryLayout(fotos(n));
      expect(l.kind).toBe("mosaic");
      if (l.kind === "mosaic") expect(l.cells).toEqual(galleryCells(l.side.length));
    }
  });
});
