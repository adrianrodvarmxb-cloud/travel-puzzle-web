import { describe, it, expect } from "vitest";
import { laminasYArticuloListos } from "./espera";

// REQ-1535: ninguna red publica hasta que el artículo y las láminas respondan 200.
describe("REQ-1535: esperar a que el artículo y las láminas estén públicos", () => {
  it("REQ-1535: listo cuando el artículo y todas las láminas responden 200", () => {
    const r = laminasYArticuloListos([
      { url: "https://travelpuzzle.com.mx/blog/mexico/x", status: 200 },
      { url: "https://travelpuzzle.com.mx/blog/img/x/ig-1.jpg", status: 200 },
    ]);
    expect(r).toEqual({ listo: true, faltan: [] });
  });
  it("REQ-1535: no listo si una lámina responde 404 y lo dice con su URL", () => {
    const r = laminasYArticuloListos([
      { url: "https://travelpuzzle.com.mx/blog/mexico/x", status: 200 },
      { url: "https://travelpuzzle.com.mx/blog/img/x/ig-1.jpg", status: 404 },
    ]);
    expect(r.listo).toBe(false);
    expect(r.faltan).toEqual(["https://travelpuzzle.com.mx/blog/img/x/ig-1.jpg"]);
  });
  it("REQ-1535: no listo si una comprobación no obtuvo respuesta", () => {
    const r = laminasYArticuloListos([{ url: "https://travelpuzzle.com.mx/blog/mexico/x", status: null }]);
    expect(r.listo).toBe(false);
    expect(r.faltan).toHaveLength(1);
  });
  it("REQ-1535: cerrado por omisión: sin comprobaciones no hay nada listo", () => {
    expect(laminasYArticuloListos([]).listo).toBe(false);
  });
});
