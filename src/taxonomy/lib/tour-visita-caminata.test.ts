/**
 * Decisión B del PO (7 nov 2026, 08:01) y su respuesta de las 08:10 (INC-008):
 * «"Tour" es un tipo propio: un recorrido en transporte dentro de la ciudad (bus turístico, barco, bici, tuk-tuk). Se distingue
 * de la Visita guiada, que es en un sitio o museo con guía, y de la Caminata, que es a pie. Así se separan los tres.»
 * El hop-on hop-off sigue como «Transporte turístico» (#2).
 */
import { describe, expect, it } from "vitest";
import { DEFAULT_DICTIONARY as D, DEFAULT_MAPPINGS as M } from "../data/index";
import { classify } from "./classify";
import { DUDA } from "./format";
import { FORMATOS_FILTRO, FORMATO_CARD_LABEL, FORMATO_LABEL } from "./filters";
import { formatChips } from "@/tours/lib/format-chips";
import { categoryLabel } from "@/tours/lib/experience-card";
import { cartTypeFor } from "./cart-type";
import type { ClassifyInput } from "./types";

const ft = (categoriaId: number, titulo: string, durationMinutes = 120, precio = 40): ClassifyInput => ({ proveedor: "freetour", categoriaId, precio, durationMinutes, titulo });
const own = (titulo: string, resumen = ""): ClassifyInput => ({ proveedor: "propios", categoriaId: "tour", precio: 99, durationDays: 1, titulo, resumen });
const f = (i: ClassifyInput) => classify(i, D, M);

describe("REQ-1250 tres tipos: Tour (transporte en la ciudad), Visita guiada (sitio o museo) y Caminata (a pie)", () => {
  it("REQ-1250 transporte dentro de la ciudad = Tour", () => {
    for (const t of ["Tour en bicicleta por Ámsterdam", "Paseo en barco por los canales", "Tuk-tuk por Lisboa", "Segway por el centro de Roma", "City tour en bus por Lima"]) {
      expect(f(ft(13, t)).formato, t).toBe("tour");
    }
    expect(f(ft(19, "Lo mejor de Ciudad de México")).formato).toBe("tour"); // la categoría 19 ya dice «en vehículo»
    expect(f(ft(3, "Atardecer en el Bósforo")).formato).toBe("tour"); // la 3 ya dice «barco»
  });
  it("REQ-1250 el hop-on hop-off sigue como Transporte turístico (respuesta del PO, 08:10)", () => {
    expect(f(ft(19, "Bus hop-on hop-off de Roma")).formato).toBe("transporte");
    expect(f(ft(3, "Hop on hop off boat")).formato).toBe("transporte");
  });
  it("REQ-1250 a pie = Caminata (la regla de Caminata no cambia)", () => {
    expect(f(ft(12, "Barrio gótico")).formato).toBe("caminata");
    expect(f(ft(13, "Recorrido a pie por el Raval")).formato).toBe("caminata");
    expect(f(own("Montmartre a pie con degustaciones")).formato).toBe("caminata");
  });
  it("REQ-1250 nombres iguales en tarjeta, filtro y chips; en inglés Tour, Guided visit y Walking tour", () => {
    for (const [slug, es, en] of [["tour", "Tour", "Tour"], ["visita-guiada", "Visita guiada", "Guided visit"], ["caminata", "Caminata", "Walking tour"]] as const) {
      expect(FORMATO_CARD_LABEL[slug]).toEqual({ es, en });
      expect(FORMATO_LABEL[slug]).toEqual({ es, en });
      expect(categoryLabel(slug, "es")).toBe(es);
    }
    expect(formatChips({ tour: 3, "visita-guiada": 2, caminata: 1 }, "es").map((c) => c.label)).toEqual(expect.arrayContaining(["Tour", "Visita guiada", "Caminata"]));
    expect(FORMATOS_FILTRO).toEqual(expect.arrayContaining(["tour", "visita-guiada", "caminata"]));
    // D17: ningún tipo que no sea Tour dice «tour» en español
    for (const s of FORMATOS_FILTRO) if (s !== "tour") expect(FORMATO_LABEL[s].es, s).not.toMatch(/\btour\b/i);
    expect(cartTypeFor("visita-guiada")).toBe("tour");
    expect(D.terminos.find((t) => t.eje === "formato" && t.slug === "visita-guiada")).toMatchObject({ termino_es: "Visita guiada", termino_en: "Guided visit", estado: "activo", seccion: "experiencias" });
  });
});

