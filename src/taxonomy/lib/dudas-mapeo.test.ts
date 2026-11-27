import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import tangol from "../data/mapping/tangol.json";
import { parseMapping } from "../schemas/dictionary";
import { CODIGOS_TANGOL } from "@/tangol/lib/taxonomia";
import {
  GATES_DUDAS_TANGOL,
  MARCA_PENDIENTE,
  cruceDudasGates,
  dudasDelMapeo,
  resumenDudas,
  toursPorCategoria,
  type TipoTangol,
} from "./dudas-mapeo";

// REQ-10688 (ficha única, ola 3, decisión 13 REQ-10592): la lista de dudas del mapeo de Tangol se arma sola desde las notas
// «PENDIENTE PO» de REQ-3502 y la tabla real de tipos; cada duda tiene un gate A/B para la firma del PO (REQ-10689).
const fixture = JSON.parse(readFileSync("tests/fixtures/tangol-tipos-2026-11-12.json", "utf8")) as { toursLeidos: number; tipos: TipoTangol[] };
const mapping = parseMapping(tangol);

describe("REQ-10688: dudas del mapeo de Tangol para la firma del PO", () => {
  it("REQ-10688: toma solo las categorías con la marca «PENDIENTE PO» y recorta la nota a partir de la marca", () => {
    const dudas = dudasDelMapeo(mapping, fixture.tipos);
    expect(dudas.length).toBe(mapping.categorias.filter((c) => (c.nota ?? "").includes(MARCA_PENDIENTE)).length);
    expect(dudas.length).toBeGreaterThan(0);
    for (const d of dudas) {
      expect(d.pendiente).not.toContain(MARCA_PENDIENTE);
      expect(d.pendiente.length).toBeGreaterThan(10);
    }
    expect(dudas.map((d) => d.id)).toContain("9000018"); // Paquetes clásicos: Tour o viaje
    expect(dudas.map((d) => d.id)).not.toContain("9000002"); // Excursiones clásicas no tiene duda
  });

  it("REQ-10688: cuenta los tours de cada duda con los pares reales de Tangol (2,058 válidos + 1 de basura del servidor)", () => {
    const porCat = toursPorCategoria(fixture.tipos);
    const validos = fixture.tipos.filter((t) => !/ERROR/.test(t.subTypeCode)).reduce((a, t) => a + t.tours, 0);
    expect(Object.values(porCat).reduce((a, b) => a + b, 0)).toBe(validos);
    expect(porCat["9000002"]).toBe(845); // 843 TourType 2 + 2 promos
    const dudas = dudasDelMapeo(mapping, fixture.tipos);
    const estancias = dudas.find((d) => d.id === "9000007")!;
    expect(estancias.tours).toBe(13);
    expect(estancias.pares).toEqual(["EXCURSION|ESTANCIAS"]);
    const red = dudas.find((d) => d.id === "9000001")!;
    expect(red.tours).toBe(0); // la red de seguridad no tiene par propio
  });

  it("REQ-10688: cada duda tiene un gate y ningún gate apunta a una categoría sin duda", () => {
    const dudas = dudasDelMapeo(mapping, fixture.tipos);
    expect(cruceDudasGates(dudas)).toEqual({ sinGate: [], sinDuda: [] });
    for (const g of GATES_DUDAS_TANGOL) {
      expect(g.gate).toMatch(/^G-R\d+$/);
      expect(g.a).not.toBe(g.b);
      expect(["A", "B"]).toContain(g.recomendada);
      for (const id of g.categorias) expect(mapping.categorias.map((c) => c.id)).toContain(id);
    }
    expect(new Set(GATES_DUDAS_TANGOL.map((g) => g.gate)).size).toBe(GATES_DUDAS_TANGOL.length);
  });

  it("REQ-10688: el resumen dice cuántos tours tocan las dudas sobre el total leído", () => {
    const r = resumenDudas(mapping, fixture.tipos);
    expect(r.categorias).toBe(34);
    expect(r.dudas).toBe(15);
    expect(r.gates).toBe(GATES_DUDAS_TANGOL.length);
    expect(r.toursTotal).toBe(fixture.toursLeidos);
    expect(r.toursTocados).toBeLessThan(r.toursTotal);
    expect(r.toursTocados).toBeGreaterThan(0);
  });

  it("REQ-10688: no toca ninguna clasificación: el mapeo y la tabla de códigos quedan como estaban", () => {
    const antes = JSON.stringify(tangol);
    dudasDelMapeo(mapping, fixture.tipos);
    expect(JSON.stringify(tangol)).toBe(antes);
    expect(Object.keys(CODIGOS_TANGOL).length).toBe(33);
  });
});
