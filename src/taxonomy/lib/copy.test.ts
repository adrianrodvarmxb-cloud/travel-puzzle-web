import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEFAULT_DICTIONARY as D, DEFAULT_MAPPINGS as M } from "../data/index";
import { catalogClassifier } from "./publish";
import { cityFormatChips, cityIntro, operatedByFor, taxonomyLabelsEnabled, tourDescription, tourLabels, tourTitleByFormat } from "./copy";

const c = catalogClassifier(D, M);
const PROHIBIDO = /\bmsi\b|meses sin intereses|paga despu[eé]s|opciones de pago|gu[ií]a en espa[nñ]ol|freetour/i;

describe("T5 copy y etiquetas por formato (REQ-414, REQ-415, REQ-416, REQ-433, G-T9)", () => {
  it("REQ-415 bandera TAXONOMY_LABELS_ENABLED: solo con \"true\" y con la publicación (T3) encendida; wrangler.jsonc en \"false\"", () => {
    expect(taxonomyLabelsEnabled({ TAXONOMY_LABELS_ENABLED: "true" })).toBe(false);
    expect(taxonomyLabelsEnabled({ TAXONOMY_LABELS_ENABLED: "true", TAXONOMY_PUBLISH_ENABLED: "true" })).toBe(true);
    expect(readFileSync("wrangler.jsonc", "utf8")).toMatch(/"TAXONOMY_LABELS_ENABLED":\s*"false"/);
  });
  it("REQ-416 decisión del PO: con «autoguiado» o «self-guided» en el título no hay guía en persona aunque la categoría sea guiada", () => {
    expect(c({ categoryId: 13, price: 20, title: "Juego de exploración autoguiado" }).guiaEnPersona).toBe(false);
    expect(c({ categoryId: 13, price: 20, title: "Self-guided city game" }).guiaEnPersona).toBe(false);
    expect(c({ categoryId: 17, price: 9, title: "Audioguía de Roma" }).guiaEnPersona).toBe(false);
    expect(c({ categoryId: 12, price: 0, title: "Free tour por el centro" }).guiaEnPersona).toBe(true);
  });
  it("REQ-416 la intro de la ciudad solo promete guías locales si todo lo de «Tours» tiene guía en persona", () => {
    expect(cityIntro("Roma", 3, [{ guiaEnPersona: true }, { guiaEnPersona: true }])).toBe("3 free tours y 2 tours con guías locales en Roma.");
    expect(cityIntro("Roma", 3, [{ guiaEnPersona: true }, { guiaEnPersona: false }])).toBe("3 free tours y 2 tours y experiencias en Roma.");
  });
  it("REQ-416 «Operado por un guía local» solo con guía en persona", () => {
    expect(operatedByFor("Rome Audio", false, "Operado por un guía local · Rome Audio")).toBe("Operado por Rome Audio");
    expect(operatedByFor("Ana", true, "Operado por un guía local · Ana")).toBe("Operado por un guía local · Ana");
    expect(operatedByFor(null, false, "Operado por un guía local")).toBe("Operado por el proveedor");
  });
  it("REQ-416 la descripción depende del formato; autoguiado dice «a tu ritmo y sin guía en persona»", () => {
    expect(tourDescription({ formato: "autoguiado", guiaEnPersona: false, isFreeTour: false, city: "Roma" })).toBe("Autoguiado (audioguía) en Roma, a tu ritmo y sin guía en persona.");
    expect(tourDescription({ formato: "excursion-dia", guiaEnPersona: true, isFreeTour: false, city: "Lima", notice: "Precio por persona." })).toBe("Excursión de un día en Lima con un guía local. Precio por persona.");
    expect(tourDescription({ formato: "pieza-libre", guiaEnPersona: true, isFreeTour: true, city: "Lima" })).toBe("Free tour en Lima con un guía local.");
  });
  it("G-T9 = A: title «– Excursión desde {Ciudad}» solo en excursiones de un día; lo demás, el patrón firmado", () => {
    expect(tourTitleByFormat({ title: "Paracas e Islas Ballestas", city: "Lima", isFreeTour: false, formato: "excursion-dia" })).toMatch(/^Paracas e Islas Ballestas – Excursión desde Lima \| /);
    expect(tourTitleByFormat({ title: "X", city: "Lima", isFreeTour: false, formato: "tour" })).toBeNull();
    expect(tourTitleByFormat({ title: "X", city: "Lima", isFreeTour: true, formato: "excursion-dia" })).toBeNull();
  });
  it("REQ-414 / REQ-412 chips de la ciudad: solo formatos con tours, en orden, con conteo; nada de traslados ni online", () => {
    const chips = cityFormatChips([{ formato: "tour" }, { formato: "caminata" }, { formato: "tour" }, { formato: "traslado" }, { formato: "fuera" }, {}]);
    expect(chips).toEqual([{ slug: "caminata", label: "Caminata (tour a pie)", count: 1 }, { slug: "tour", label: "Tour", count: 2 }]);
    expect(cityFormatChips([])).toEqual([]);
  });
  it("REQ-415 la etiqueta de la ficha es el nombre del formato; Momentos de autor con su nombre firmado", () => {
    expect(tourLabels("experiencia-unica")).toEqual(["Momentos de autor"]);
    expect(tourLabels("fuera")).toEqual([]);
  });
  it("REQ-433 ningún texto de T5 promete pagos, MSI, «guía en español» ni nombra al proveedor", () => {
    const textos = [
      cityIntro("Roma", 1, [{ guiaEnPersona: false }]), operatedByFor(null, false, "Operado por un guía local"),
      ...["pieza-libre", "caminata", "tour", "excursion-dia", "experiencia-unica", "entradas", "autoguiado", "circuito", "a-la-medida"].flatMap((f) => [
        tourDescription({ formato: f, guiaEnPersona: f !== "autoguiado", isFreeTour: f === "pieza-libre", city: "Roma" }), ...tourLabels(f)]),
    ].join(" ");
    expect(textos).not.toMatch(PROHIBIDO);
  });
});

describe("REQ-269 «Pieza libre» en la ciudad y junto a la insignia (PO 6-11 10:43)", () => {
  it("el chip de la sección de la ciudad dice «Pieza libre» (en: «Free tour»)", () => {
    expect(cityFormatChips([{ formato: "pieza-libre" }, { formato: "pieza-libre" }])).toEqual([{ slug: "pieza-libre", label: "Pieza libre", count: 2 }]);
    expect(cityFormatChips([{ formato: "pieza-libre" }], "en")[0].label).toBe("Free tour");
  });
  it("la etiqueta de formato de la ficha dice «Pieza libre»; ningún chip ni etiqueta dice «Free tour» en español", () => {
    expect(tourLabels("pieza-libre")).toEqual(["Pieza libre"]);
    const all = cityFormatChips(["pieza-libre", "caminata", "tour", "excursion-dia", "experiencia-unica", "entradas", "autoguiado", "circuito", "a-la-medida"].map((formato) => ({ formato })));
    expect(all.map((c) => c.label).join("|")).not.toMatch(/free tour/i);
  });
});
