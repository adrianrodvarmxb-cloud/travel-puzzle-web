import { describe, it, expect, afterEach, vi } from "vitest";
import { experiencesCount } from "./catalog-name";
import { translations } from "@/lib/translations";
import { homeCopy } from "@/home/lib/copy";
import { formatCount } from "@/home/lib/format";
import { llmsTxt } from "@/seo/lib/robots";
import { withToursText } from "@/home/lib/hero";

const LANGS = ["es", "en", "pt", "de", "fr", "it"] as const;
/** «tour/tours» genérico; «free tour» es tipo de producto y se queda (decisión del PO, 6 nov 2026). */
const GENERIC_TOUR = /(?<!free\s)\b(tours?|touren)\b/i;
/** Con REQ-174 ninguna etiqueta del home queda fuera de la revisión. */
const MENU_KEYS = new Set<string>();

function texts(obj: unknown): string[] {
  if (typeof obj === "string") return [obj];
  if (typeof obj === "function") {
    const out = (obj as (...a: unknown[]) => unknown)("2", "3");
    return typeof out === "string" ? [out] : Array.isArray(out) ? out.flat(2).filter((x): x is string => typeof x === "string") : [];
  }
  if (Array.isArray(obj)) return obj.flatMap(texts);
  if (obj && typeof obj === "object") return Object.values(obj).flatMap(texts);
  return [];
}

describe("REQ-173: copy genérico del catálogo: «experiencias» en lugar de «tours»", () => {
  it("REQ-173: home en español con el copy pedido por el PO", () => {
    const c = homeCopy("es");
    expect(c.searchPlaceholder).toBe("¿A dónde vas? Ciudad, país o experiencia");
    expect(`${formatCount(8054, "es")} ${c.statTours}`).toBe("8,054 experiencias disponibles");
    expect(c.tours("1")).toBe("1 experiencia");
    expect(c.tours("37")).toBe("37 experiencias");
    expect(c.seeToursIn("Roma")).toBe("Ver experiencias en Roma →");
    expect(c.seeAll).toBe("Ver todas las experiencias");
  });

  it("REQ-173: home en inglés", () => {
    const c = homeCopy("en");
    expect(c.searchPlaceholder).toBe("Where to? City, country or experience");
    expect(c.statTours).toBe("experiences available");
    expect(c.tours("1")).toBe("1 experience");
    expect(c.tours("12")).toBe("12 experiences");
    expect(c.seeToursIn("Rome")).toBe("See experiences in Rome →");
  });

  it.each(["es", "en"])("REQ-173: ningún texto del home (%s) dice «tours» genérico, salvo la etiqueta de navegación; «Free tour» se queda", (lang) => {
    const c = homeCopy(lang);
    const rest = Object.fromEntries(Object.entries(c).filter(([k]) => !MENU_KEYS.has(k)));
    const all = [...texts(rest), ...c.howSteps(true).flat(), ...c.howSteps(false).flat()];
    expect(all.filter((s) => GENERIC_TOUR.test(s))).toEqual([]);
    expect(c.free).toBe("Free tour");
  });

  it.each(LANGS)("REQ-173: los textos genéricos de /tours en %s ya no dicen «tours»", (lang) => {
    const t = translations[lang];
    const keys = ["tours.title", "tours.noResults", "tours.backToTours", "tours.eyebrow", "tours.filters.searchPlaceholder", "tours.map.empty"];
    expect(keys.filter((k) => GENERIC_TOUR.test(t[k]))).toEqual([]);
  });

  it("REQ-173: buscador y contador de /tours iguales al home", () => {
    expect(translations.es["tours.filters.searchPlaceholder"]).toBe("¿A dónde vas? Ciudad, país o experiencia");
    expect(translations.en["tours.filters.searchPlaceholder"]).toBe("Where to? City, country or experience");
    expect(translations.es["tours.eyebrow"].replace("{count}", "8,054")).toBe("8,054 EXPERIENCIAS DISPONIBLES");
    expect(translations.en["tours.eyebrow"].replace("{count}", "8,054")).toBe("8,054 EXPERIENCES AVAILABLE");
  });

  it("REQ-173: conteo de /destinos en singular y plural", () => {
    expect(experiencesCount("1", "es")).toBe("1 experiencia");
    expect(experiencesCount("1,204", "es")).toBe("1,204 experiencias");
    expect(experiencesCount("2", "en")).toBe("2 experiences");
  });

  it("REQ-173: llms.txt describe el buscador como de experiencias", () => {
    expect(llmsTxt({ siteUrl: "https://t.mx", destinations: [] })).toContain("(https://t.mx/tours): buscador de experiencias.");
  });
});

describe("REQ-173 + INC-001: la cifra «8,054» no depende del Intl del navegador", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("REQ-173: mismo texto aunque el Intl del navegador formatee distinto", () => {
    class Weird { format() { return "8 054 (otro ICU)"; } }
    vi.stubGlobal("Intl", { ...Intl, NumberFormat: Weird });
    expect(formatCount(8054, "es")).toBe("8,054");
    expect(formatCount(8054, "en")).toBe("8,054");
    expect(formatCount(1234567, "es")).toBe("1,234,567");
    expect(formatCount(999, "es")).toBe("999");
    expect(formatCount(8054, "de")).toBe("8.054");
    expect(formatCount(0, "es")).toBe("0");
  });

  it("REQ-173: la tarjeta del hero dice «1,343 experiencias» con el número del servidor", () => {
    const [s] = withToursText([{ image: "/x.webp", focus: "50% 50%", href: "/tours", tours: 1343, names: { es: "Venecia" } }], "es");
    expect(homeCopy("es").tours(s.toursText!)).toBe("1,343 experiencias");
  });
});
