import { describe, it, expect } from "vitest";
import { sourceStrings, fingerprint, planTranslation, applyTranslations, setManual, localized, buildPrompt, parseModelOutput, chunk, translationStatus, type Translations } from "./translation";

const trip = {
  titleEs: "Oaxaca: clase de cocina", summaryEs: "Cocina mole", descriptionEs: "", importantInfo: "Llega 10 min antes",
  whatToBring: "", accessibility: "", visaInfo: "", priceNote: "", videoCaption: "", endPoint: "",
  highlights: ["Cocina mole", "Recorre el mercado"], includes: ["Comida"], excludes: [],
  itinerary: [{ title: "Llegada", text: "Te recogemos" }], options: [{ id: "g1", name: "En grupo" }], extras: [{ name: "Fotos" }],
  meetingPoints: [{ instructions: "Busca la bandera azul" }],
};

describe("sourceStrings", () => {
  it("solo textos con contenido, con llave estable", () => {
    expect(sourceStrings(trip)).toEqual({
      title: "Oaxaca: clase de cocina", summary: "Cocina mole", importantInfo: "Llega 10 min antes",
      "highlights.0": "Cocina mole", "highlights.1": "Recorre el mercado", "includes.0": "Comida",
      "itinerary.0.title": "Llegada", "itinerary.0.text": "Te recogemos", "options.g1.name": "En grupo", "extras.0.name": "Fotos",
      "meetingPoints.0.instructions": "Busca la bandera azul",
    });
  });
});

describe("planTranslation", () => {
  const src = { title: "Hola", summary: "Adiós" };
  it("traduce lo que falta o cambió; respeta lo editado a mano", () => {
    const existing: Translations["en"] = {
      title: { text: "Hi", src: fingerprint("Hola"), manual: false },
      summary: { text: "Bye!!", src: fingerprint("Adiós viejo"), manual: true },
    };
    expect(planTranslation(src, existing)).toEqual({ todo: [], outdatedManual: ["summary"] });
    expect(planTranslation({ ...src, title: "Hola de nuevo" }, existing).todo).toEqual(["title"]);
    expect(planTranslation(src, undefined).todo).toEqual(["title", "summary"]);
  });
});

describe("applyTranslations / setManual", () => {
  it("guarda con huella, quita llaves que ya no existen y no pisa lo manual", () => {
    const t: Translations = { en: { old: { text: "x", src: "1", manual: false }, summary: { text: "Mine", src: "9", manual: true } } };
    const out = applyTranslations(t, "en", { title: "Hi", summary: "Bye" }, { title: "Hola", summary: "Adiós" });
    expect(out.en).toEqual({ title: { text: "Hi", src: fingerprint("Hola"), manual: false }, summary: { text: "Mine", src: "9", manual: true } });
  });
  it("edición manual con candado", () => {
    const out = setManual({}, "fr", "title", "Bonjour", "Hola");
    expect(out.fr?.title).toEqual({ text: "Bonjour", src: fingerprint("Hola"), manual: true });
  });
});

describe("localized", () => {
  it("usa la traducción y si no hay, el español", () => {
    const t: Translations = { en: { title: { text: "Cooking class", src: "x", manual: false } } };
    expect(localized(t, "en", "title", "Clase de cocina")).toBe("Cooking class");
    expect(localized(t, "pt", "title", "Clase de cocina")).toBe("Clase de cocina");
    expect(localized(t, "es", "title", "Clase de cocina")).toBe("Clase de cocina");
  });
});

describe("prompt y respuesta del modelo", () => {
  it("el prompt pide JSON, respeta el glosario y no inventa", () => {
    const m = buildPrompt("de", { title: "Free tour por Oaxaca con Travel Puzzle" });
    const all = m.map((x) => x.content).join("\n");
    expect(all).toMatch(/German/);
    expect(all).toMatch(/Travel Puzzle/);
    expect(all).toMatch(/Free tour/);
    expect(all).toMatch(/JSON/);
  });
  it("lee el JSON aunque venga envuelto y descarta llaves que no pedimos", () => {
    expect(parseModelOutput('Aquí está:\n```json\n{"title":"Hallo","x":"no"}\n```', ["title", "summary"])).toEqual({ title: "Hallo" });
    expect(parseModelOutput("no es json", ["title"])).toEqual({});
  });
  it("parte en lotes por número de textos y tamaño", () => {
    const items = Object.fromEntries(Array.from({ length: 25 }, (_, i) => [`k${i}`, "x".repeat(10)]));
    expect(chunk(items, 10, 10_000).map((c) => Object.keys(c).length)).toEqual([10, 10, 5]);
    expect(chunk({ a: "x".repeat(50), b: "y".repeat(50) }, 10, 60).length).toBe(2);
  });
});

describe("translationStatus", () => {
  it("cuenta por idioma: listos, pendientes y manuales desactualizados", () => {
    const src = { title: "Hola", summary: "Adiós" };
    const t: Translations = { en: { title: { text: "Hi", src: fingerprint("Hola"), manual: false } } };
    expect(translationStatus(src, t).en).toEqual({ done: 1, pending: 1, outdatedManual: 0 });
    expect(translationStatus(src, t).fr).toEqual({ done: 0, pending: 2, outdatedManual: 0 });
  });
});

import { keyLabel } from "./translation";
describe("keyLabel", () => {
  it("nombres en español para el gestor", () => {
    expect(keyLabel("title")).toBe("Título");
    expect(keyLabel("highlights.0")).toBe("Destacado 1");
    expect(keyLabel("itinerary.2.text")).toBe("Día 3 · texto");
    expect(keyLabel("options.g1.name")).toBe("Nombre de la opción");
  });
});
