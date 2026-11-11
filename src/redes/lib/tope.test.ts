import { describe, it, expect } from "vitest";
import { decidirPublicacion } from "./tope";

describe("REQ-1090: no repetir un artículo en una red", () => {
  it("REQ-1090: publica si el artículo es nuevo en la red", () => {
    expect(decidirPublicacion({ yaPublicadoEnRed: false })).toEqual({ publicar: true });
  });
  it("REQ-1090: no repite un artículo ya publicado en esa red", () => {
    expect(decidirPublicacion({ yaPublicadoEnRed: true }).publicar).toBe(false);
  });
});
