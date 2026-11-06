import { describe, it, expect } from "vitest";
import { parseTourRankRows } from "./rank-row";
import { freetourFormat, isOnSiteForRanking } from "./experience-format";
import { catalogClassifier, isPublishable, type CatalogClassifier } from "@/taxonomy/lib/publish";
import { DEFAULT_DICTIONARY as D, DEFAULT_MAPPINGS as M } from "@/taxonomy/data";

const row = (id: string, categoryId: number, o: Record<string, unknown> = {}) => ({
  id, externalId: 10, cityId: 5, cityName: "Madrid", countryCode: "es", categoryId, durationMinutes: 120,
  price: "0", rating: "4.9", reviews: 120, titleEs: `Tour ${id}`, titleEn: `Tour ${id}`, ...o,
});
const rows = [row("libre", 12), row("revisar", 12), row("fuera", 12), row("pago", 12, { price: "25" })];
// Clasificador de prueba: decide por título (así se prueba el filtro aunque hoy el diccionario y #148 coincidan).
const stub: CatalogClassifier = (t) => ({ formato: /revisar/.test(t.title) ? "por-revisar" : /fuera/.test(t.title) ? "fuera" : "caminata", seccion: "experiencias", guiaEnPersona: true }) as ReturnType<CatalogClassifier>;

describe("REQ-270 carruseles del home (#148) con la taxonomía de T3", () => {
  it("REQ-270 apagada (sin clasificador): nada cambia", () => {
    const { ok, untaxed } = parseTourRankRows(rows);
    expect(ok.map((x) => x.id)).toEqual(["libre", "revisar", "fuera", "pago"]);
    expect(untaxed).toBe(0);
  });
  it("REQ-270 encendida: fuera y por-revisar no entran (ni a «Los más elegidos» ni a «Excursiones de un día») y se cuentan", () => {
    const { ok, untaxed } = parseTourRankRows(rows, { taxonomy: stub });
    expect(ok.map((x) => x.id)).toEqual(["libre", "pago"]);
    expect(untaxed).toBe(2);
  });
  it("REQ-270 hoy el diccionario y la regla propia de #148 coinciden en las categorías 1–40 (cambia 0 tours); manda la taxonomía", () => {
    const c = catalogClassifier(D, M);
    const diff: string[] = [];
    for (let cat = 1; cat <= 40; cat++) for (const price of [0, 30]) for (const dur of [120, 600]) {
      const a = isOnSiteForRanking(freetourFormat({ categoryId: cat, price, durationMinutes: dur, titles: ["Tour x"] }));
      const b = isPublishable(c({ categoryId: cat, price, durationMinutes: dur, title: "Tour x" }).formato);
      if (a && !b) diff.push(`${cat}/${price}/${dur}`);
    }
    expect(diff).toEqual([]);
  });
});
