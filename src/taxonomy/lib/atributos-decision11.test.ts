import { describe, expect, it } from "vitest";
import { DEFAULT_DICTIONARY as D, DEFAULT_MAPPINGS as M } from "../data/index";
import { classify } from "./classify";
import { DEFAULT_GATES, type Gates } from "./gates";
import type { ClassifyInput } from "./types";

// REQ-10659 (construye la decisión 11, REQ-10590): tres atributos nuevos, siempre por dato real del producto, en es y en:
// «Con traslado», «Día completo» ampliado a toda actividad de 6 h o más y «Cancelación gratuita». Tras el gate
// `atributosDecision11` (apagado = como hoy).
const ON: Gates = { ...DEFAULT_GATES, atributosDecision11: true };
const ft = (categoriaId: number, titulo: string, extra: Partial<ClassifyInput> = {}): ClassifyInput =>
  ({ proveedor: "freetour", categoriaId, precio: 20, durationMinutes: 120, titulo, ...extra });
const tg = (categoriaId: string, titulo: string, extra: Partial<ClassifyInput> = {}): ClassifyInput =>
  ({ proveedor: "tangol", categoriaId, precio: 80, durationMinutes: 480, titulo, ...extra });
const at = (i: ClassifyInput, g: Gates = ON) => classify(i, D, M, g).atributos;
const attr = (slug: string) => D.terminos.find((t) => t.eje === "atributo" && t.slug === slug);

describe("REQ-10659: atributos de la decisión 11, por dato real y tras gate", () => {
  it("REQ-10659: «Con traslado» solo cuando el producto lo declara; nunca por la palabra del título", () => {
    expect(at(tg("9000002", "Excursión a Perito Moreno", { conTraslado: true }))).toContain("con-traslado");
    expect(at(tg("9000002", "Excursión a Perito Moreno con traslado desde el hotel"))).not.toContain("con-traslado");
    expect(at(tg("9000002", "Excursión a Perito Moreno", { conTraslado: false }))).not.toContain("con-traslado");
  });
  it("REQ-10659: «Cancelación gratuita» por dato del producto, aunque la bandera de atributos extra esté apagada", () => {
    expect(ON.atributosExtra).toBe(false);
    expect(at(tg("9000001", "City tour", { cancelacionGratis: true }))).toContain("cancelacion-gratis");
    expect(at(ft(13, "Visita Alfa", { cancelacionGratis: true }))).toContain("cancelacion-gratis");
    expect(at(tg("9000001", "City tour", { cancelacionGratis: false }))).not.toContain("cancelacion-gratis");
    expect(at(tg("9000001", "Cancelación gratuita incluida"))).not.toContain("cancelacion-gratis");
  });
  it("REQ-10659: «Día completo» para toda actividad de 6 h o más, no solo tour, visita guiada y caminata", () => {
    expect(at(tg("9000002", "Excursión", { durationMinutes: 360 }))).toContain("dia-completo");
    expect(at(tg("9000003", "Cabalgata en la estancia", { durationMinutes: 420 }))).toContain("dia-completo");
    expect(at(ft(20, "Entrada con recorrido", { durationMinutes: 400 }))).toContain("dia-completo");
    expect(at(ft(17, "Audioguía", { durationMinutes: 420 }))).toContain("dia-completo");
    expect(at(tg("9000003", "Cabalgata corta", { durationMinutes: 359 }))).not.toContain("dia-completo");
  });
  it("REQ-10659: un traslado, un transporte o un circuito de varios días nunca son «Día completo»", () => {
    expect(at(tg("9000011", "Traslado aeropuerto", { durationMinutes: 480 }))).not.toContain("dia-completo");
    expect(at(ft(30, "Bus turístico", { durationMinutes: 480 }))).not.toContain("dia-completo");
    expect(at(ft(26, "Alquiler de bici", { durationMinutes: 480 }))).not.toContain("dia-completo");
    expect(at({ proveedor: "propios", categoriaId: "circuito", precio: 900, durationDays: 5, durationMinutes: 7200, titulo: "Perú en 5 días" })).not.toContain("dia-completo");
  });
  it("REQ-10659: con el gate apagado todo sigue como hoy (caracterización)", () => {
    const off = DEFAULT_GATES;
    expect(off.atributosDecision11).toBe(false);
    expect(at(tg("9000002", "Excursión", { conTraslado: true, cancelacionGratis: true, durationMinutes: 480 }), off)).not.toContain("con-traslado");
    expect(at(tg("9000002", "Excursión", { cancelacionGratis: true }), off)).not.toContain("cancelacion-gratis");
    expect(at(tg("9000003", "Cabalgata", { durationMinutes: 420 }), off)).not.toContain("dia-completo");
    expect(at(ft(13, "Visita larga", { durationMinutes: 420 }), off)).toContain("dia-completo");
  });
  it("REQ-10659: los tres términos existen en el diccionario en español e inglés", () => {
    expect(attr("con-traslado")).toMatchObject({ termino_es: "Con traslado", termino_en: "With transfer", estado: "tras_bandera" });
    expect(attr("dia-completo")).toMatchObject({ termino_es: "Día completo", termino_en: "Full day" });
    expect(attr("cancelacion-gratis")).toMatchObject({ termino_es: "Cancelación gratuita", termino_en: "Free cancellation" });
  });
});
