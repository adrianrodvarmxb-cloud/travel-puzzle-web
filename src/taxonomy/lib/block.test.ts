import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { DEFAULT_DICTIONARY as D, DEFAULT_MAPPINGS as M } from "../data/index";
import { ATRIBUTOS_DECISION_11, blockCardLabel, blockFacets, blockGates, blockLabels, classifyBlock, taxonomyBlock, taxonomyBlockEnabled } from "./block";
import { classify } from "./classify";
import { DEFAULT_GATES } from "./gates";
import { tourLabels } from "./copy";
import { categoryLabel } from "@/tours/lib/experience-card";
import { fichaFacets } from "@/seo/lib/taxonomy-facets";
import { wranglerVars } from "@/site/lib/pages";
import type { ClassifyInput } from "./types";
import { destinationTree, findCity } from "@/destinations/lib/catalog";
import { fx, tour } from "@/destinations/fixtures/destinos";
import { tourPage } from "@/destinations/lib/page-model";

// REQ-10686 (ficha única, ola 3, bloque único de taxonomía) y REQ-10687 (bandera TAXONOMY_BLOCK_ENABLED).
// npx vitest run src/taxonomy/lib/block.test.ts
const tangol = { proveedor: "tangol", lang: "es", decision11: true } as const;
/** El caso del plan (§4, «Taxonomía»): Minitrekking = Excursión de un día con Aventura y Montaña y senderismo. */
const minitrekking = { formato: "excursion-dia" as const, temas: ["aventura", "montana-senderismo"] as ("aventura" | "montana-senderismo")[], atributos: ["dia-completo", "medio:a-pie", "guiado", "calificacion", "favorito"] };
const tg = (categoriaId: string, titulo: string, extra: Partial<ClassifyInput> = {}): ClassifyInput =>
  ({ proveedor: "tangol", categoriaId, precio: 80, durationMinutes: 480, titulo, ...extra });
const ft = (categoryId: number, titulo: string, extra: Partial<ClassifyInput> = {}): ClassifyInput =>
  ({ proveedor: "freetour", categoriaId: categoryId, precio: 20, durationMinutes: 120, titulo, ...extra });

