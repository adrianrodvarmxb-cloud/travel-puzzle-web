/**
 * REQ-10699 (ficha única, ola 3, gate G-R2 firmado por el PO «3 … Encender «Alquiler» y moverlos», 15-11-2026): el formato
 * `alquiler` («Renta» / «Rentals») sale de `tras_bandera` y queda `activo`; el alquiler de equipo de ski y snowboard de
 * Tangol 9000003 (Excursiones de aventura) pasa a Renta por la palabra del título («alquiler», «rental», «renta de»),
 * regla permitida solo donde el mapeo la declara. Las categorías ALQUILERES de Tangol (9000032, 9000033) y FREETOUR 26
 * siguen con base `alquiler` y ahora se publican en la sección Traslados (REQ-261), nunca en /tours.
 * Regla del PO REQ-10709: la palabra vale para cualquier proveedor cuya categoría permita la regla.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEFAULT_DICTIONARY as D, DEFAULT_MAPPINGS as M } from "../data/index";
import { CODIGOS_TANGOL } from "../../tangol/lib/taxonomia";
import { classify } from "./classify";
import { FORMATOS_FILTRO } from "./filters";
import { formatoTerm } from "./format";
import { catalogClassifier, isPublishable } from "./publish";
import type { ClassifyInput } from "./types";

const tangol = (clave: string, titulo: string, minutos = 180): ClassifyInput =>
  ({ proveedor: "tangol", categoriaId: CODIGOS_TANGOL[clave], precio: 80, durationMinutes: minutos, titulo });
const ft = (categoriaId: number, titulo: string, precio = 20): ClassifyInput =>
  ({ proveedor: "freetour", categoriaId, precio, durationMinutes: 120, titulo });

describe("REQ-10699 formato «Renta» encendido y alquiler de equipo de Tangol", () => {
  it("REQ-10699: el diccionario tiene `alquiler` activo, en la sección Traslados, con sus palabras de título", () => {
    const t = formatoTerm(D, "alquiler");
    expect(t.estado).toBe("activo");
    expect(t.seccion).toBe("traslados");
    expect(t).toMatchObject({ termino_es: "Renta", termino_en: "Rentals" });
    expect(t.palabras).toEqual(expect.arrayContaining(["alquiler", "rental"]));
  });

  it("REQ-10699: Tangol 9000003 permite la regla por palabra «alquiler» y el equipo de ski y snowboard sale como Renta", () => {
    const cat = M.tangol.categorias.find((c) => c.id === "9000003")!;
    expect(cat.reglasPorPalabra).toContain("alquiler");
    for (const titulo of ["Alquiler Equipo De Ski", "Alquiler Equipo De Snowboard", "Alquiler De Bicicleta", "Ski equipment rental"]) {
      const r = classify(tangol("EXCURSION|AVENTURA", titulo, 360), D, M);
      expect(r.formato, titulo).toBe("alquiler");
      expect(r.reglaFormato, titulo).toMatch(/^#3 palabra alquiler/);
      expect(r.seccion, titulo).toBe("traslados");
    }
  });

  it("REQ-10699: lo demás de 9000003 no cambia (mountain bike sigue siendo Actividades; la caminata con guía, Excursión de un día)", () => {
    expect(classify(tangol("EXCURSION|AVENTURA", "Circuito Chico En Mountain Bike", 240), D, M).formato).toBe("experiencia-unica");
    expect(classify(tangol("EXCURSION|AVENTURA", "Minitrekking Glaciar Perito Moreno", 600), D, M).formato).toBe("excursion-dia");
    // Límite de palabra: «rentable» o «alquilerías» no son renta.
    expect(classify(tangol("EXCURSION|AVENTURA", "Trekking rentable al cerro", 240), D, M).formato).not.toBe("alquiler");
  });

  it("REQ-10699: la palabra solo vale donde el mapeo la permite; las bases ALQUILERES de Tangol y FREETOUR 26 ya eran Renta", () => {
    // Una visita guiada que menciona «alquiler» en una categoría que no permite la regla sigue igual.
    expect(classify(ft(12, "Paseo con alquiler de audioguía incluido"), D, M).formato).not.toBe("alquiler");
    expect(classify(tangol("ALQUILERES|ALQUILER POR HORA", "Alquiler De Scooter", 60), D, M).formato).toBe("alquiler");
    expect(classify(tangol("ALQUILERES|ALQUILERDEAUTO", "Alquiler De Buggy Playero", 480), D, M).formato).toBe("alquiler");
    expect(classify(ft(26, "Bike rental in Lisbon"), D, M).formato).toBe("alquiler");
    for (const id of ["9000032", "9000033"]) expect(M.tangol.categorias.find((c) => c.id === id)!.estado, id).toBe("activo");
  });

  it("REQ-10699: Renta se publica (sección Traslados de la ciudad) y no es un tipo de /tours", () => {
    expect(isPublishable("alquiler", "/destinos")).toBe(true);
    expect(FORMATOS_FILTRO as readonly string[]).not.toContain("alquiler");
    const clasifica = catalogClassifier(D, M);
    const c = clasifica({ providerId: "tangol", categoryId: 9_000_003, price: 60, durationMinutes: 480, title: "Alquiler Equipo De Ski", cities: ["bariloche"] });
    expect(c).toMatchObject({ formato: "alquiler", seccion: "traslados", guiaEnPersona: false });
  });

  it("REQ-10699: antes y después con el fixture real de aventura (350 tours): solo los alquileres cambian a Renta", () => {
    const filas = readFileSync("tests/fixtures/tangol/aventura-decision9-2026-11-15.tsv", "utf8").split(/\r?\n/).slice(1).filter(Boolean).map((l) => {
      const [p, ci, d, ti] = l.split("\t");
      return { proveedor: p, ciudad: ci, minutos: Number(d), titulo: ti };
    });
    const renta = filas.filter((f) => classify({ proveedor: f.proveedor, categoriaId: f.proveedor === "tangol" ? "9000003" : 16, precio: 80, durationMinutes: f.minutos, titulo: f.titulo, ciudades: [f.ciudad] }, D, M).formato === "alquiler");
    // Los dos alquileres de bicicleta de Tangol (Colonia y Paraty) son los únicos títulos de alquiler en la lista.
    expect(renta.map((f) => `${f.ciudad}: ${f.titulo}`).sort()).toEqual(["colonia: Alquiler De Bicicleta", "paraty: Alquiler De Bicicleta"]);
    expect(filas.filter((f) => /alquiler|rental/i.test(f.titulo))).toHaveLength(renta.length);
  });
});
