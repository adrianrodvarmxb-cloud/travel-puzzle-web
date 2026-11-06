import { describe, expect, it } from "vitest";
import { DEFAULT_DICTIONARY as D, DEFAULT_MAPPINGS as M } from "../data/index";
import { classify } from "./classify";
import * as G from "./gates";

describe("REQ-260 gates abiertos: una constante por gate con la recomendación del plan", () => {
  it("REQ-260 valores por defecto = recomendación del plan (firmada por recomendación, 6-11 07:04)", () => {
    expect({
      G2: G.GATE_G2_CAMINATA, G3: G.GATE_G3_TEMAS, GT1: G.GATE_GT1_FAVORITO, GT2: G.GATE_GT2_MEXICO, GT4: G.GATE_GT4_FRANJA, GT5: G.GATE_GT5_ALMACEN,
      GT7: G.GATE_GT7_EXCURSION, GT8: G.GATE_GT8_DIFICULTAD, GT9: G.GATE_GT9_TITLE, GT10: G.GATE_GT10_POR_REVISAR, GT11: G.GATE_GT11_AUTOGUIADO,
    }).toEqual({ G2: "A", G3: "A", GT1: "A", GT2: "A", GT4: "A", GT5: "A", GT7: "A", GT8: "A", GT9: "A", GT10: "A", GT11: "A" });
    expect(G.FAVORITO_CRITERIO.A).toEqual({ minCalificacion: 4.7, minResenas: 50 });
    expect(G.GATE_GT3_METAS).toMatchObject({ pctConFormato: 100, pctPresencialesSinTemaMax: 5, categoriasPorRevisarMax: 0, precisionTemaMin: 90, chipsEnCeroMax: 0 });
    expect(G.DEFAULT_GATES.atributosExtra).toBe(false);
  });
  it("REQ-260 G-T7 B: ≥360 min sin palabra de salida ya es excursión", () => {
    const i = { proveedor: "freetour", categoriaId: 19, precio: 40, durationMinutes: 400, titulo: "City ride" };
    expect(classify(i, D, M).formato).toBe("tour");
    expect(classify(i, D, M, { ...G.DEFAULT_GATES, excursion: "B" }).formato).toBe("excursion-dia");
  });
  it("REQ-260 G-T10: A no se ve en ningún lado; B solo en /tours", () => {
    expect(G.porRevisarVisibleEn("A")).toEqual([]);
    expect(G.porRevisarVisibleEn("B")).toEqual(["/tours"]);
  });
  it("REQ-260 G-T1 B y C cambian el mínimo de reseñas del favorito", () => {
    const i = { proveedor: "freetour", categoriaId: 12, precio: 0, titulo: "x", calificacion: 4.8, resenas: 30 };
    expect(classify(i, D, M).atributos).not.toContain("favorito");
    expect(classify(i, D, M, { ...G.DEFAULT_GATES, favorito: "B" }).atributos).toContain("favorito");
  });
  it("REQ-260 D-T1: con palabrasAntesDeFree=false un free de la 13 con «ticket» es Free tour (REQ-406 literal)", () => {
    const i = { proveedor: "freetour", categoriaId: 13, precio: 0, titulo: "Free tour with ticket info" };
    expect(classify(i, D, M).formato).toBe("entradas");
    expect(classify(i, D, M, { ...G.DEFAULT_GATES, palabrasAntesDeFree: false }).formato).toBe("pieza-libre");
  });
});
