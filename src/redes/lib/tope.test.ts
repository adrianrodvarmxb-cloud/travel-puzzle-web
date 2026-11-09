import { describe, it, expect } from "vitest";
import { decidirPublicacion } from "./tope";

describe("REQ-1090: tope de redes", () => {
  it("REQ-1090: publica si la red no tiene nada hoy y el artículo es nuevo", () => {
    expect(decidirPublicacion({ yaPublicadoEnRed: false, publicadasHoyEnRed: 0 })).toEqual({ publicar: true });
  });
  it("REQ-1090: no repite un artículo ya publicado en esa red", () => {
    const d = decidirPublicacion({ yaPublicadoEnRed: true, publicadasHoyEnRed: 0 });
    expect(d.publicar).toBe(false);
  });
  it("REQ-1090: respeta el tope de 1 por red al día", () => {
    const d = decidirPublicacion({ yaPublicadoEnRed: false, publicadasHoyEnRed: 1 });
    expect(d.publicar).toBe(false);
  });
  it("REQ-1090: el tope es configurable", () => {
    expect(decidirPublicacion({ yaPublicadoEnRed: false, publicadasHoyEnRed: 1, tope: 2 })).toEqual({ publicar: true });
  });
});
