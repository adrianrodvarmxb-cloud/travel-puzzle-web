// REQ-10780: cada bloque sale solo con dato; orden fijo; reglas de FREETOUR.
import { describe, expect, it } from "vitest";
import { BLOCK_ORDER, blocksFor, visibleBlocks, type BlockContext } from "./blocks";
import { fichaEjemplo } from "./fixtures";
import type { FichaModel } from "./model";

const ctx = (o: Partial<BlockContext> = {}): BlockContext => ({ reviews: 0, faq: 0, crossSell: 0, others: 0, milaEnabled: true, freetourFaqEnabled: false, ...o });
const vacia = (): FichaModel => ({
  ...fichaEjemplo(), gallery: [], rating: null, taxonomy: { tipo: null, temas: [], atributos: [] },
  facts: { durationMinutes: null, schedule: null, languages: [], season: null, difficulty: null, ages: null },
  brief: null, highlights: [], descriptionHtml: null, itinerary: [], includes: [], excludes: [], meeting: { kind: "none", title: null },
  price: null, options: [], whatToBring: [], requirements: [], cancellation: null, notes: [], operator: null,
});

describe("REQ-10780: bloques por dato", () => {
  it("REQ-10780: sin datos solo salen los bloques fijos (migas, título, condiciones, garantías); nunca «N/D»", () => {
    expect(visibleBlocks(vacia(), ctx({ milaEnabled: false }))).toEqual(["migas", "titulo", "condiciones", "garantias"]);
    expect(visibleBlocks(vacia(), ctx())).toEqual(["migas", "titulo", "condiciones", "mila", "garantias"]); // Mila no depende del dato, solo de la bandera y del proveedor
  });
  it("REQ-10780: con dato sale cada bloque, en el orden fijo del plan", () => {
    const f: FichaModel = { ...fichaEjemplo(), highlights: ["a"], itinerary: [{ day: 1, title: null, text: "x" }], options: [{ id: "1", name: "A", price: null, transferIncluded: null, startTime: null }, { id: "2", name: "B", price: null, transferIncluded: null, startTime: null }] };
    const out = visibleBlocks(f, ctx({ reviews: 3, faq: 3, crossSell: 1, others: 2 }));
    expect(out).toEqual([...BLOCK_ORDER]);
    const idx = (b: string) => out.indexOf(b as never);
    expect(idx("galeria")).toBeLessThan(idx("descripcion")); expect(idx("preguntas")).toBeLessThan(idx("mila")); expect(idx("otras-experiencias")).toBeLessThan(idx("garantias"));
  });
  it("REQ-10780: opciones solo con más de una; preguntas solo con tres o más; reseñas y venta cruzada solo con tarjetas", () => {
    const una = { ...fichaEjemplo(), options: [{ id: "1", name: "A", price: null, transferIncluded: null, startTime: null }] };
    expect(visibleBlocks(una, ctx())).not.toContain("opciones");
    expect(visibleBlocks(fichaEjemplo(), ctx({ faq: 2 }))).not.toContain("preguntas");
    expect(visibleBlocks(fichaEjemplo(), ctx({ faq: 3 }))).toContain("preguntas");
    expect(visibleBlocks(fichaEjemplo(), ctx({ reviews: 1, crossSell: 1 }))).toEqual(expect.arrayContaining(["resenas", "completa-tu-viaje"]));
  });
  it("REQ-10780: FREETOUR: sin «En breve» (REQ-570), sin Mila (decisión 42) y preguntas solo tras la revisión de cumplimiento", () => {
    const ft: FichaModel = { ...fichaEjemplo(), provider: "freetour", brief: "texto" };
    const out = visibleBlocks(ft, ctx({ faq: 5, milaEnabled: true }));
    expect(out).not.toContain("en-breve"); expect(out).not.toContain("mila"); expect(out).not.toContain("preguntas");
    expect(visibleBlocks(ft, ctx({ faq: 5, freetourFaqEnabled: true }))).toContain("preguntas");
    expect(visibleBlocks(fichaEjemplo(), ctx({ milaEnabled: false }))).not.toContain("mila");
  });
  it("REQ-10780: los traslados usan la misma plantilla con menos bloques", () => {
    const t: FichaModel = { ...fichaEjemplo(), section: "traslados", itinerary: [{ day: 1, title: null, text: "x" }] };
    const out = blocksFor(t, ctx());
    expect(out).not.toContain("itinerario"); expect(out).not.toContain("antes-de-ir"); expect(out).toContain("punto-de-encuentro");
    expect(blocksFor(fichaEjemplo(), ctx())).toContain("antes-de-ir");
  });
});
