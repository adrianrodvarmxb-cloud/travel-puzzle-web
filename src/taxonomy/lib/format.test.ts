import { describe, expect, it } from "vitest";
import { DEFAULT_DICTIONARY as D, DEFAULT_MAPPINGS as M } from "../data/index";
import { classify } from "./classify";
import { cuentaComoCaminata } from "./format";
import { DEFAULT_GATES } from "./gates";
import type { ClassifyInput } from "./types";

const ft = (categoriaId: number, precio: number, titulo: string, durationMinutes = 120, resumen = ""): ClassifyInput =>
  ({ proveedor: "freetour", categoriaId, precio, durationMinutes, titulo, resumen });
const f = (i: ClassifyInput, g = DEFAULT_GATES) => classify(i, D, M, g);

describe("REQ-402 precedencia del Eje A (gana la primera regla)", () => {
  it("REQ-402 #1 traslado por palabra solo en 13/14 y sin «tour» en el título", () => {
    expect(f(ft(13, 40, "Airport transfer to the city")).formato).toBe("traslado");
    expect(f(ft(14, 40, "Shuttle al aeropuerto")).formato).toBe("traslado");
    expect(f(ft(13, 40, "Tour y traslado al aeropuerto")).formato).toBe("tour");
    expect(f(ft(12, 40, "Recorrido con traslado")).formato).toBe("caminata");
    expect(f(ft(13, 40, "Visita", 120, "Incluye traslado desde el hotel")).formato).toBe("traslado");
  });
  it("REQ-402 #2 «hop-on» en el título da transporte en cualquier categoría", () => {
    expect(f(ft(19, 30, "Bus hop-on hop-off de Roma")).formato).toBe("transporte");
    expect(f(ft(3, 30, "Hop on hop off boat")).formato).toBe("transporte");
  });
  it("REQ-402 #4 entradas por palabra en el título de 13/14", () => {
    expect(f(ft(14, 30, "Recorrido a pie por Mdina con entrada a las catacumbas")).formato).toBe("entradas");
    expect(f(ft(13, 30, "Skip-the-line museum")).formato).toBe("entradas");
    expect(f(ft(22, 30, "Castillo con entrada")).formato).toBe("tour");
  });
  it("REQ-402 #6 Free tour gana sobre circuito, excursión, caminata y Momentos de autor", () => {
    expect(f(ft(12, 0, "Free tour por el centro")).formato).toBe("pieza-libre");
    expect(f(ft(4, 0, "Excursión gratis desde Lima", 480)).formato).toBe("pieza-libre");
    expect(f(ft(7, 0, "Pub crawl")).formato).toBe("pieza-libre");
    expect(f(ft(25, 0, "3 días en la selva", 2000)).formato).toBe("pieza-libre");
  });
  it("REQ-402 #7 circuito por ≥1440 min o «N días» en el título; 1439 no", () => {
    expect(f(ft(4, 90, "Visita", 1440)).formato).toBe("circuito");
    expect(f(ft(4, 90, "Visita", 1439)).formato).toBe("excursion-dia");
    expect(f(ft(25, 90, "Selva amazónica 3 días")).formato).toBe("circuito");
    expect(f(ft(25, 90, "Inca trail 4 days")).formato).toBe("circuito");
    expect(f(ft(25, 90, "2-day tour")).formato).toBe("circuito");
    expect(f(ft(25, 90, "1-day tour")).formato).toBe("tour");
  });
  it("REQ-402 #8 excursión: base 4, o ≥360 min con palabra de salida (G-T7 A); 359 no", () => {
    expect(f(ft(25, 60, "Excursión al volcán", 360)).formato).toBe("excursion-dia");
    expect(f(ft(25, 60, "Excursión al volcán", 359)).formato).toBe("tour");
    expect(f(ft(19, 60, "City tour largo", 400)).formato).toBe("tour");
    expect(f(ft(19, 60, "Toledo desde Madrid", 480)).formato).toBe("excursion-dia");
    expect(f(ft(12, 60, "Day trip on foot", 420)).formato).toBe("excursion-dia");
  });
  it("REQ-402 #9 caminata: 12 y 10 de pago (G2 A)", () => {
    expect(f(ft(12, 15, "Barrio gótico")).formato).toBe("caminata");
    expect(f(ft(10, 15, "Running por el río")).formato).toBe("caminata");
  });
  it("REQ-402 #10 Momentos de autor: base o clase/taller en la 5", () => {
    expect(f(ft(5, 50, "Clase de cocina mexicana")).formato).toBe("experiencia-unica");
    expect(f(ft(5, 50, "Tapas por el centro")).formato).toBe("tour");
    expect(f(ft(13, 50, "Clase de cocina")).formato).toBe("experiencia-unica"); // REQ-536: la 13 ya admite clase/taller
    expect(f(ft(22, 50, "Clase de historia en el castillo")).formato).toBe("tour"); // las que no lo admiten, igual
  });
  it("REQ-402 la regla que decidió viaja con el resultado", () => {
    expect(f(ft(12, 0, "x")).reglaFormato).toBe("#6 precio 0 en freetour:12");
    expect(f(ft(26, 0, "x")).reglaFormato).toBe("#3 base freetour:26");
  });
});