describe("REQ-10686: bloque único de taxonomía (tipo + hasta 3 temas + atributos)", () => {
  it("REQ-10686: «minitrekking» = Excursión de un día con Aventura y Montaña y senderismo, en es y en", () => {
    const es = taxonomyBlock(minitrekking, tangol);
    expect(es.tipo).toEqual({ slug: "excursion-dia", label: "Excursión de un día" });
    expect(es.temas.map((t) => t.label)).toEqual(["Aventura", "Montaña y senderismo"]);
    expect(blockLabels(es)).toEqual(["Excursión de un día", "Aventura", "Montaña y senderismo", "Día completo", "A pie"]);
    const en = taxonomyBlock(minitrekking, { ...tangol, lang: "en" });
    expect(blockLabels(en)).toEqual(["Day trip", "Adventure", "Mountains & hiking", "Full day", "On foot"]);
    // Los demás idiomas del sitio leen el inglés, como el filtro (REQ-531).
    expect(blockLabels(taxonomyBlock(minitrekking, { ...tangol, lang: "pt" }))).toEqual(blockLabels(en));
  });

  it("REQ-10686: tarjeta, ficha y marcado leen el mismo bloque y dan lo mismo", () => {
    const b = taxonomyBlock(minitrekking, tangol);
    const tarjeta = blockCardLabel(b);
    const ficha = blockLabels(b);
    const marcado = blockFacets(b);
    expect(tarjeta).toBe("Excursión de un día");
    expect(marcado.tipo).toBe(tarjeta);
    expect(ficha[0]).toBe(tarjeta);
    expect(new Set(ficha)).toEqual(new Set([marcado.tipo!, ...marcado.etiquetas]));
    // La etiqueta del tipo es la misma que hoy usa la tarjeta (categoryLabel), para que nada cambie al encender.
    expect(tarjeta).toBe(categoryLabel("excursion-dia", "es"));
  });

  it("REQ-10686: calificación y favorito nunca son etiqueta; «guiado» (oculto) tampoco; sin repetidos", () => {
    const b = taxonomyBlock({ ...minitrekking, atributos: ["calificacion", "favorito", "guiado", "dia-completo", "dia-completo"] }, tangol);
    expect(b.atributos.map((a) => a.label)).toEqual(["Día completo"]);
  });

  it("REQ-10686: decisión 10: en FREETOUR solo el tipo y las dos facetas de hoy; sin temas ni decisión 11", () => {
    const clase = { formato: "visita-guiada" as const, temas: ["cultural" as const, "urbano" as const], atributos: ["entrada-incluida", "dia-completo", "medio:a-pie", "con-traslado", "idioma-es"] };
    const b = taxonomyBlock(clase, { proveedor: "freetour", lang: "es", decision11: true });
    expect(b.tipo?.label).toBe("Visita guiada");
    expect(b.temas).toEqual([]);
    expect(b.atributos.map((a) => a.slug)).toEqual(["entrada-incluida", "dia-completo"]);
    // Igual que los chips de hoy (REQ-544): formato + facetas.
    expect(blockLabels(b)).toEqual(tourLabels("visita-guiada", "es", clase.atributos));
  });

  it("REQ-10686: decisión 11: «Con traslado» y «Cancelación gratuita» (tras_bandera) salen solo con el bloque encendido", () => {
    const clase = { formato: "excursion-dia" as const, temas: [], atributos: ["con-traslado", "cancelacion-gratis", "dia-completo"] };
    expect(ATRIBUTOS_DECISION_11).toEqual(["con-traslado", "dia-completo", "cancelacion-gratis"]);
    for (const slug of ["con-traslado", "cancelacion-gratis"]) expect(D.terminos.find((t) => t.slug === slug)?.estado).toBe("tras_bandera");
    expect(blockLabels(taxonomyBlock(clase, { ...tangol, decision11: true }))).toEqual(["Excursión de un día", "Con traslado", "Cancelación gratuita", "Día completo"]);
    expect(blockLabels(taxonomyBlock(clase, { ...tangol, decision11: false }))).toEqual(["Excursión de un día", "Día completo"]);
    // Otros términos tras_bandera (franja horaria, VIP…) no entran ni con el bloque encendido.
    expect(blockLabels(taxonomyBlock({ ...clase, atributos: ["vip", "franja-horaria"] }, { ...tangol, decision11: true }))).toEqual(["Excursión de un día"]);
  });

  it("REQ-10686: hasta 3 temas, en el orden del clasificador; un tema que no está activo o no existe se salta", () => {
    const b = taxonomyBlock({ formato: "tour", temas: ["urbano", "cultural", "gastronomia", "naturaleza", "aventura"] as never[], atributos: [] }, tangol);
    expect(D.terminos.find((t) => t.slug === "urbano")?.estado).toBe("muestra");
    expect(b.temas.map((t) => t.slug)).toEqual(["cultural", "gastronomia", "naturaleza"]);
    expect(taxonomyBlock({ formato: "tour", temas: ["no-existe"] as never[], atributos: [] }, tangol).temas).toEqual([]);
  });

  it("REQ-10686: `por-revisar` y `fuera` no tienen bloque; un formato fuera del filtro usa su nombre del diccionario", () => {
    expect(taxonomyBlock({ formato: "por-revisar", temas: [], atributos: ["dia-completo"] }, tangol)).toEqual({ tipo: null, temas: [], atributos: [] });
    expect(taxonomyBlock({ formato: "fuera", temas: [], atributos: [] }, tangol)).toEqual({ tipo: null, temas: [], atributos: [] });
    expect(taxonomyBlock({ formato: "traslado", temas: [], atributos: [] }, tangol).tipo).toEqual({ slug: "traslado", label: "Traslado" });
  });

  it("REQ-10686: «Día completo» desde 6 h en toda actividad con el bloque encendido; con el clasificador real de Tangol", () => {
    const largo = tg("9000002", "Excursión a El Chaltén", { durationMinutes: 600 });
    const corto = tg("9000002", "Excursión a El Chaltén", { durationMinutes: 240 });
    const on = classifyBlock(largo, { lang: "es", decision11: true });
    expect(on.tipo?.label).toBe("Excursión de un día");
    expect(on.atributos.map((a) => a.slug)).toContain("dia-completo");
    expect(classifyBlock(corto, { lang: "es", decision11: true }).atributos.map((a) => a.slug)).not.toContain("dia-completo");
    // Apagado = como hoy: la excursión no lleva «Día completo» (REQ-540 solo lo daba a tour, visita guiada y caminata).
    expect(classifyBlock(largo, { lang: "es", decision11: false }).atributos.map((a) => a.slug)).not.toContain("dia-completo");
  });

  it("REQ-10686: con el bloque apagado, el marcado da lo mismo que fichaFacets de hoy (nada cambia al publicar apagado)", () => {
    for (const i of [tg("9000002", "Excursión a El Chaltén", { durationMinutes: 600 }), tg("9000001", "City tour por Buenos Aires"), ft(4, "Excursión a Toledo desde Madrid", { durationMinutes: 540 }), ft(1, "Free tour por Madrid", { precio: 0 })]) {
      for (const lang of ["es", "en"]) {
        const hoy = fichaFacets(i, lang);
        const bloque = blockFacets(classifyBlock(i, { lang, decision11: false }));
        expect(bloque.tipo, `${i.titulo} ${lang}`).toBe(hoy.tipo);
        if (i.proveedor === "freetour") expect(bloque.etiquetas.every((e) => hoy.etiquetas.includes(e)), `${i.titulo} ${lang}`).toBe(true);
        else expect(bloque.etiquetas, `${i.titulo} ${lang}`).toEqual(hoy.etiquetas);
      }
    }
  });

  it("REQ-10686: un proveedor sin mapeo no tiene bloque", () => {
    expect(classifyBlock({ proveedor: "desconocido", categoriaId: 1, precio: 10, titulo: "X" }, { lang: "es" })).toEqual({ tipo: null, temas: [], atributos: [] });
  });
});