describe("REQ-1251 sitio o museo con guía = Visita guiada (categorías 22 y 24 como candidatas)", () => {
  it("REQ-1251 señal de sitio en el título", () => {
    for (const t of ["Visita guiada al Museo del Prado", "Catedral de Sevilla con guía", "Palacio Real de Madrid", "Alhambra y Generalife", "Visita guiada a la mina de sal de Wieliczka"]) {
      expect(f(ft(13, t)).formato, t).toBe("visita-guiada");
    }
  });
  it("REQ-1251 la 22 (Sitios históricos) es Visita guiada; con transporte, Tour; a pie, Caminata", () => {
    expect(f(ft(22, "Las pirámides de Teotihuacán")).formato).toBe("visita-guiada");
    expect(f(ft(22, "Ruinas en bicicleta")).formato).toBe("tour");
    expect(f(ft(22, "Recorrido a pie por el barrio histórico")).formato).toBe("caminata");
  });
  it("REQ-1251 la 24 (Museos) con guía es Visita guiada; sin guía sigue siendo Boletos", () => {
    expect(f(ft(24, "Visita guiada al Museo del Prado con entrada")).formato).toBe("visita-guiada");
    expect(f(ft(24, "Entrada al Museo del Prado")).formato).toBe("entradas");
  });
});

describe("REQ-1252 sin señal: tipo por defecto de la categoría y a la lista de dudas", () => {
  it("REQ-1252 la regla empieza con «duda:» y nunca queda «por-revisar»", () => {
    const tapas = f(ft(5, "Tapas por el centro"));
    expect(tapas.formato).toBe("caminata");
    expect(tapas.reglaFormato.startsWith(DUDA)).toBe(true);
    const otros = f(ft(13, "Lo mejor de Atenas"));
    expect(otros.formato).toBe("visita-guiada");
    expect(otros.reglaFormato.startsWith(DUDA)).toBe(true);
    const trip = f(own("Singapur esencial"));
    expect(trip.formato).toBe("visita-guiada");
    expect(trip.reglaFormato.startsWith(DUDA)).toBe(true);
    for (const r of [tapas, otros, trip]) expect(r.formato).not.toBe("por-revisar");
  });
  it("REQ-1252 con señal en el resumen ya no es duda", () => {
    const r = f(own("Singapur esencial", "Recorrido en bus por la ciudad con guía en español."));
    expect(r.formato).toBe("tour");
    expect(r.reglaFormato.startsWith(DUDA)).toBe(false);
  });
});

describe("REQ-1257 las cachés que guardan el formato cambian de llave con la reclasificación", () => {
  // Evidencia del preview de #259: la Cache API es la misma para todas las versiones del worker; sin llave nueva, la
  // tarjeta pintaba «Tour» (nombre nuevo) sobre un formato `tour` calculado con la regla vieja.
  it("REQ-1257 índice del catálogo, lista de /tours, API, viajes, /destinos e inicio", async () => {
    const { readFileSync } = await import("node:fs");
    const has = (f: string, s: string) => expect(readFileSync(f, "utf8"), f).toContain(s);
    has("src/catalog/snapshot.ts", "v: 5"); // REQ-1260
    has("src/actions/tours.ts", "v: 'tipos-1260'");
    has("src/app/api/tours/route.ts", "v: 'tipos-1260'");
    has("src/trips/public-load.ts", 'v: "10"');
    has("src/destinations/server.ts", 'cacheKey("destinos", { v: "9"');
    has("src/app/page.tsx", 'v: "carruseles-610-tipos-1260"');
    has("src/home/carousel-load.ts", "v: 4 /* REQ-668 href final; REQ-1250 tipos; REQ-1260 cat. 8 */");
  });
});
