import { describe, it, expect } from "vitest";
import { queryCatalog, type CatalogEntry } from "./query";

const e = (id: string, formato: string, temas: string[], atributos: string[]): CatalogEntry => ({
  id, cityId: 1, countryId: 1, categoryId: 12, price: 0, rating: 4.8, reviews: 10, durationMinutes: 120,
  createdAt: 0, updatedAt: 0, text: id, formato, temas, atributos,
});
const all = [
  e("a", "caminata", ["gastronomia"], ["a-pie", "nocturno"]),
  e("b", "caminata", ["cultural"], ["a-pie"]),
  e("c", "tour", ["gastronomia", "cultural"], ["barco"]),
  e("d", "pieza-libre", [], []),
];
const q = (f: Record<string, unknown>) => queryCatalog(all, { taxonomy: true, ...f }, { limit: 50 });

describe("REQ-1421: ?tema= filtra /tours", () => {
  it("REQ-1421: un tema o varios (cualquiera de ellos)", () => {
    expect(q({ temas: ["gastronomia"] }).ids.sort()).toEqual(["a", "c"]);
    expect(q({ temas: ["gastronomia", "cultural"] }).ids.sort()).toEqual(["a", "b", "c"]);
  });
  it("REQ-1421: conteos por tema con el resto de los filtros, sin contar el propio tema", () => {
    const r = q({ temas: ["gastronomia"], formatos: ["caminata"] });
    expect(r.ids).toEqual(["a"]);
    expect(r.temaCounts).toEqual({ gastronomia: 1, cultural: 1 });
  });
});

describe("REQ-1422: ?atrib= filtra /tours", () => {
  it("REQ-1422: cada atributo marcado se exige (y)", () => {
    expect(q({ atributos: ["a-pie"] }).ids.sort()).toEqual(["a", "b"]);
    expect(q({ atributos: ["a-pie", "nocturno"] }).ids).toEqual(["a"]);
  });
  it("REQ-1422: conteos por atributo y los chips de tipo respetan tema y atributo", () => {
    const r = q({ atributos: ["a-pie"] });
    expect(r.atribCounts).toEqual({ "a-pie": 2, nocturno: 1 });
    expect(r.formatCounts).toEqual({ caminata: 2 });
    expect(q({ temas: ["gastronomia"] }).formatCounts).toEqual({ caminata: 1, tour: 1 });
  });
  it("REQ-1422: sin taxonomía no filtra ni cuenta", () => {
    const r = queryCatalog(all, { temas: ["gastronomia"], atributos: ["barco"] }, { limit: 50 });
    expect(r.total).toBe(4);
    expect(r.temaCounts).toBeUndefined();
  });
});
