import { describe, expect, it } from "vitest";
import { AGENCY_MAPPINGS, DEFAULT_DICTIONARY as D, DEFAULT_MAPPINGS as M } from "../data";
import { classify } from "./classify";
import { rowsFor, tourToInput, tripToInput, type TourRowForTaxonomy, type TripRowForTaxonomy } from "./run-plan";
import { firstKeyword, lineageForTour, lineageForTrip, applyPrecedence, taxonomyLineageEnabled } from "./lineage";
import { norm } from "./text";

const tour = (over: Partial<TourRowForTaxonomy> = {}): TourRowForTaxonomy => ({
  id: "t1", categoryId: 12, priceValue: 0, durationMinutes: 120, titleEs: "Free tour por el casco antiguo", titleEn: null, briefEs: null, briefEn: null,
  guideLanguages: '["Spanish"]', rating: 4.8, reviewsNumber: 60, ...over,
});
const trip = (over: Partial<TripRowForTaxonomy> = {}): TripRowForTaxonomy => ({
  id: "fch-fch-r1", kind: "circuito", category: "cultural", durationDays: 10, titleEs: "China: Tour regular básico 10 días", titleEn: "China basic tour",
  priceFrom: 1500, languages: '["es"]', options: "[]", flightsIncluded: 0, ...over,
});
const terms = (rows: { axis: string; term: string }[]) => rows.map((r) => `${r.axis}:${r.term}`).sort();

describe("REQ-751 el clasificador devuelve la procedencia estructurada de cada término", () => {
  it("REQ-751 FREETOUR precio 0: campo price.value, valor 0, huella del crudo", () => {
    const rows = lineageForTour(tour(), D, M, { rawHash: "f".repeat(64) });
    const f = rows.find((r) => r.axis === "formato")!;
    expect(f).toMatchObject({ term: "pieza-libre", origin: "regla", sourceField: "price.value", sourceValue: "0", sourceRawHash: "f".repeat(64) });
  });
  it("REQ-751 un término por categoría apunta a categoryId con el id original", () => {
    const rows = lineageForTour(tour({ categoryId: 5, priceValue: 40, titleEs: "Tapas y vino" }), D, M, {});
    const t = rows.find((r) => r.axis === "tema" && r.ruleId.startsWith("categoría"))!;
    expect(t).toMatchObject({ sourceField: "categoryId", sourceValue: "5" });
  });
  it("REQ-751 un término por palabra guarda la palabra que coincidió (matchedTerm) y el campo del título", () => {
    const rows = lineageForTour(tour({ categoryId: 12, priceValue: 15, titleEs: "Tour gastronómico de tapas por el mercado" }), D, M, {});
    const t = rows.find((r) => r.ruleId === "palabra en el título")!;
    expect(t.sourceField).toBe("title.es|title.en");
    expect(t.matchedTerm).toBeTruthy();
    expect(norm(t.sourceValue!)).toContain(t.matchedTerm!.replace(/\*$/, "").replace(/\\b/g, "").slice(0, 3));
  });
  it("REQ-751 sin overrides ni declarados, los términos son exactamente los del clasificador de hoy", () => {
    for (const t of [tour(), tour({ categoryId: 5, priceValue: 40, titleEs: "Tapas y vino" }), tour({ categoryId: 4, priceValue: 60, durationMinutes: 480, titleEs: "Excursión a Toledo" }), tour({ categoryId: 99 })]) {
      expect(terms(lineageForTour(t, D, M, {}))).toEqual(terms(rowsFor("tour", t.id, classify(tourToInput(t), D, M))));
    }
  });
  it("REQ-751 firstKeyword devuelve la palabra (o prefijo) que coincide, o null", () => {
    expect(firstKeyword(["museo*", "tapas"], norm("Ruta de tapas"))).toBe("tapas");
    expect(firstKeyword(["museo*"], norm("Museos de Madrid"))).toBe("museo*");
    expect(firstKeyword([], "x")).toBeNull();
  });
});

