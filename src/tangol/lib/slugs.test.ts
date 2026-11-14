import { describe, it, expect } from "vitest";
import { slugsFaltantes } from "./slugs";

// REQ-10509: los tours de Tangol se guardaban sin slug (los 1,202 de la carga del 13 nov): sin slug no salen en /destinos,
// sitemaps ni en el árbol de países (todas esas consultas exigen t."slug" IS NOT NULL). Misma regla que Freetour (REQ-086).
describe("REQ-10509: slugs de los tours de Tangol", () => {
  const existentes = [
    { id: "f1", providerId: "freetour", externalId: 10, slug: "free-tour-de-bariloche" },
    { id: "t9", providerId: "tangol", externalId: 9, slug: "ya-tiene" },
  ];
  it("REQ-10509: genera slug desde el título en español (o inglés) solo para los que no tienen, acotado a tangol", () => {
    const out = slugsFaltantes(existentes, [
      { id: "t1", externalId: 1, titleEs: "Tour Privado a Pie por Bariloche", titleEn: "Private walking tour" },
      { id: "t2", externalId: 2, titleEs: "", titleEn: "Ushuaia City Tour" },
    ]);
    expect(out.map((s) => [s.externalId, s.slug])).toEqual([[1, "tour-privado-a-pie-por-bariloche"], [2, "ushuaia-city-tour"]]);
    expect(out.every((s) => s.sql.includes(`"providerId" = ?`) && s.params[1] === "tangol" && s.sql.includes(`"slug" IS NULL`))).toBe(true);
  });
  it("REQ-10509: no repite un slug ya tomado por otro proveedor ni entre tours de Tangol; sin título usa el id", () => {
    const out = slugsFaltantes(existentes, [
      { id: "t3", externalId: 3, titleEs: "Free tour de Bariloche", titleEn: null },
      { id: "t4", externalId: 4, titleEs: "Free tour de Bariloche", titleEn: null },
      { id: "t5", externalId: 5, titleEs: null, titleEn: null },
    ]);
    const slugs = out.map((s) => s.slug);
    expect(new Set([...slugs, "free-tour-de-bariloche"]).size).toBe(4);
    expect(slugs.filter((s) => s.startsWith("free-tour-de-bariloche")).length).toBe(2);
    expect(out.find((s) => s.externalId === 5)?.slug).toBeTruthy();
  });
  it("REQ-10509: el orden de llegada no cambia el resultado", () => {
    const a = [{ id: "t3", externalId: 3, titleEs: "Igual", titleEn: null }, { id: "t4", externalId: 4, titleEs: "Igual", titleEn: null }];
    expect(slugsFaltantes(existentes, a).map((s) => s.slug)).toEqual(slugsFaltantes(existentes, [...a].reverse()).map((s) => s.slug));
  });
});
