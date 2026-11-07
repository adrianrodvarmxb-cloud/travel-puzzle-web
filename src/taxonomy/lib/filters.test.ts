import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEFAULT_DICTIONARY as D } from "../data/index";
import type { TerminoFormato } from "../schemas/dictionary";
import { FORMATO_LABEL, FORMATOS_FILTRO, formatoLabel, formatoOptions, parseFormatos, taxonomyFiltersEnabled, toursRobots } from "./filters";
import { parseExtraFilters, extraFiltersToParams, countActive } from "@/tours/lib/extra-filters";
import { queryCatalog, type CatalogEntry } from "@/catalog/lib/query";
import { matchesToursFilter } from "@/trips/lib/public";

const q = (s: string) => new URLSearchParams(s);
const term = (slug: string) => D.terminos.find((t): t is TerminoFormato => t.eje === "formato" && t.slug === slug)!;

describe("T4 filtro ?formato= en /tours (REQ-412, REQ-413)", () => {
  it("REQ-413 bandera TAXONOMY_FILTERS_ENABLED: solo \"true\"; wrangler.jsonc la trae en \"false\"", () => {
    expect(taxonomyFiltersEnabled({ TAXONOMY_FILTERS_ENABLED: "true" })).toBe(true);
    expect(taxonomyFiltersEnabled({})).toBe(false);
    expect(readFileSync("wrangler.jsonc", "utf8")).toMatch(/"TAXONOMY_FILTERS_ENABLED":\s*"false"/);
  });
  it("REQ-413 solo formatos de Experiencias y activos; nunca traslado, transporte, renta, crucero, fuera ni por-revisar", () => {
    for (const f of FORMATOS_FILTRO) expect(term(f)).toMatchObject({ seccion: "experiencias", estado: "activo" });
    for (const f of ["traslado", "transporte", "alquiler", "crucero", "fuera", "por-revisar"]) expect(FORMATOS_FILTRO).not.toContain(f);
  });
  it("REQ-413 las etiquetas son las del diccionario (es y en)", () => {
    for (const f of FORMATOS_FILTRO) {
      expect(FORMATO_LABEL[f].es).toBe(term(f).termino_es);
      expect(FORMATO_LABEL[f].en).toBe(term(f).termino_en);
    }
    expect(FORMATO_LABEL["experiencia-unica"].es).toBe("Momentos de autor");
  });
  it("REQ-413 ?formato= con slugs válidos, sin repetir y en orden; ?tipo_act= viejo se traduce o se ignora", () => {
    expect(parseFormatos(q("formato=tour,caminata,tour,12,traslado"))).toEqual(["caminata", "tour"]);
    expect(parseFormatos(q("tipo_act=excursiones,gastronomia,transporte"))).toEqual(["excursion-dia"]);
    expect(parseFormatos(q("tipo_act=visitas"))).toEqual(["pieza-libre", "caminata", "tour", "autoguiado"]);
  });
  it("REQ-413 noindex,follow y canonical /tours solo con filtro de formato y la bandera encendida", () => {
    expect(toursRobots(q("formato=tour"), true)).toEqual({ robots: { index: false, follow: true }, canonical: "/tours" });
    expect(toursRobots(q("formato=tour"), false)).toEqual({});
    expect(toursRobots(q("countryId=3"), true)).toEqual({});
  });
  it("REQ-412 nunca un chip en cero (salvo el que ya está marcado)", () => {
    const opts = formatoOptions({ tour: 3, caminata: 0, entradas: 2 }, ["autoguiado"], "es");
    expect(opts.map((o) => [o.slug, o.count])).toEqual([["tour", 3], ["entradas", 2], ["autoguiado", 0]]);
    expect(formatoOptions(null, [], "es")).toEqual([]);
  });
});

describe("T4 integración con los filtros de hoy", () => {
  it("REQ-413 apagada: ?formato= se ignora y ?tipo_act= sigue igual que hoy", () => {
    const f = parseExtraFilters(q("formato=tour&tipo_act=visitas"), "2026-11-06");
    expect(f.formatos).toEqual([]);
    expect(f.groups).toEqual(["visitas"]);
  });
  it("REQ-413 encendida: ?tipo_act= pasa a formatos, los grupos viejos se ocultan y la URL escribe ?formato=", () => {
    const f = parseExtraFilters(q("tipo_act=excursiones&formato=tour"), "2026-11-06", { taxonomy: true });
    expect(f.groups).toEqual([]);
    expect(f.formatos).toEqual(["tour", "excursion-dia"]);
    expect(extraFiltersToParams(f).get("formato")).toBe("tour,excursion-dia");
    expect(countActive(f)).toBe(2);
  });
  const e = (id: string, formato: string): CatalogEntry => ({ id, cityId: 1, countryId: 1, categoryId: 12, price: 0, rating: 4, reviews: 1, durationMinutes: 120, createdAt: 0, updatedAt: 0, text: id, formato });
  const entries = [e("a", "pieza-libre"), e("b", "caminata"), e("c", "fuera"), e("d", "traslado"), e("f", "caminata"), e("g", "por-revisar")];
  it("REQ-413 / REQ-261 encendida: /tours sin fuera, por-revisar ni traslados; ?formato= filtra; conteos sin el filtro de formato", () => {
    const r = queryCatalog(entries, { taxonomy: true, formatos: ["caminata"] }, { limit: 50 });
    expect(r.ids.sort()).toEqual(["b", "f"]);
    expect(r.formatCounts).toEqual({ "pieza-libre": 1, caminata: 2 });
  });
  it("REQ-413 apagada: queryCatalog igual que hoy (todo entra, ?formato= no filtra, sin conteos)", () => {
    const r = queryCatalog(entries, { formatos: ["caminata"] }, { limit: 50 });
    expect(r.ids).toHaveLength(6);
    expect(r.formatCounts).toBeUndefined();
  });
  it("REQ-413 los viajes propios también se filtran por formato", () => {
    const trip = { countries: ["PE"], kind: "circuito" as const, formato: "circuito" };
    expect(matchesToursFilter(trip, { kind: "all", formatos: ["circuito"] } as never)).toBe(true);
    expect(matchesToursFilter(trip, { kind: "all", formatos: ["tour"] } as never)).toBe(false);
  });
});

describe("REQ-269 chip de pieza-libre = «Pieza libre» (PO 6-11 10:43)", () => {
  it("el chip dice «Pieza libre» en español y «Free Puzzle» en inglés (REQ-1103), igual que el diccionario", async () => {
    const { DEFAULT_DICTIONARY } = await import("@/taxonomy/data");
    const t = DEFAULT_DICTIONARY.terminos.find((x) => x.slug === "pieza-libre")!;
    expect(formatoLabel("pieza-libre", "es")).toBe("Pieza libre");
    expect(formatoLabel("pieza-libre", "en")).toBe("Free Puzzle");
    expect(FORMATO_LABEL["pieza-libre"]).toEqual({ es: t.termino_es, en: t.termino_en });
  });
});
