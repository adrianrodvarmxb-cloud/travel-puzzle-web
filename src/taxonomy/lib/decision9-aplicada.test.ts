import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEFAULT_DICTIONARY as D, DEFAULT_MAPPINGS as M } from "../data/index";
import { veredictoDecision9 } from "./aventura-senderismo";
import { classify } from "./classify";
import { DEFAULT_GATES, GATE_D9_SENDERISMO, type Gates } from "./gates";
import type { ClassifyInput } from "./types";

// REQ-10662 (aplica la decisión 9, REQ-10588, con la lista firmada por el PO el 15 nov 2026, REQ-10661: G-A1 a G-A4 = A).
// El fixture son los 350 tours reales de «Excursiones de aventura» de Tangol (9000003) y «Tours de aventura» de FREETOUR (16)
// leídos de D1 el 15 nov 2026 (títulos públicos): la lista «antes y después» vive aquí, no en tmp/.
interface Fila { proveedor: string; ciudad: string; minutos: number; titulo: string }
const filas: Fila[] = readFileSync("tests/fixtures/tangol/aventura-decision9-2026-11-15.tsv", "utf8").split(/\r?\n/).slice(1).filter(Boolean).map((l) => {
  const [p, ci, d, ti] = l.split("\t");
  return { proveedor: p, ciudad: ci, minutos: Number(d), titulo: ti };
});
const input = (f: Fila): ClassifyInput => ({
  proveedor: f.proveedor, categoriaId: f.proveedor === "tangol" ? "9000003" : 16, precio: f.proveedor === "tangol" ? 80 : 20,
  durationMinutes: f.minutos, titulo: f.titulo, ciudades: [f.ciudad],
});
const ANTES: Gates = { ...DEFAULT_GATES, senderismo: "B" };
const DESPUES: Gates = { ...DEFAULT_GATES, senderismo: "A" };

describe("REQ-10662: la decisión 9 aplicada al clasificador (fixture real, antes y después)", () => {
  it("REQ-10662: el gate D9 está en A (firma del PO, 15 nov 2026) y el fixture trae los 350 tours", () => {
    expect(GATE_D9_SENDERISMO).toBe("A");
    expect(filas).toHaveLength(350);
    expect(filas.filter((f) => f.proveedor === "tangol")).toHaveLength(274);
  });
  it("REQ-10662: los 77 de la lista firmada salen como Excursión de un día con Aventura y Montaña y senderismo; ni uno más", () => {
    const cambian = filas.filter((f) => veredictoDecision9(f.titulo, f.minutos).veredicto === "cambia");
    expect(cambian).toHaveLength(77);
    for (const f of cambian) {
      const r = classify(input(f), D, M, DESPUES);
      expect(r.formato, f.titulo).toBe("excursion-dia");
      expect(r.reglaFormato, f.titulo).toMatch(/^#8 decisión 9:/);
      expect(r.temas.slice(0, 2), f.titulo).toEqual(["aventura", "montana-senderismo"]);
      expect(r.temas.length, f.titulo).toBeLessThanOrEqual(3);
    }
    const porDecision9 = filas.filter((f) => classify(input(f), D, M, DESPUES).reglaFormato.startsWith("#8 decisión 9:"));
    expect(porDecision9.map((f) => f.titulo).sort()).toEqual(cambian.map((f) => f.titulo).sort());
  });
  it("REQ-10662: los que se quedan y las dudas clasifican exactamente igual que antes (G-A3, G-A4)", () => {
    const resto = filas.filter((f) => veredictoDecision9(f.titulo, f.minutos).veredicto !== "cambia");
    expect(resto).toHaveLength(273);
    for (const f of resto) {
      const a = classify(input(f), D, M, ANTES);
      const d = classify(input(f), D, M, DESPUES);
      expect({ formato: d.formato, temas: d.temas }, f.titulo).toEqual({ formato: a.formato, temas: a.temas });
    }
    const freetour = filas.filter((f) => f.proveedor === "freetour");
    expect(freetour).toHaveLength(76);
    expect(freetour.filter((f) => classify(input(f), D, M, DESPUES).reglaFormato.startsWith("#8 decisión 9:"))).toHaveLength(0);
  });
  it("REQ-10662: antes y después, en números: cuántos tours de Tangol dejan Momentos de autor", () => {
    const tangol = filas.filter((f) => f.proveedor === "tangol");
    const antes = tangol.filter((f) => classify(input(f), D, M, ANTES).formato === "experiencia-unica").length;
    const despues = tangol.filter((f) => classify(input(f), D, M, DESPUES).formato === "experiencia-unica").length;
    const excAntes = tangol.filter((f) => classify(input(f), D, M, ANTES).formato === "excursion-dia").length;
    const excDespues = tangol.filter((f) => classify(input(f), D, M, DESPUES).formato === "excursion-dia").length;
    // Algunos ya eran Excursión de un día por su propia palabra de salida («desde»); el resto lo mueve la decisión 9.
    expect(excDespues - excAntes).toBe(antes - despues);
    expect(excDespues - excAntes).toBeGreaterThan(0);
    expect(excDespues - excAntes).toBeLessThanOrEqual(77);
  });
  it("REQ-10662: con el gate en B todo vuelve a ser como antes (regreso)", () => {
    const r = classify(input({ proveedor: "tangol", ciudad: "el-calafate", minutos: 600, titulo: "Minitrekking Glaciar Perito Moreno" }), D, M, ANTES);
    expect(r.formato).toBe("experiencia-unica");
    const d = classify(input({ proveedor: "tangol", ciudad: "el-calafate", minutos: 600, titulo: "Minitrekking Glaciar Perito Moreno" }), D, M, DESPUES);
    expect(d).toMatchObject({ formato: "excursion-dia", temas: ["aventura", "montana-senderismo", "naturaleza"] });
  });
});