describe("REQ-406 La Primera Pieza corregida", () => {
  it("REQ-406 precio 0 en 26 y 31 no da Free tour", () => {
    expect(f(ft(26, 0, "Bike rental")).formato).toBe("alquiler");
    expect(f(ft(31, 0, "SIM")).formato).toBe("fuera");
  });
  it("REQ-406 precio null (sin dato) no es Free tour", () => {
    expect(f(ft(12, null as unknown as number, "x")).formato).toBe("caminata");
  });
  it("REQ-406 viajes propios con precio 0 nunca son Free tour", () => {
    expect(f({ proveedor: "propios", categoriaId: "tour", precio: 0, titulo: "City tour" }).formato).toBe("tour");
  });
});

describe("REQ-402 viajes propios por kind", () => {
  const own = (kind: string, titulo: string, durationDays: number | null = 1) => f({ proveedor: "propios", categoriaId: kind, precio: 500, durationDays, titulo });
  it("REQ-402 circuito, unica, personalizado y transporte son fijos", () => {
    expect(own("circuito", "Perú", 1).formato).toBe("circuito");
    expect(own("unica", "Cena 5 días", 5).formato).toBe("experiencia-unica");
    expect(own("personalizado", "Machu Picchu Premium", 4).formato).toBe("a-la-medida");
    expect(own("transporte", "Bus turístico", 1).formato).toBe("transporte");
  });
  it("REQ-402 un tour de 2+ días es circuito; de 1 día con palabra de salida, excursión", () => {
    expect(own("tour", "Lima colonial", 2).formato).toBe("circuito");
    expect(own("tour", "Paracas e Islas Ballestas desde Lima", 1).formato).toBe("excursion-dia");
    expect(own("tour", "City Tour Virreinal de Lima", 1).formato).toBe("tour");
    expect(own("tour", "Paracas desde Lima", null).formato).toBe("tour");
  });
});

describe("REQ-260 gate G2 (Caminata) al filtrar", () => {
  const pieza = f(ft(12, 0, "Free walking tour"));
  const paga = f(ft(12, 20, "Walking tour"));
  const trek = f(ft(25, 20, "Hiking en la sierra"));
  it("REQ-260 A: solo caminatas de pago", () => {
    expect([pieza, paga, trek].map((r) => cuentaComoCaminata(r, "A"))).toEqual([false, true, false]);
  });
  it("REQ-260 B: también los free tours a pie; C: senderismo", () => {
    expect([pieza, paga, trek].map((r) => cuentaComoCaminata(r, "B"))).toEqual([true, true, false]);
    expect([pieza, paga, trek].map((r) => cuentaComoCaminata(r, "C"))).toEqual([false, false, true]);
  });
});
