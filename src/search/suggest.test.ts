import { describe, expect, it, vi } from "vitest";
import type { CatalogEntry } from "@/catalog/lib/query";
import { isSearchSuggest, recoverFor, suggestFor, type SuggestDeps } from "./suggest";

let n = 0;
const e = (cityId: number, cityNames: string[], text: string, categoryId = 12, reviews = 1): CatalogEntry => ({
  id: `T${++n}`, cityId, countryId: 10, categoryId, price: 0, rating: 5, reviews, durationMinutes: 120, createdAt: 0, updatedAt: 0,
  text, cityNames, countryNames: ["espana"],
});
const entries = [
  e(1, ["barcelona"], "free tour barcelona gotico", 12, 50),
  e(1, ["barcelona"], "museo picasso barcelona", 20, 9),
  e(3, ["roma", "rome"], "free tour roma coliseo", 12, 99),
];
const deps = (env: SuggestDeps["env"], over: Partial<SuggestDeps> = {}): SuggestDeps => ({
  loadCatalog: async () => entries,
  cityTranslations: async (ids) => ids.map((id) => ({ id, translations: JSON.stringify(id === 1 ? { es: "Barcelona", en: "Barcelona" } : { es: "Roma", en: "Rome" }) })),
  countryTranslations: async (ids) => ids.map((id) => ({ id, translations: { es: "España", en: "Spain" } })),
  tourTitles: async (ids, language) => ids.map((tourId) => ({ tourId, language, title: `Título ${tourId}` })),
  env, ...over,
});
const ON = { SEARCH_SUGGEST_ENABLED: "true", SEARCH_V2_ENABLED: "true", SEARCH_FUZZY_ENABLED: "true" };

describe("REQ-290 SEARCH_SUGGEST_ENABLED", () => {
  it("solo «true» la enciende (sin la variable, apagada)", () => {
    expect(isSearchSuggest("true")).toBe(true);
    for (const v of [undefined, "false", "1", "TRUE"]) expect(isSearchSuggest(v)).toBe(false);
  });
  it("apagada: no responde nada ni lee el catálogo", async () => {
    const load = vi.fn(async () => entries);
    expect(await suggestFor(deps({}, { loadCatalog: load }), "barc", "es")).toBeNull();
    expect(await recoverFor(deps({}, { loadCatalog: load }), "barc", "es")).toBeNull();
    expect(load).not.toHaveBeenCalled();
  });
});

describe("REQ-290/291 sugerencias con nombres reales", () => {
  it("«barc» → Barcelona (con su conteo) y sus tours por reseñas", async () => {
    const r = (await suggestFor(deps(ON), "barc", "es"))!;
    expect(r.items[0]).toEqual({ group: "destination", label: "Barcelona", href: "/tours?search=Barcelona", hint: "2 tours" });
    expect(r.items.filter((x) => x.group === "tour").map((x) => x.href)).toEqual(["/tours/T1", "/tours/T2"]);
  });
  it("«Barselona» → corregido: «Mostrando resultados de Barcelona»", async () => {
    const r = (await suggestFor(deps(ON), "Barselona", "es"))!;
    expect(r.corrected).toBe(true);
    expect(r.correctedLabel).toBe("Barcelona");
  });
  it("«Rma» → «¿Quisiste decir Roma?» sin corregir", async () => {
    const r = (await suggestFor(deps(ON), "Rma", "es"))!;
    expect(r.corrected).toBe(false);
    expect(r.items[0]).toMatchObject({ group: "didYouMean", label: "Roma" });
  });
  it("menos de 3 letras: lista vacía sin leer nada", async () => {
    const load = vi.fn(async () => entries);
    expect((await suggestFor(deps(ON, { loadCatalog: load }), "ba", "es"))!.items).toEqual([]);
    expect(load).not.toHaveBeenCalled();
  });
  it("un nombre o un título inválido se descarta y no tumba la respuesta", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const r = (await suggestFor(deps(ON, {
      cityTranslations: async (ids) => ids.map((id) => ({ id, translations: "{no es json" })),
      tourTitles: async (ids) => ids.map((tourId) => ({ tourId, language: "es", title: 42 })),
    }), "barc", "es"))!;
    expect(r.items.filter((x) => x.group !== "category")).toEqual([]);
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });
  it("sin SEARCH_FUZZY no hay corrección (solo prefijo)", async () => {
    const r = (await suggestFor(deps({ ...ON, SEARCH_FUZZY_ENABLED: "false" }), "Barselona", "es"))!;
    expect(r.corrected).toBe(false);
  });
});

describe("REQ-292 cero resultados", () => {
  it("una sola alternativa con resultados se aplica sola; siempre hay WhatsApp", async () => {
    const r = (await recoverFor(deps(ON), "coliseo submarino", "es"))!;
    expect(r.autoApply).toBe("coliseo");
    expect(r.alternatives[0].tours[0]).toEqual({ group: "tour", label: "Título T3", href: "/tours/T3" });
    expect(r.whatsapp.startsWith("https://wa.me/5215536490320?text=")).toBe(true);
    expect(r.popular.map((x) => x.label)).toEqual(["Barcelona", "Roma"]);
  });
});