describe("REQ-753 los viajes se clasifican primero con la denominación original del proveedor", () => {
  it("REQ-753 Fantástica China FCH-R1: mapeo de la agencia desde «TOUR REGULAR» (campo ref, código FCH-R)", () => {
    const rows = lineageForTrip(trip(), { provider: "fantasticachina", field: "ref", value: "TOUR REGULAR", matchedTerm: "FCH-R", rawHash: "a".repeat(64) }, D, M, AGENCY_MAPPINGS, {});
    const f = rows.find((r) => r.axis === "formato")!;
    expect(f).toMatchObject({ term: "circuito", ruleId: "fijo fantasticachina:TOUR REGULAR", sourceField: "ref", sourceValue: "TOUR REGULAR", matchedTerm: "FCH-R", sourceRawHash: "a".repeat(64) });
    expect(rows.some((r) => r.axis === "tema" && r.term === "cultural")).toBe(true); // Trip.category sigue sumando temas
  });
  it("REQ-753 sin denominación original cae al mapeo propio (trip.kind), marcado como campo de Travel Puzzle", () => {
    const f = lineageForTrip(trip(), null, D, M, AGENCY_MAPPINGS, {}).find((r) => r.axis === "formato")!;
    expect(f).toMatchObject({ term: "circuito", sourceField: "trip.kind", sourceValue: "circuito" });
    expect(f.ruleId).toContain("propios:circuito");
  });
  it("REQ-753 una denominación que el mapeo no conoce no deja el viaje sin clasificar: cae al mapeo propio", () => {
    const f = lineageForTrip(trip(), { provider: "fantasticachina", field: "original.categoria", value: "OTRA COSA", matchedTerm: null, rawHash: null }, D, M, AGENCY_MAPPINGS, {}).find((r) => r.axis === "formato")!;
    expect(f.term).toBe("circuito");
    expect(f.sourceField).toBe("trip.kind");
  });
  it("REQ-753 con o sin denominación original, el formato de los viajes de hoy no cambia", () => {
    for (const [t, o] of [
      [trip({ kind: "transporte", category: "urbano", durationDays: 1, titleEs: "Bus turístico hop-on hop-off en Nueva York" }), { provider: "bigbus", field: "source", value: "tour-tickets-and-passes", matchedTerm: "tour-tickets-and-passes", rawHash: null }],
      [trip({ kind: "circuito" }), { provider: "destinocolombia", field: "ref", value: "PC", matchedTerm: "PC", rawHash: null }],
      [trip({ kind: "tour", durationDays: 1, titleEs: "City tour virreinal de Lima" }), { provider: "incaworld", field: "ref", value: "SERVICIO", matchedTerm: "LIM-01", rawHash: null }],
    ] as const) {
      const con = lineageForTrip(t, o, D, M, AGENCY_MAPPINGS, {}).find((r) => r.axis === "formato")!.term;
      expect(con).toBe(classify(tripToInput(t), D, M).formato);
    }
  });
});

describe("REQ-754 precedencia: manual > regla > valor del proveedor (ExperienceTaxonomyOverride conectado)", () => {
  const base = () => lineageForTour(tour({ categoryId: 5, priceValue: 40, titleEs: "Tapas y vino" }), D, M, {});
  it("REQ-754 un override «add» de formato reemplaza al del clasificador y recalcula la sección", () => {
    const rows = applyPrecedence(base(), D, { overrides: [{ axis: "formato", term: "experiencia-unica", action: "add", by: "po", note: "cata" }] });
    expect(rows.filter((r) => r.axis === "formato")).toEqual([expect.objectContaining({ term: "experiencia-unica", origin: "manual", ruleId: "manual: po · cata" })]);
    expect(rows.find((r) => r.axis === "seccion")!.term).toBe("experiencias");
  });
  it("REQ-754 un override «remove» quita el término aunque la regla lo ponga; «add» de tema lo agrega", () => {
    const rows = applyPrecedence(base(), D, { overrides: [{ axis: "tema", term: "gastronomia", action: "remove", by: "po", note: "" }, { axis: "tema", term: "cultural", action: "add", by: "po", note: "" }] });
    expect(rows.some((r) => r.axis === "tema" && r.term === "gastronomia")).toBe(false);
    expect(rows.find((r) => r.axis === "tema" && r.term === "cultural")!.origin).toBe("manual");
  });
  it("REQ-754 sin regla (por-revisar), gana lo que el registro declara; la regla nunca es pisada por el declarado", () => {
    const sinRegla = lineageForTour(tour({ categoryId: 99 }), D, M, {});
    const rows = applyPrecedence(sinRegla, D, { declared: { formato: "tour", temas: ["cultural"] } });
    expect(rows.find((r) => r.axis === "formato")).toMatchObject({ term: "tour", origin: "proveedor", sourceField: "taxonomia.formato" });
    expect(rows.find((r) => r.axis === "tema")).toMatchObject({ term: "cultural", origin: "proveedor" });
    const conRegla = applyPrecedence(base(), D, { declared: { formato: "circuito" } });
    expect(conRegla.find((r) => r.axis === "formato")!.origin).toBe("regla");
  });
  it("REQ-754 bandera TAXONOMY_LINEAGE_ENABLED: solo \"true\" exacto", () => {
    expect(taxonomyLineageEnabled({ TAXONOMY_LINEAGE_ENABLED: "true" })).toBe(true);
    expect(taxonomyLineageEnabled({ TAXONOMY_LINEAGE_ENABLED: "false" })).toBe(false);
    expect(taxonomyLineageEnabled({})).toBe(false);
  });
});
