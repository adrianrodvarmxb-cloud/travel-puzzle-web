import { describe, expect, it } from "vitest";
import { DEFAULT_DICTIONARY as D, DEFAULT_MAPPINGS as M } from "../data/index";
import { parseMapping } from "../schemas/dictionary";
import { classify } from "./classify";
import type { ClassifyInput } from "./types";

const input: ClassifyInput = { proveedor: "freetour", categoriaId: 12, precio: 0, durationMinutes: 120, titulo: "Free tour por el barrio judío | Jewish quarter free tour", resumen: "" };

describe("REQ-405 clasificador puro", () => {
  it("REQ-405 determinista: misma entrada, misma salida, sin mutar la entrada", () => {
    const frozen = Object.freeze({ ...input });
    const a = classify(frozen, D, M);
    const b = classify(frozen, D, M);
    expect(a).toEqual(b);
    expect(a).toMatchObject({ formato: "pieza-libre", seccion: "experiencias", temas: ["cultural", "urbano"] });
    expect(a.reglasTemas.every((r) => r.regla.length > 0)).toBe(true);
  });
  it("REQ-405 un cambio solo de título recalcula temas; el resultado no trae slug ni content_hash", () => {
    const a = classify(input, D, M);
    const b = classify({ ...input, titulo: "Free tour gastronómico | Food free tour" }, D, M);
    expect(a.formato).toBe(b.formato);
    expect(b.temas).toEqual(["gastronomia", "urbano"]);
    for (const r of [a, b]) for (const k of ["slug", "contentHash", "content_hash"]) expect(k in r).toBe(false);
  });
  it("REQ-405 proveedor sin mapeo → por-revisar con aviso", () => {
    const r = classify({ ...input, proveedor: "viator" }, D, M);
    expect(r.formato).toBe("por-revisar");
    expect(r.reglaFormato).toBe("proveedor sin mapeo: viator");
  });
});

describe("REQ-404 proveedor nuevo = solo su mapeo", () => {
  const ficticio = parseMapping({
    proveedor: "ficticio", version: "test", revisado: "test", precioCeroEsPiezaLibre: false, permiteConfirmacionInmediata: true,
    categorias: [
      { id: "museum", nombre_es: "Museo", nombre_en: "Museum", formato: "entradas", temas: ["cultural"], atributos: [], reglasPorPalabra: [], estado: "activo" },
      { id: "walk", nombre_es: "Caminata", nombre_en: "Walk", formato: "caminata", temas: ["urbano"], atributos: ["medio:a-pie"], reglasPorPalabra: [], estado: "activo" },
      { id: "online", nombre_es: "Online", nombre_en: "Online", formato: "fuera", temas: [], atributos: [], reglasPorPalabra: [], estado: "oculto" },
    ],
  });
  const mappings = { ...M, ficticio };
  const p = (categoriaId: string, precio: number): ClassifyInput => ({ proveedor: "ficticio", categoriaId, precio, durationMinutes: 90, titulo: "Visita Alfa" });
  it("REQ-404 clasifica con el mismo clasificador y el mismo diccionario", () => {
    expect(classify(p("museum", 15), D, mappings)).toMatchObject({ formato: "entradas", temas: ["cultural"] });
    expect(classify(p("walk", 0), D, mappings)).toMatchObject({ formato: "caminata", atributos: expect.arrayContaining(["medio:a-pie"]) });
    expect(classify(p("online", 5), D, mappings).formato).toBe("fuera");
    expect(classify(p("nueva", 5), D, mappings).formato).toBe("por-revisar");
  });
  it("REQ-404 un mapeo con categoría repetida o formato inexistente no pasa Zod", () => {
    const cat = { id: "a", nombre_es: "", nombre_en: "", formato: "tour", temas: [], atributos: [], reglasPorPalabra: [], estado: "activo" };
    const base = { proveedor: "x", version: "1", revisado: "1", precioCeroEsPiezaLibre: false, permiteConfirmacionInmediata: false };
    expect(() => parseMapping({ ...base, categorias: [cat, cat] })).toThrow(/repetida/);
    expect(() => parseMapping({ ...base, categorias: [{ ...cat, formato: "safari" }] })).toThrow();
    expect(() => parseMapping({ ...base, categorias: [{ ...cat, temas: ["lujo"] }] })).toThrow();
  });
});
