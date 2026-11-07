import { describe, expect, it } from "vitest";
import { formatChips } from "./format-chips";
import { categoryLabel } from "./experience-card";
import { queryCatalog, type CatalogEntry } from "@/catalog/lib/query";
import { matchesToursFilter } from "@/trips/lib/public";
import type { TripCard } from "@/trips/public-load";
import { FORMATO_CARD_LABEL } from "@/taxonomy/lib/filters";

const entry = (id: string, formato: string, reviews = 10): CatalogEntry => ({
  id, cityId: 1, countryId: 1, categoryId: 12, price: 20, rating: 4.8, reviews, durationMinutes: 120, createdAt: 0, updatedAt: 0, text: id, formato,
});

describe("chips de tipos principales en /tours (PO, 6-11 21:16)", () => {
  it("REQ-546: «Todo» primero, luego Pieza libre si existe y después los demás por cantidad; con las etiquetas cortas de la tarjeta", () => {
    const chips = formatChips({ caminata: 40, "pieza-libre": 12, tour: 90, "excursion-dia": 55 }, "es");
    expect(chips.map((c) => c.label)).toEqual(["Todo", "Pieza libre", "Tour", "Excursión de un día", "Caminata"]); // REQ-1250: «tour» se llama Tour
    expect(chips.map((c) => c.slug)).toEqual([null, "pieza-libre", "tour", "excursion-dia", "caminata"]);
    expect(chips[0].count).toBe(197);
    expect(chips.map((c) => c.label)).not.toContain("Tours");
    expect(formatChips({ tour: 3 }, "en").map((c) => c.label)).toEqual(["All", "Tour"]); // REQ-1250
    expect(formatChips({ "visita-guiada": 4, tour: 3 }, "es").map((c) => c.label)).toEqual(["Todo", "Visita guiada", "Tour"]); // REQ-1250
  });

  it("REQ-547: un formato nuevo con resultados genera su chip solo; con cero resultados no hay chip", () => {
    expect(formatChips({ tour: 5 }, "es").map((c) => c.slug)).toEqual([null, "tour"]);
    expect(formatChips({ tour: 5, autoguiado: 1 }, "es").map((c) => c.slug)).toEqual([null, "tour", "autoguiado"]);
    expect(formatChips({ tour: 5, autoguiado: 0, entradas: 0 }, "es").map((c) => c.slug)).toEqual([null, "tour"]);
    // formatos fuera de /tours (traslado, transporte, fuera, por-revisar) nunca son chip
    expect(formatChips({ tour: 5, traslado: 9, transporte: 4, fuera: 3, "por-revisar": 2, "": 1 }, "es").map((c) => c.slug)).toEqual([null, "tour"]);
    expect(formatChips({}, "es")).toEqual([]);
    expect(formatChips(null, "es")).toEqual([]);
  });

  it("REQ-548: al elegir un chip, todas las tarjetas que quedan (catálogo y viajes) llevan esa misma etiqueta", () => {
    const entries = [entry("a", "tour"), entry("b", "excursion-dia"), entry("c", "tour"), entry("d", "pieza-libre"), entry("e", "caminata")];
    const trips = [
      { id: "v1", kind: "tour", formato: "excursion-dia", title: "Versalles esencial", countries: ["FR"], cities: ["París"], priceFrom: 99 },
      { id: "v2", kind: "tour", formato: "tour", title: "París en un día", countries: ["FR"], cities: ["París"], priceFrom: 120 },
    ] as unknown as TripCard[];
    for (const chip of formatChips({ tour: 2, "excursion-dia": 1, "pieza-libre": 1, caminata: 1 }, "es").slice(1)) {
      const { ids } = queryCatalog(entries, { taxonomy: true, formatos: [chip.slug!] }, { page: 1, limit: 20 }, 0);
      const labels = ids.map((id) => categoryLabel(entries.find((x) => x.id === id)!.formato, "es"));
      const tripLabels = trips.filter((t) => matchesToursFilter(t, { countryCode: null, kind: "all", formatos: [chip.slug!] })).map((t) => categoryLabel(t.formato, "es"));
      expect(labels.length + tripLabels.length).toBeGreaterThan(0);
      for (const l of [...labels, ...tripLabels]) expect(l).toBe(chip.label);
    }
    // el caso de la captura del PO: «Excursión de un día» nunca sale bajo el chip «Visita guiada»
    const tour = trips.filter((t) => matchesToursFilter(t, { countryCode: null, kind: "all", formatos: ["tour"] }));
    expect(tour.map((t) => t.id)).toEqual(["v2"]);
  });

  it("REQ-549: las etiquetas de los chips son exactamente las de la tarjeta (FORMATO_CARD_LABEL), sin tabla propia", () => {
    for (const [slug, l] of Object.entries(FORMATO_CARD_LABEL)) {
      const chip = formatChips({ [slug]: 1 }, "es")[1];
      expect(chip.label).toBe(l.es);
      expect(chip.label).toBe(categoryLabel(slug, "es"));
    }
  });
});
