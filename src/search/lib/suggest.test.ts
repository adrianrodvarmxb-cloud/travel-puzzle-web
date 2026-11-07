import { describe, expect, it } from "vitest";
import type { CatalogEntry } from "@/catalog/lib/query";
import type { FuzzyResult } from "./fuzzy";
import {
  cleanQuery, didYouMean, dropOneWord, highlight, nextActive, planRecovery, planSuggestions, suggestCategories,
  suggestDestinations, MAX_ITEMS_DESKTOP, MIN_CHARS, DEBOUNCE_MS, MAX_ITEMS_MOBILE,
} from "./suggest";
import { categoryHref, fill, searchHref, suggestCopy, tourCount, whatsappHref, WHATSAPP_NUMBER } from "./suggest-copy";

let n = 0;
const e = (cityId: number, cityNames: string[], countryId: number, countryNames: string[], text: string, categoryId: number | null = 12, reviews = 1): CatalogEntry => ({
  id: `T${++n}`, cityId, countryId, categoryId, price: 0, rating: 5, reviews, durationMinutes: 120, createdAt: 0, updatedAt: 0,
  text, cityNames, countryNames,
});
const entries: CatalogEntry[] = [
  e(1, ["barcelona"], 10, ["espana", "spain"], "free tour barcelona gotico", 12, 50),
  e(1, ["barcelona"], 10, ["espana", "spain"], "tapas barcelona gastronomia", 5, 30),
  e(1, ["barcelona"], 10, ["espana", "spain"], "museo picasso barcelona entradas", 20, 10),
  e(2, ["barbastro"], 10, ["espana", "spain"], "free tour barbastro"),
  e(3, ["roma", "rome"], 20, ["italia", "italy"], "free tour roma coliseo", 12, 99),
  e(3, ["roma", "rome"], 20, ["italia", "italy"], "coliseo entradas roma", 20, 70),
  e(4, ["cusco"], 30, ["peru"], "free tour cusco"),
];
const res = (text: string, extra: Partial<FuzzyResult> = {}): FuzzyResult => ({ text, changes: [], suggestions: [], ...extra });

describe("REQ-290 autocompletado agrupado", () => {
  it("desde 3 caracteres, debounce 250 ms, máx. 10 en escritorio y 6 en celular", () => {
    expect([MIN_CHARS, DEBOUNCE_MS, MAX_ITEMS_DESKTOP, MAX_ITEMS_MOBILE]).toEqual([3, 250, 10, 6]);
    expect(cleanQuery("ba")).toBeNull();
    expect(cleanQuery("  bar ")).toBe("bar");
    expect(cleanQuery("b a")).toBeNull();
    expect(cleanQuery("x".repeat(200))!.length).toBe(80);
    expect(cleanQuery("bar\u0000celona")).toBe("bar celona");
  });
  it("destinos que empiezan con lo escrito, los de más tours primero", () => {
    expect(suggestDestinations(entries, res("bar")).map((d) => `${d.kind}:${d.id}`)).toEqual(["city:1", "city:2"]);
    expect(suggestDestinations(entries, res("esp")).map((d) => `${d.kind}:${d.id}`)).toEqual(["country:10"]);
  });
  it("el destino corregido por S2 va primero aunque lo escrito no empiece igual", () => {
    const r = res("barcelona", { changes: [{ from: "varselona", to: "barcelona", kind: "typo" }] });
    expect(suggestDestinations(entries, r)[0]).toEqual({ kind: "city", id: 1, count: 3, corrected: true });
  });
  it("tipos de actividad por palabra («museos» → Entradas, museos y pases); nunca «Otros» ni transporte", () => {
    expect(suggestCategories(entries, "museos")).toEqual([{ id: "entradas", count: 2 }]);
    expect(suggestCategories(entries, "gastro")).toEqual([{ id: "gastronomia", count: 1 }]);
    expect(suggestCategories(entries, "otros")).toEqual([]);
    expect(suggestCategories(entries, "transporte")).toEqual([]);
  });
  it("el plan respeta el tope de 10 y trae tours por reseñas", () => {
    const p = planSuggestions(entries, res("roma"), true);
    expect(p.destinations.map((d) => d.id)).toEqual([3]);
    expect(p.tourIds.length).toBeGreaterThan(0);
    expect(p.destinations.length + p.tourIds.length + p.categories.length).toBeLessThanOrEqual(MAX_ITEMS_DESKTOP);
    expect(p.corrected).toBe(false);
  });
});

describe("REQ-290 tours sugeridos solo por palabra o inicio de palabra (hallazgo del ensayo del 6 nov)", () => {
  it("«rma» no trae tours que solo contienen «rma» dentro de otra palabra (germany, forma)", () => {
    const extra = [...entries, e(9, ["berlin"], 40, ["alemania", "germany"], "free tour berlin germany"), e(9, ["berlin"], 40, ["alemania"], "tour en forma de bici")];
    expect(planSuggestions(extra, res("rma"), true).tourIds).toEqual([]);
    expect(planSuggestions(extra, res("forma"), true).tourIds.length).toBe(1);
    expect(planSuggestions(extra, res("colis"), true).tourIds.length).toBe(2);
  });
});

