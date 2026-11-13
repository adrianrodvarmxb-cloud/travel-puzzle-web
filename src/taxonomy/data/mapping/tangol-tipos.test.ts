import { describe, expect, it } from "vitest";
import { DEFAULT_DICTIONARY as D, DEFAULT_MAPPINGS as M } from "../index";
import { classify } from "../../lib/classify";
import { cartTypeFor } from "../../lib/cart-type";
import { reporteCobertura } from "../../lib/cobertura";
import { CATEGORIA_TANGOL_SIN_TIPO, CODIGOS_TANGOL, categoriaIdDeTangol, claveTangol } from "@/tangol/lib/taxonomia";
import tabla from "../../../../tests/fixtures/tangol-tipos-2026-11-12.json";

/**
 * REQ-3503: pruebas del mapeo categoría por categoría (REQ-3502) contra la tabla REAL de tipos de Tangol
 * (corrida de solo lectura REQ-3487, 43303152904). La fila con SubTypeCode «[METHOD ERROR 504]» es basura del servidor
 * de Tangol: se descarta en la carga y aquí no se mapea.
 */
const BASURA = /^\[METHOD ERROR/;
const validos = tabla.tipos.filter((t) => !BASURA.test(t.subTypeCode));
const tangol = M.tangol;
const catDe = (id: number) => tangol.categorias.find((c) => c.id === String(id));

describe("REQ-3503 la tabla real de tipos de Tangol", () => {
  it("REQ-3503: 39 tipos y 2,059 tours; 38 válidos y 1 de basura del servidor", () => {
    expect(tabla.tipos).toHaveLength(39);
    expect(tabla.tipos.reduce((n, t) => n + t.tours, 0)).toBe(2059);
    expect(validos).toHaveLength(38);
    expect(tabla.tipos.filter((t) => BASURA.test(t.subTypeCode)).map((t) => t.tours)).toEqual([1]);
  });
});

describe("REQ-3503 cada uno de los 38 tipos válidos tiene su categoría y ninguno cae en «por-revisar»", () => {
  it.each(validos.map((t) => [`${t.typeCode}|${t.subTypeCode}|${t.tourType}`, t] as const))("REQ-3503: %s", (_k, t) => {
    const id = categoriaIdDeTangol({ typeCode: t.typeCode, subTypeCode: t.subTypeCode });
    expect(id, "no debe caer en la red de seguridad").not.toBe(CATEGORIA_TANGOL_SIN_TIPO);
    const cat = catDe(id);
    expect(cat, `categoría ${id} en mapping/tangol.json`).toBeDefined();
    expect(cat!.formato).not.toBe("por-revisar");
    expect(cat!.nota).toMatch(new RegExp(`^Tangol ${t.typeCode}\\|${t.subTypeCode.replace(/[/]/g, "\\/")}\\. `));
    for (const titulo of t.ejemplos) {
      const r = classify({ proveedor: "tangol", categoriaId: id, precio: 50, durationMinutes: null, titulo }, D, M);
      expect(r.formato, titulo).not.toBe("por-revisar");
      expect(r.seccion, titulo).not.toBe("ninguna");
      expect(r.avisos.join(" "), titulo).not.toMatch(/por-revisar/);
    }
  });

  it("REQ-3503: con los 2,059 tours de la corrida, el reporte de cobertura (REQ-3467) da 0 en «por-revisar» fuera de la basura", () => {
    const filas = validos.flatMap((t) => Array.from({ length: t.tours }, () => ({ proveedor: "tangol", categoriaId: categoriaIdDeTangol(t) })));
    const r = reporteCobertura(filas, M);
    expect(r.total).toBe(2058);
    expect(r).toMatchObject({ porRevisar: 0, sinMapeo: [], detalle: [] });
  });

  it("REQ-3503: CODIGOS_TANGOL tiene un par por categoría, sin huérfanos en ninguno de los dos lados", () => {
    const pares = new Set(validos.map((t) => claveTangol(t)));
    expect(new Set(Object.keys(CODIGOS_TANGOL))).toEqual(pares);
    expect(Object.keys(CODIGOS_TANGOL)).toHaveLength(33); // 38 tipos = 33 pares × TourType (1 promo/paquete, 2 servicio)
    const ids = Object.values(CODIGOS_TANGOL).map(String);
    expect(new Set(ids).size).toBe(ids.length);
    expect(tangol.categorias.map((c) => c.id).sort()).toEqual([String(CATEGORIA_TANGOL_SIN_TIPO), ...ids].sort());
  });

  it("REQ-3503: el TourType no cambia la categoría (promo y servicio del mismo par van juntos)", () => {
    const a = categoriaIdDeTangol({ typeCode: "VIAJES", subTypeCode: "CLASICOS" });
    expect(validos.filter((t) => t.typeCode === "VIAJES" && t.subTypeCode === "CLASICOS").map((t) => t.tourType).sort()).toEqual([1, 2]);
    expect(catDe(a)!.formato).toBe("circuito");
  });

  it("REQ-3503: la basura «[METHOD ERROR 504]» no tiene categoría propia (cae en la red de seguridad)", () => {
    expect(categoriaIdDeTangol({ typeCode: "EXCURSION", subTypeCode: "[METHOD ERROR 504]" })).toBe(CATEGORIA_TANGOL_SIN_TIPO);
    expect(Object.keys(CODIGOS_TANGOL).some((k) => BASURA.test(k.split("|")[1]))).toBe(false);
  });
});

/** REQ-3428 (fusionado): traslados y transporte son los complementos del carrito, por tipo. */
describe("REQ-3503 los traslados de Tangol van a la sección de traslados", () => {
  const traslados = validos.filter((t) => t.typeCode === "TRASLADO" || (t.typeCode === "PASES" && t.subTypeCode === "TKTBUS"));
  it("REQ-3503: son los 7 SubTypeCode de TRASLADO más el boleto de bus", () => {
    expect(traslados.map((t) => claveTangol(t)).sort()).toEqual([
      "PASES|TKTBUS", "TRASLADO|IN", "TRASLADO|IN/OUT", "TRASLADO|OUT", "TRASLADO|TRF", "TRASLADO|TRF IN", "TRASLADO|TRFINBUS", "TRASLADO|TRFOUTBUS",
    ]);
  });
  it.each(traslados.flatMap((t) => t.ejemplos.map((e) => [claveTangol(t), e] as const)))("REQ-3503: %s «%s» → traslados", (clave, titulo) => {
    const r = classify({ proveedor: "tangol", categoriaId: CODIGOS_TANGOL[clave], precio: 50, durationMinutes: 60, titulo }, D, M);
    expect(r.seccion).toBe("traslados");
    expect(cartTypeFor(r.formato)).toBe(clave === "PASES|TKTBUS" ? "transport" : "transfer");
  });
});

describe("REQ-3503 formato base de cada familia de Tangol (trato de freetour.json)", () => {
  const base = (clave: string) => catDe(CODIGOS_TANGOL[clave])!;
  it("REQ-3503: los VIAJES son Circuito fijo (paquetes de varios días; Tour o Trip lo decide el PO)", () => {
    for (const k of Object.keys(CODIGOS_TANGOL).filter((k) => k.startsWith("VIAJES|"))) expect(base(k)).toMatchObject({ formato: "circuito", fijo: true });
    const r = classify({ proveedor: "tangol", categoriaId: CODIGOS_TANGOL["VIAJES|ESCAPADAS"], precio: 900, durationMinutes: null, titulo: "Cena Show en Hotel Casino Catamarca" }, D, M);
    expect(r.formato).toBe("circuito");
    expect(cartTypeFor(r.formato)).toBeNull();
  });
  it.each([
    ["EXCURSION|CLASICAS", "excursion-dia"], ["EXCURSION|AVENTURA", "experiencia-unica"], ["EXCURSION|GASTRONOMICO", "tour"],
    ["EXCURSION|WALKINGTOURS", "caminata"], ["EXCURSION|HELICOPTERO", "experiencia-unica"], ["PASES|PASS", "entradas"],
    ["SHOW|SHOW", "experiencia-unica"], ["SHOW|TANGO", "experiencia-unica"], ["CLASES|CLASES DE SAMBA", "experiencia-unica"],
    ["ALQUILERES|ALQUILERDEAUTO", "alquiler"], ["CRUCERO|CRUCERO", "crucero"],
  ])("REQ-3503: %s → base %s", (clave, formato) => {
    expect(base(clave).formato).toBe(formato);
  });
  it("REQ-3503: los temas salen del diccionario existente (ninguno inventado)", () => {
    const temas = new Set(D.terminos.filter((t) => t.eje === "tema").map((t) => t.slug));
    for (const c of tangol.categorias) for (const t of c.temas) expect(temas.has(t), `${c.id}:${t}`).toBe(true);
  });
  it("REQ-3503: una excursión clásica corta en la ciudad no se queda en Excursión de un día", () => {
    const r = classify({ proveedor: "tangol", categoriaId: CODIGOS_TANGOL["EXCURSION|CLASICAS"], precio: 30, durationMinutes: 180, titulo: "City Tour en Bariloche" }, D, M);
    expect(r.formato).not.toBe("excursion-dia");
    expect(r.formato).not.toBe("por-revisar");
  });
});
