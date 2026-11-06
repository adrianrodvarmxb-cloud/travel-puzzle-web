import { describe, expect, it } from "vitest";
import { DEFAULT_DICTIONARY as D, DEFAULT_MAPPINGS as M } from "../data/index";
import { PARES_EXCLUYENTES } from "./attributes";
import { classify } from "./classify";
import { DEFAULT_GATES } from "./gates";
import { ATRIBUTOS_EXTRA, type ClassifyInput } from "./types";

const ft = (categoriaId: number, titulo: string, extra: Partial<ClassifyInput> = {}): ClassifyInput =>
  ({ proveedor: "freetour", categoriaId, precio: 20, durationMinutes: 120, titulo, ...extra });
const at = (i: ClassifyInput, g = DEFAULT_GATES) => classify(i, D, M, g).atributos;

describe("REQ-417 atributos activos solo con dato", () => {
  it("REQ-417 privado por el título del proveedor o por la opción privada del viaje", () => {
    expect(at(ft(13, "Private tour of Rome"))).toContain("privado");
    expect(at(ft(13, "Tour privado por Roma"))).toContain("privado");
    expect(at({ proveedor: "propios", categoriaId: "tour", precio: 100, durationDays: 1, titulo: "Lima", modos: ["group", "private"] })).toContain("privado");
    expect(at(ft(13, "Visita Alfa"))).not.toContain("privado");
  });
  it("REQ-417 nocturno por la categoría 7 o por el título", () => {
    expect(at(ft(7, "Visita Alfa"))).toContain("nocturno");
    expect(at(ft(12, "Free tour nocturno"))).toContain("nocturno");
    expect(at(ft(12, "Barcelona by night"))).toContain("nocturno");
    expect(at(ft(12, "Visita Alfa"))).not.toContain("nocturno");
  });
  it("REQ-417 un solo medio: gana la palabra del título; si no, el de la categoría", () => {
    expect(at(ft(12, "Visita Alfa"))).toContain("medio:a-pie");
    expect(at(ft(12, "Bike tour de Ámsterdam"))).toEqual(expect.arrayContaining(["medio:bici"]));
    expect(at(ft(12, "Bike tour de Ámsterdam")).filter((a) => a.startsWith("medio:"))).toHaveLength(1);
    expect(at(ft(19, "Visita Alfa"))).toContain("medio:vehiculo");
    expect(at(ft(13, "Paseo en barco"))).toContain("medio:barco");
    expect(at(ft(13, "Visita Alfa")).some((a) => a.startsWith("medio:"))).toBe(false);
  });
  it("REQ-417 «en español» solo si el evento o el viaje lo declaran", () => {
    expect(at(ft(12, "Free tour en español"))).not.toContain("idioma-es");
    expect(at(ft(12, "Visita", { idiomas: ["en", "es"] }))).toContain("idioma-es");
  });
  it("REQ-417 calificación solo con reseñas reales; favorito según G-T1 A (≥4.7 y ≥50)", () => {
    expect(at(ft(12, "x", { calificacion: 4.9, resenas: 0 }))).not.toContain("calificacion");
    expect(at(ft(12, "x", { calificacion: 4.6, resenas: 10 }))).toContain("calificacion");
    expect(at(ft(12, "x", { calificacion: 4.7, resenas: 50 }))).toContain("favorito");
    expect(at(ft(12, "x", { calificacion: 4.7, resenas: 49 }))).not.toContain("favorito");
    expect(at(ft(12, "x", { calificacion: 4.69, resenas: 500 }))).not.toContain("favorito");
  });
  it("REQ-417 vuelo incluido solo con flightsIncluded", () => {
    expect(at({ proveedor: "propios", categoriaId: "circuito", precio: 1, titulo: "Con vuelo incluido", vueloIncluido: false })).not.toContain("vuelo-incluido");
    expect(at({ proveedor: "propios", categoriaId: "circuito", precio: 1, titulo: "x", vueloIncluido: true })).toContain("vuelo-incluido");
  });
  it("REQ-418 con la bandera apagada no sale ningún atributo sin dato, aunque esté declarado", () => {
    const todos = Object.fromEntries(ATRIBUTOS_EXTRA.map((a) => [a, true]));
    const off = at(ft(12, "Small group family accessible tour", { declarados: todos }));
    for (const a of ATRIBUTOS_EXTRA) expect(off).not.toContain(a);
  });
  it("REQ-418 con la bandera encendida solo sale lo declarado; «accesible» nunca se infiere; nada de confirmación inmediata en FREETOUR", () => {
    const on = { ...DEFAULT_GATES, atributosExtra: true };
    expect(at(ft(12, "Wheelchair accessible tour"), on)).not.toContain("accesible");
    expect(at(ft(12, "x", { declarados: { accesible: true } }), on)).toContain("accesible");
    expect(at(ft(12, "x", { declarados: { "confirmacion-inmediata": true } }), on)).not.toContain("confirmacion-inmediata");
  });
});

describe("REQ-419 pares excluyentes", () => {
  it("REQ-419 los 3 pares del pedido", () => {
    expect(PARES_EXCLUYENTES.map((p) => [p.queda, p.sale])).toEqual([["autoguiado", "guiado"], ["privado", "grupo-pequeno"], ["solo-adultos", "familias"]]);
  });
  it("REQ-419 guiado/autoguiado: un juego autoguiado en una categoría guiada queda autoguiado y se avisa", () => {
    const r = classify(ft(13, "Juego de exploración autoguiado"), D, M);
    expect(r.atributos).toContain("autoguiado");
    expect(r.atributos).not.toContain("guiado");
    expect(r.avisos).toContain("choque autoguiado/guiado: queda autoguiado");
    expect(at(ft(17, "Audioguía de Roma"))).not.toContain("guiado");
    expect(at(ft(12, "Visita"))).toContain("guiado");
  });
  it("REQ-419 privado/grupo pequeño y familias/solo adultos nunca juntos", () => {
    const on = { ...DEFAULT_GATES, atributosExtra: true };
    const r = at(ft(13, "Private tour", { declarados: { "grupo-pequeno": true, familias: true, "solo-adultos": true } }), on);
    expect(r).toContain("privado"); expect(r).not.toContain("grupo-pequeno");
    expect(r).toContain("solo-adultos"); expect(r).not.toContain("familias");
  });
});