describe("REQ-291 «¿Quisiste decir…?» dentro del desplegable", () => {
  it("«Rma» propone Roma sin filtrar", () => {
    const r = res("Rma", { suggestions: [{ from: "rma", options: ["roma"] }] });
    expect(didYouMean(entries, r)).toEqual([{ kind: "city", id: 3, count: 2, corrected: false }]);
    expect(planSuggestions(entries, r, true).corrected).toBe(false);
  });
  it("sin sugerencias de S2 no hay «¿Quisiste decir…?»", () => {
    expect(didYouMean(entries, res("roma"))).toEqual([]);
  });
});

describe("REQ-292 cero resultados con salida", () => {
  it("alternativas quitando una palabra (sin contar palabras vacías)", () => {
    expect(dropOneWord("tour nocturno en roma")).toEqual(["nocturno roma", "tour roma", "tour nocturno"]);
    expect(dropOneWord("roma")).toEqual([]);
    expect(dropOneWord("en roma")).toEqual([]);
  });
  it("solo alternativas con resultados, con hasta 3 tours de vista previa; una sola → se aplica sola", () => {
    const p = planRecovery(entries, res("coliseo submarino"), true);
    expect(p.alternatives.map((a) => a.query)).toEqual(["coliseo"]);
    expect(p.alternatives[0].tourIds.length).toBeLessThanOrEqual(3);
    expect(p.autoApply).toBe("coliseo");
  });
  it("sin alternativas: destinos populares y tipos de actividad con tours", () => {
    const p = planRecovery(entries, res("zzzz"), true);
    expect(p.alternatives).toEqual([]);
    expect(p.autoApply).toBeNull();
    expect(p.popular[0]).toMatchObject({ kind: "city", id: 1 });
    expect(p.categories.map((c) => c.id)).not.toContain("otros");
  });
});

describe("REQ-293 teclado y resaltado", () => {
  it("flechas dan la vuelta, Inicio/Fin y Escape regresa al cuadro de texto", () => {
    expect(nextActive(-1, "ArrowDown", 3)).toBe(0);
    expect(nextActive(2, "ArrowDown", 3)).toBe(0);
    expect(nextActive(0, "ArrowUp", 3)).toBe(2);
    expect(nextActive(-1, "ArrowUp", 3)).toBe(2);
    expect(nextActive(1, "Home", 3)).toBe(0);
    expect(nextActive(1, "End", 3)).toBe(2);
    expect(nextActive(1, "Escape", 3)).toBe(-1);
    expect(nextActive(1, "a", 3)).toBe(1);
    expect(nextActive(0, "ArrowDown", 0)).toBe(-1);
  });
  it("resalta lo que falta por escribir, sin importar acentos ni mayúsculas", () => {
    expect(highlight("Barcelona", "bar")).toEqual([{ text: "Bar", strong: false }, { text: "celona", strong: true }]);
    expect(highlight("Ciudad de México", "mexi")).toEqual([{ text: "Ciudad de ", strong: true }, { text: "Méxi", strong: false }, { text: "co", strong: true }]);
    expect(highlight("Roma", "xyz")).toEqual([{ text: "Roma", strong: true }]);
    expect(highlight("Roma", "")).toEqual([{ text: "Roma", strong: false }]);
  });
});

describe("REQ-294 textos: solo prometen lo que existe", () => {
  it("es y en completos; otros idiomas caen a inglés", () => {
    expect(suggestCopy("es").didYouMean).toBe("¿Quisiste decir…?");
    expect(suggestCopy("pt")).toEqual(suggestCopy("en"));
  });
  it("ningún texto promete gratis, rapidez, disponibilidad ni precio", () => {
    for (const lang of ["es", "en"]) {
      const all = Object.values(suggestCopy(lang)).join(" ").toLowerCase();
      for (const bad of ["gratis", "free", "inmediat", "instant", "minuto", "minute", "disponib", "availab", "precio", "price", "garant"]) expect(all).not.toContain(bad);
    }
  });
  it("WhatsApp al +52 1 55 3649 0320 con la búsqueda en el mensaje", () => {
    expect(WHATSAPP_NUMBER).toBe("5215536490320");
    const href = whatsappHref("es", "coliseo submarino");
    expect(href.startsWith("https://wa.me/5215536490320?text=")).toBe(true);
    expect(decodeURIComponent(href.split("text=")[1])).toContain("«coliseo submarino»");
  });
  it("enlaces internos y conteos sin Intl", () => {
    expect(searchHref("Ciudad de México")).toBe("/tours?search=Ciudad%20de%20M%C3%A9xico");
    expect(categoryHref("entradas")).toBe("/tours?tipo_act=entradas");
    expect(tourCount(suggestCopy("es"), 1)).toBe("1 tour");
    expect(tourCount(suggestCopy("es"), 1234)).toBe("1234 tours");
    expect(fill("a {x} b {y}", { x: 1 })).toBe("a 1 b {y}");
  });
});
