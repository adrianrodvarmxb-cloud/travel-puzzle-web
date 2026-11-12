import { describe, expect, it } from "vitest";
import { DEFAULT_DICTIONARY as D, DEFAULT_MAPPINGS as M } from "../index";
import { parseMapping } from "../../schemas/dictionary";
import { classify } from "../../lib/classify";
import { cartTypeFor } from "../../lib/cart-type";
import { CATEGORIA_TANGOL_SIN_TIPO, categoriaIdDeTangol } from "@/tangol/lib/taxonomia";
import rawTangol from "./tangol.json";

/**
 * REQ-3466: pruebas del mapeo de Tangol. Molde: freetour.test.ts y agencias.test.ts.
 * Los títulos son del estilo que Tangol vende en Sudamérica (traslados, city tours, excursiones, circuitos, shows);
 * no son una lista de categorías del proveedor: esa sigue sin confirmar (ver el `revisado` del mapeo).
 */
const tangol = M.tangol;
/** El sync de la ola 2 escribe este id: ningún tour de Tangol llega sin categoría. */
const cat = categoriaIdDeTangol({});

const producto = (titulo: string, min: number | null, dias: number | null = null, precio: number | null = 45) => ({
  proveedor: "tangol",
  categoriaId: cat,
  precio,
  durationMinutes: min,
  durationDays: dias,
  titulo,
});

/** [título, minutos, días, formato esperado, tipo de carrito esperado] */
const CASOS: [titulo: string, min: number | null, dias: number | null, formato: string, carrito: string | null][] = [
  ["Traslado In Aeropuerto Ezeiza / Hotel en Buenos Aires", 60, null, "traslado", "transfer"],
  ["Transfer Out Hotel / Aeropuerto Jorge Chávez, Lima", 60, null, "traslado", "transfer"],
  ["Bus turístico Hop on Hop off Buenos Aires", 180, null, "transporte", "transport"],
  ["Argentina Clásica 8 días", null, 8, "circuito", null],
  ["Excursión a Tigre y Delta desde Buenos Aires", 420, null, "excursion-dia", "day_trip"],
  ["Cena Show de Tango en Buenos Aires", 240, null, "experiencia-unica", "tour"],
  ["Visita al Museo Nacional de Bellas Artes con guía", 120, null, "visita-guiada", "tour"],
  ["Entrada al Teatro Colón", 90, null, "entradas", "tickets"],
  ["City Tour por Buenos Aires en bus", 180, null, "tour", "tour"],
  ["Paseo a pie por San Telmo", 150, null, "caminata", "tour"],
  ["Audioguía de Cartagena por tu cuenta", 120, null, "autoguiado", "tour"],
];

describe("REQ-3466 el mapeo de Tangol vale contra el esquema y está declarado", () => {
  it("REQ-3466: valida con Zod, se llama `tangol` y queda registrado en los mapeos por defecto", () => {
    const m = parseMapping(rawTangol);
    expect(m.proveedor).toBe("tangol");
    expect(M.tangol).toBeDefined();
    expect(M.tangol.categorias.length).toBeGreaterThan(0);
  });

  it("REQ-3466: cada categoría dice de qué campo del proveedor sale y el mapeo está pendiente de firma del PO", () => {
    expect(tangol.revisado).toMatch(/pendiente de firma del PO/);
    for (const c of tangol.categorias) expect(c.nota, `tangol:${c.id}`).toBeTruthy();
  });

  it("REQ-3466: Tangol no es proveedor de free tours ni promete confirmación inmediata", () => {
    expect(tangol.precioCeroEsPiezaLibre).toBe(false);
    expect(tangol.permiteConfirmacionInmediata).toBe(false);
    // Precio 0 es dato raro de un mayorista B2B: conserva su formato, nunca se publica como Pieza libre.
    const r = classify(producto("City Tour por Buenos Aires en bus", 180, null, 0), D, M);
    expect(r.formato).toBe("tour");
  });

  it("REQ-3466: la categoría que escribe el sync existe en el mapeo", () => {
    expect(tangol.categorias.map((c) => c.id)).toContain(String(CATEGORIA_TANGOL_SIN_TIPO));
  });
});

describe("REQ-3466 los casos típicos de Tangol no caen en «por-revisar»", () => {
  it.each(CASOS)("REQ-3466: «%s» → %s", (titulo, min, dias, formato, carrito) => {
    const r = classify(producto(titulo, min, dias), D, M);
    expect(r.formato).toBe(formato);
    expect(cartTypeFor(r.formato)).toBe(carrito);
  });

  it.each([
    "Trekking al Glaciar Perito Moreno",
    "Navegación por el Canal Beagle",
    "Sobrevuelo de las Líneas de Nazca",
    "Tour de compras en Florianópolis",
    "Clase de cocina peruana en Lima",
  ])("REQ-3466: «%s» sale clasificado, nunca «por-revisar»", (titulo) => {
    const r = classify(producto(titulo, 300), D, M);
    expect(r.formato).not.toBe("por-revisar");
    expect(r.seccion).not.toBe("ninguna");
    expect(r.avisos.join(" ")).not.toMatch(/por-revisar/);
  });

  /**
   * Caracterización (no es lo deseable, es lo que hace hoy el diccionario y vale para TODOS los proveedores):
   * la palabra de `entradas` es «entrada» sin `*`, así que el plural «Entradas…» no dispara la regla #4 y el título
   * cae en Visita guiada por «entrada*» y «teatro» de `visita-guiada`. Arreglarlo es tocar `dictionary.json`, que
   * afecta a FREETOUR y al buscador (SEARCH_TAXONOMY_SYNONYMS_ENABLED encendida): necesita OK del PO y folio propio.
   */
  it("REQ-3466: hoy el plural «Entradas…» no cae en Boletos sino en Visita guiada (pendiente del diccionario)", () => {
    const r = classify(producto("Entradas al Teatro Colón", 90), D, M);
    expect(r.formato).toBe("visita-guiada");
  });

  it("REQ-3466: un tour de Tangol con una categoría que no está en el mapeo sí queda «por-revisar» (falla cerrada)", () => {
    const r = classify({ ...producto("City Tour por Buenos Aires en bus", 180), categoriaId: 7 }, D, M);
    expect(r.formato).toBe("por-revisar");
    expect(r.avisos).toContain("por-revisar: tangol:7");
  });
});

/** REQ-3428 (otro frente): los traslados y el transporte son los complementos del carrito, por tipo. */
describe("REQ-3466 traslados y transportes de Tangol caen en la sección de traslados", () => {
  it.each([
    ["Traslado In Aeropuerto Ezeiza / Hotel en Buenos Aires", "traslado", "transfer"],
    ["Traslado Hotel / Aeropuerto de Cartagena", "traslado", "transfer"],
    ["Shuttle compartido Aeropuerto de Santiago", "traslado", "transfer"],
    ["Bus turístico Hop on Hop off Río de Janeiro", "transporte", "transport"],
  ])("REQ-3466: «%s» → %s (carrito %s)", (titulo, formato, carrito) => {
    const r = classify(producto(titulo, 60), D, M);
    expect(r.formato).toBe(formato);
    expect(r.seccion).toBe("traslados");
    expect(cartTypeFor(r.formato)).toBe(carrito);
  });
});
