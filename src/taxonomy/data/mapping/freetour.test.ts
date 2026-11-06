import { describe, expect, it } from "vitest";
import { DEFAULT_DICTIONARY as D, DEFAULT_MAPPINGS as M } from "../index";
import { classify } from "../../lib/classify";
import { cartTypeFor } from "../../lib/cart-type";
import { piezaLibreExcepciones } from "../../lib/primera-pieza";

/**
 * Copia de docs/freetour/categorias.csv (PR #143, homologado por el PO el 6-11): id, Formato_TP, Temas_TP,
 * Precio0_es_La_Primera_Pieza y CartItem_tipo (con G-T11 A: autoguiado → tour).
 */
const CSV: [id: number, nombre: string, formato: string, temas: string[], precio0EsPieza: boolean, carrito: string | null][] = [
  [3, "Cruceros y barcos", "tour", ["playa-mar"], true, "tour"],
  [4, "Viajes de 1 Día", "excursion-dia", [], true, "day_trip"],
  [5, "Tour Gastronómico", "tour", ["gastronomia"], true, "tour"],
  [7, "Vida Nocturna", "experiencia-unica", ["noche-espectaculos"], true, "tour"],
  [8, "Tour Online", "fuera", [], false, null],
  [10, "Tour Corriendo", "caminata", ["deportivo", "urbano"], true, "tour"],
  [12, "Tour a Pie", "caminata", ["urbano"], true, "tour"],
  [13, "Otros", "tour", [], true, "tour"],
  [14, "Top selección", "tour", [], true, "tour"],
  [16, "Tours de aventura", "experiencia-unica", ["aventura"], true, "tour"],
  [17, "Audioguías", "autoguiado", [], false, "tour"],
  [18, "Aviación", "experiencia-unica", ["aventura"], true, "tour"],
  [19, "Tours en vehículo por la ciudad", "tour", ["urbano"], true, "tour"],
  [20, "Entradas", "entradas", [], false, "tickets"],
  [21, "Juegos y ocio", "experiencia-unica", ["parques-ocio"], true, "tour"],
  [22, "Sitios históricos", "tour", ["cultural"], true, "tour"],
  [23, "Deportes de motor", "experiencia-unica", ["aventura", "deportivo"], true, "tour"],
  [24, "Museos", "entradas", ["cultural"], false, "tickets"],
  [25, "Naturaleza y parques", "tour", ["naturaleza"], true, "tour"],
  [26, "Alquileres", "alquiler", [], false, "car_rental"],
  [27, "Espectáculos en vivo", "experiencia-unica", ["cultural", "noche-espectaculos"], true, "tour"],
  [28, "Pases urbanos", "entradas", [], false, "tickets"],
  [29, "Traslados", "traslado", [], false, "transfer"],
  [30, "Transporte público", "transporte", ["urbano"], false, "transport"],
  [31, "Servicios de viaje", "fuera", [], false, null],
  [32, "Actividades acuáticas", "experiencia-unica", ["playa-mar"], true, "tour"],
  [33, "Bienestar", "experiencia-unica", ["bienestar"], true, "tour"],
  [34, "Talleres", "experiencia-unica", ["talleres-aprendizaje"], true, "tour"],
  [35, "Zoológicos y acuarios", "entradas", ["naturaleza", "parques-ocio"], false, "tickets"],
];
const ft = M.freetour;
/** Título sin palabras clave: solo deciden la categoría, el precio y la duración. */
const product = (categoriaId: number, precio: number) => ({ proveedor: "freetour", categoriaId, precio, durationMinutes: 120, titulo: "Visita Alfa | Alfa visit" });

describe("REQ-404 mapeo FREETOUR: los 29 categoryIds una sola vez", () => {
  it("REQ-404 los 29 ids vivos de categorias.csv, sin repetir, más los 4 históricos", () => {
    const vivos = ft.categorias.filter((c) => c.estado !== "historico").map((c) => Number(c.id)).sort((a, b) => a - b);
    expect(vivos).toEqual(CSV.map((r) => r[0]));
    expect(vivos).toHaveLength(29);
    expect(ft.categorias.filter((c) => c.estado === "historico").map((c) => c.id).sort()).toEqual(["1", "2", "6", "9"]);
  });
  it("REQ-404 los nombres originales del proveedor se guardan tal cual (dato técnico, nunca se muestran)", () => {
    for (const [id, nombre] of CSV) expect(ft.categorias.find((c) => c.id === String(id))?.nombre_es).toBe(nombre);
  });
});

describe("REQ-402 / REQ-406 / REQ-407 / REQ-408 / REQ-428 cada una de las 29 categorías", () => {
  it.each(CSV)("REQ-402 categoría %i (%s): formato base %s, temas y carrito", (id, _n, formato, temas, precio0EsPieza, carrito) => {
    const pago = classify(product(id, 25), D, M);
    expect(pago.formato).toBe(formato);
    expect(pago.temas).toEqual(expect.arrayContaining(temas));
    expect(cartTypeFor(pago.formato)).toBe(carrito);
    const gratis = classify(product(id, 0), D, M);
    expect(gratis.formato === "pieza-libre").toBe(precio0EsPieza);
    if (!precio0EsPieza) expect(gratis.formato).toBe(formato);
  });
  it("REQ-406 las excepciones de Free tour son exactamente 8, 17, 20, 24, 26, 28, 29, 30, 31 y 35 (incluye 26 y 31)", () => {
    expect(piezaLibreExcepciones(ft).map(Number).sort((a, b) => a - b)).toEqual([8, 17, 20, 24, 26, 28, 29, 30, 31, 35]);
  });
  it.each([1, 2, 6, 9, 999, 11, 15])("REQ-408 el id %i (histórico o nuevo) queda por-revisar, sin temas ni atributos, y se avisa", (id) => {
    for (const precio of [0, 30]) {
      const r = classify(product(id, precio), D, M);
      expect(r).toMatchObject({ formato: "por-revisar", seccion: "ninguna", temas: [], atributos: [] });
      expect(r.avisos).toContain(`por-revisar: freetour:${id}`);
    }
  });
  it.each([8, 31])("REQ-407 la %i es «fuera»: sin sección, temas ni atributos, con o sin precio", (id) => {
    for (const precio of [0, 30]) expect(classify(product(id, precio), D, M)).toMatchObject({ formato: "fuera", seccion: "ninguna", temas: [], atributos: [] });
  });
});
