import { describe, expect, it } from "vitest";
import { DEFAULT_DICTIONARY as D } from "../data/index";
import { FORMATO_LABEL } from "./filters";
import { tourLabels } from "./copy";
import { tripCopy } from "@/trips/lib/copy";

/**
 * REQ-10700 (PO, chat 15-11-2026): «Dame opciones mas claras para la categoria momentos de autor» → eligió
 * «Actividades (Recomendado)». Reemplaza el nombre firmado el 6-11 (REQ-230, REQ-174). El slug no cambia.
 */
describe("REQ-10700 «Momentos de autor» pasa a llamarse «Actividades»", () => {
  const e = D.terminos.find((t) => t.slug === "experiencia-unica")!;
  it("REQ-10700: el término del diccionario es «Actividades» / «Activities» y el slug sigue siendo experiencia-unica", () => {
    expect(e).toMatchObject({ slug: "experiencia-unica", termino_es: "Actividades", termino_en: "Activities" });
    expect(e.nombres).toEqual({ pt: "Atividades", de: "Aktivitäten", fr: "Activités", it: "Attività" });
  });
  it("REQ-10700: el nombre anterior sigue como sinónimo para el buscador", () => {
    expect(e.sinonimos).toEqual(expect.arrayContaining(["momentos de autor", "signature moments", "actividades", "activities"]));
  });
  it("REQ-10700: filtro, etiqueta de la ficha y chip de viajes dicen «Actividades» / «Activities»", () => {
    expect(FORMATO_LABEL["experiencia-unica"]).toMatchObject({ es: "Actividades", en: "Activities" });
    expect(tourLabels("experiencia-unica")).toEqual(["Actividades"]);
    expect(tripCopy("es").filterExp).toBe("Actividades");
    expect(tripCopy("en").filterExp).toBe("Activities");
  });
  it("REQ-10700: ningún nombre visible del diccionario conserva «Momentos de autor» ni «Signature moments»", () => {
    const visibles = D.terminos.flatMap((t) => [t.termino_es, t.termino_en, (t as { etiqueta_corta_es?: string }).etiqueta_corta_es, (t as { etiqueta_corta_en?: string }).etiqueta_corta_en]);
    expect(visibles).not.toContain("Momentos de autor");
    expect(visibles).not.toContain("Signature moments");
  });
});