describe("REQ-10687: bandera TAXONOMY_BLOCK_ENABLED", () => {
  it("REQ-10687: en wrangler.jsonc existe y está en \"false\"", () => {
    const vars = wranglerVars(readFileSync("wrangler.jsonc", "utf8"));
    expect(vars.TAXONOMY_BLOCK_ENABLED).toBe("false");
  });
  it("REQ-10687: solo \"true\" exacto la enciende, y solo con TAXONOMY_PUBLISH_ENABLED", () => {
    expect(taxonomyBlockEnabled({ TAXONOMY_BLOCK_ENABLED: "true", TAXONOMY_PUBLISH_ENABLED: "true" })).toBe(true);
    expect(taxonomyBlockEnabled({ TAXONOMY_BLOCK_ENABLED: "true" })).toBe(false);
    expect(taxonomyBlockEnabled({ TAXONOMY_BLOCK_ENABLED: "TRUE", TAXONOMY_PUBLISH_ENABLED: "true" })).toBe(false);
    expect(taxonomyBlockEnabled({ TAXONOMY_BLOCK_ENABLED: "false", TAXONOMY_PUBLISH_ENABLED: "true" })).toBe(false);
    expect(taxonomyBlockEnabled({})).toBe(false);
  });
  it("REQ-10687: el bloque encendido prende la decisión 11 y no toca ningún otro gate", () => {
    expect(blockGates(true)).toEqual({ ...DEFAULT_GATES, atributosDecision11: true });
    expect(blockGates(false)).toEqual(DEFAULT_GATES);
    expect(DEFAULT_GATES.atributosDecision11).toBe(false);
    // Con el bloque apagado el clasificador es el de hoy, término por término.
    const i = tg("9000002", "Excursión a El Chaltén", { durationMinutes: 600, conTraslado: true });
    expect(classify(i, D, M, blockGates(false))).toEqual(classify(i, D, M));
  });
});

describe("REQ-10686: cableado en la ficha (tourPage) tras la bandera", () => {
  const site = "https://travelpuzzle.com.mx";
  const now = new Date("2026-11-05T12:00:00Z");
  const tours = [
    tour(10, 1, { title: "Excursión a Teotihuacán", price: 80, reviews: 300 }),
    tour(10, 1, { title: "Centro Histórico", reviews: 900 }),
  ].map((t) => ({ ...t, providerId: "tangol" }));
  const tree = destinationTree({ ...fx, tours, trips: [], now });
  const cdmx = findCity(tree, "mx", "ciudad-de-mexico")!;
  const paid = { ...cdmx.city.paidTours[0], formato: "excursion-dia", atributos: ["dia-completo"] };
  const detail = { providerId: "tangol", categoryId: 9_000_002, durationMinutes: 600 };

  it("REQ-10686: apagado (por defecto), la ficha da lo mismo que hoy, chip por chip y en el marcado", () => {
    const sin = tourPage({ country: cdmx.country, city: cdmx.city, tour: paid, siteUrl: site, lang: "es", labels: true, detail });
    const off = tourPage({ country: cdmx.country, city: cdmx.city, tour: paid, siteUrl: site, lang: "es", labels: true, detail, block: false });
    expect(off.labels).toEqual(sin.labels);
    expect(off.facets).toEqual(sin.facets);
    expect(off.jsonLd).toEqual(sin.jsonLd);
  });

  it("REQ-10686: encendido, chips y marcado salen del mismo bloque: el tipo del chip es el tipo del marcado y las etiquetas coinciden", () => {
    const on = tourPage({ country: cdmx.country, city: cdmx.city, tour: paid, siteUrl: site, lang: "es", labels: true, detail, block: true });
    expect(on.facets.tipo).toBe("Excursión de un día");
    expect(on.labels[0]).toBe(on.facets.tipo);
    expect(new Set(on.labels)).toEqual(new Set([on.facets.tipo!, ...on.facets.etiquetas]));
    // Decisión 11 encendida con el bloque: la excursión de 10 h lleva «Día completo» también en el marcado.
    expect(on.facets.etiquetas).toContain("Día completo");
    expect(JSON.stringify(on.jsonLd[0])).toContain("Día completo");
  });

  it("REQ-10686: encendido, en FREETOUR el bloque se queda en tipo y facetas (decisión 10) y el marcado sigue sin facetas (sin enriquecimiento)", () => {
    const ft = { ...cdmx.city.paidTours[0], providerId: "freetour", formato: "visita-guiada", atributos: ["entrada-incluida", "idioma-es", "medio:a-pie"] };
    const on = tourPage({ country: cdmx.country, city: cdmx.city, tour: ft, siteUrl: site, lang: "es", labels: true, detail: { providerId: "freetour" }, block: true });
    expect(on.labels).toEqual(["Visita guiada", "Entrada incluida"]);
    expect(on.facets).toEqual({ tipo: null, etiquetas: [] }); // REQ-581: vacío en FREETOUR, también con el bloque
    expect(JSON.stringify(on.jsonLd[0])).not.toContain("Entrada incluida"); // REQ-570/581: sin enriquecimiento no entra al marcado
  });
});
