/**
 * REQ-1256 (D21, PO 6-11 21:16: «que se vean las etiquetas principales y se actualicen cada vez que hay nuevos»):
 * los tipos principales de /tours (chips y filtro «Tipo de experiencia») salen del diccionario, no de una lista en el
 * código. Un formato que pasa a `activo` en la sección Experiencias del diccionario tiene chip sin tocar la UI.
 */
import { describe, expect, it } from "vitest";
import { DEFAULT_DICTIONARY as D } from "../data/index";
import { parseDictionary } from "../schemas/dictionary";
import raw from "../data/dictionary.json";
import { formatDefs } from "./format-defs";
import { FORMATOS_FILTRO, FORMATO_CARD_LABEL, FORMATO_LABEL, formatoOptions } from "./filters";
import { formatChips } from "@/tours/lib/format-chips";
import { queryCatalog, type CatalogEntry } from "@/catalog/lib/query";

const clone = () => JSON.parse(JSON.stringify(raw));
const entry = (id: string, formato: string): CatalogEntry => ({ id, cityId: 1, countryId: 1, categoryId: 3, price: 20, rating: 4.8, reviews: 10, durationMinutes: 120, createdAt: 0, updatedAt: 0, text: id, formato });

describe("REQ-1256 tipos principales desde el diccionario", () => {
  it("REQ-1256 hoy dan exactamente los formatos del filtro, con los mismos nombres cortos y largos", () => {
    const defs = formatDefs(D);
    expect(defs.map((d) => d.slug)).toEqual([...FORMATOS_FILTRO]);
    for (const d of defs) {
      expect(d.corto, d.slug).toEqual(FORMATO_CARD_LABEL[d.slug as keyof typeof FORMATO_CARD_LABEL]);
      expect(d.largo, d.slug).toEqual(FORMATO_LABEL[d.slug as keyof typeof FORMATO_LABEL]);
    }
  });
  it("REQ-1256 un formato que se activa en el diccionario tiene chip, opción de filtro y lugar en /tours sin tocar la UI", () => {
    const dict = clone();
    const crucero = dict.terminos.find((t: { eje: string; slug: string }) => t.eje === "formato" && t.slug === "crucero");
    Object.assign(crucero, { estado: "activo", seccion: "experiencias", etiqueta_corta_es: "Crucero", etiqueta_corta_en: "Cruise" });
    const defs = formatDefs(parseDictionary(dict));
    expect(defs.map((d) => d.slug)).toContain("crucero");
    const chips = formatChips({ crucero: 2, tour: 5 }, "es", defs).map((c) => c.label);
    expect(chips).toEqual(["Todo", "Tour", "Crucero"]);
    expect(formatChips({ crucero: 2 }, "en", defs).map((c) => c.label)).toEqual(["All", "Cruise"]);
    expect(formatoOptions({ crucero: 2 }, [], "es", defs).map((o) => o.label)).toEqual(["Crucero"]);
    const slugs = defs.map((d) => d.slug);
    expect(queryCatalog([entry("a", "crucero"), entry("b", "traslado")], { taxonomy: true, formatosTours: slugs }, { limit: 10 }).ids).toEqual(["a"]);
  });
  it("REQ-1256 lo que no está activo o no es de Experiencias no tiene chip", () => {
    const slugs = formatDefs(D).map((d) => d.slug);
    for (const s of ["traslado", "transporte", "alquiler", "crucero", "fuera", "por-revisar"]) expect(slugs).not.toContain(s);
  });
  it("REQ-1256 un formato activo de Experiencias sin nombre corto rompe el parseo", () => {
    const dict = clone();
    Object.assign(dict.terminos.find((t: { slug: string }) => t.slug === "crucero"), { estado: "activo", seccion: "experiencias" });
    expect(() => parseDictionary(dict)).toThrow(/etiqueta corta/);
  });
});
