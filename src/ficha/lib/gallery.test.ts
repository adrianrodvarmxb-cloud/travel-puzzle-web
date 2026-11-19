import { describe, expect, it } from "vitest";
import { galleryLayout } from "./gallery";

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
