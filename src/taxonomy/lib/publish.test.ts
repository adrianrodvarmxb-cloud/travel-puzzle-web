import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEFAULT_DICTIONARY as D, DEFAULT_MAPPINGS as M } from "../data/index";
import { catalogClassifier, FORMATOS_PRESENCIALES, isPublishable, taxonomyPublishEnabled } from "./publish";
import { tourToInput } from "./run-plan";

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
    // REQ-1261: la 8 ya no está en la lista (un free tour presencial de la 8 es Pieza libre)
    for (const id of [17, 20, 24, 26, 28, 29, 30, 31, 35]) expect(c(row(id, 0)).formato).not.toBe("pieza-libre");
  });
  it("REQ-407 / REQ-408 fuera y por-revisar no se publican (G-T10 A); sin categoría, por-revisar (falla cerrada)", () => {
    expect(isPublishable(c({ ...row(8, 5), title: "Tour virtual en vivo" }).formato)).toBe(false); // REQ-1262: en línea no va a /destinos
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
    expect([...FORMATOS_PRESENCIALES]).toEqual(["pieza-libre", "caminata", "visita-guiada", "tour", "excursion-dia", "experiencia-unica"]); // REQ-1250
    for (const id of [17, 29]) expect(FORMATOS_PRESENCIALES).not.toContain(c(row(id, 10)).formato);
    expect(FORMATOS_PRESENCIALES).not.toContain(c({ ...row(8, 10), title: "Asesoramiento por chat" }).formato); // REQ-1262
  });
  it("REQ-407 memoiza por fila: la misma fila no se clasifica dos veces", () => {
    const r = row(12, 0);
    expect(c(r)).toBe(c(r));
  });
});

/** REQ-3502: el clasificador del catálogo usa el proveedor de la fila (Tour.providerId); antes trataba todo como FREETOUR. */
describe("REQ-3502 catalogClassifier clasifica con el mapeo del proveedor de la fila", () => {
  it("REQ-3502: una fila de Tangol usa mapping/tangol.json (9000011 = TRASLADO|IN → traslado)", () => {
    const r = catalogClassifier(D, M)({ providerId: "tangol", categoryId: 9_000_011, price: 40, durationMinutes: 60, title: "Traslado Desde Aeropuerto A Hotel Céntrico" });
    expect(r.formato).toBe("traslado");
    expect(r.seccion).toBe("traslados");
  });
  it("REQ-3502: sin providerId (filas viejas, base con el valor por defecto) sigue siendo FREETOUR", () => {
    const k = catalogClassifier(D, M);
    expect(k(row(29, 30)).formato).toBe("traslado");
    expect(k({ ...row(29, 30), providerId: null }).formato).toBe("traslado");
    expect(k({ ...row(9_000_011, 30), providerId: "freetour" }).formato).toBe("por-revisar");
  });
  it("REQ-3502: un proveedor sin mapeo cae en «por-revisar» (falla cerrada), no en el mapeo de FREETOUR", () => {
    expect(catalogClassifier(D, M)({ ...row(12, 15), providerId: "otro" }).formato).toBe("por-revisar");
  });
  it("REQ-3502: el recálculo (tourToInput) también usa el proveedor de la fila", () => {
    const base = { id: "x", categoryId: 9_000_028, priceValue: 80, durationMinutes: 120, titleEs: "Cirque Du Soleil", titleEn: null, briefEs: null, briefEn: null, guideLanguages: null, rating: null, reviewsNumber: 0 };
    expect(tourToInput({ ...base, providerId: "tangol" }).proveedor).toBe("tangol");
    expect(tourToInput(base).proveedor).toBe("freetour");
  });
});
