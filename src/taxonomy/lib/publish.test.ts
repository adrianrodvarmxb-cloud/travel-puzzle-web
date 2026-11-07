import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEFAULT_DICTIONARY as D, DEFAULT_MAPPINGS as M } from "../data/index";
import { catalogClassifier, FORMATOS_PRESENCIALES, isPublishable, taxonomyPublishEnabled } from "./publish";

const c = catalogClassifier(D, M);
const row = (categoryId: number | null, price: number, title = "Visita Alfa", durationMinutes = 120) => ({ categoryId, price, title, durationMinutes });

describe("T3 publicación con la taxonomía (REQ-406, REQ-407, REQ-408, REQ-261)", () => {
  it("REQ-407 bandera TAXONOMY_PUBLISH_ENABLED: solo \"true\" exacto; wrangler.jsonc la trae en \"true\" (REQ-616, gate de encendido)", () => {
    expect(taxonomyPublishEnabled({})).toBe(false);
    expect(taxonomyPublishEnabled({ TAXONOMY_PUBLISH_ENABLED: "1" })).toBe(false);
    expect(taxonomyPublishEnabled({ TAXONOMY_PUBLISH_ENABLED: "true" })).toBe(true);
    expect(readFileSync("wrangler.jsonc", "utf8")).toMatch(/"TAXONOMY_PUBLISH_ENABLED":\s*"true"/);
  });
  it("REQ-406 Free tour: precio 0 salvo las 10 categorías que ganan antes", () => {
    expect(c(row(12, 0)).formato).toBe("pieza-libre");
    for (const id of [8, 17, 20, 24, 26, 28, 29, 30, 31, 35]) expect(c(row(id, 0)).formato).not.toBe("pieza-libre");
  });
  it("REQ-407 / REQ-408 fuera y por-revisar no se publican (G-T10 A); sin categoría, por-revisar (falla cerrada)", () => {
    expect(isPublishable(c(row(8, 5)).formato)).toBe(false);
    expect(isPublishable(c(row(31, 5)).formato)).toBe(false);
    expect(isPublishable(c(row(999, 5)).formato)).toBe(false);
    expect(c(row(null, 5)).formato).toBe("por-revisar");
    expect(isPublishable("por-revisar", "/tours", "B")).toBe(true);
    expect(isPublishable("por-revisar", "/destinos", "B")).toBe(false);
    expect(isPublishable(c(row(12, 15)).formato)).toBe(true);
  });
  it("REQ-261 traslados y transporte de FREETOUR tienen sección traslados", () => {
    expect(c(row(29, 30)).seccion).toBe("traslados");
    expect(c(row(30, 3)).seccion).toBe("traslados");
    expect(c(row(12, 15)).seccion).toBe("experiencias");
  });
  it("REQ-407 la venta cruzada solo sugiere formatos presenciales", () => {
    expect([...FORMATOS_PRESENCIALES]).toEqual(["pieza-libre", "caminata", "tour", "excursion-dia", "experiencia-unica"]);
    for (const id of [8, 17, 29]) expect(FORMATOS_PRESENCIALES).not.toContain(c(row(id, 10)).formato);
  });
  it("REQ-407 memoiza por fila: la misma fila no se clasifica dos veces", () => {
    const r = row(12, 0);
    expect(c(r)).toBe(c(r));
  });
});
