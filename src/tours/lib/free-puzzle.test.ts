import { describe, expect, it } from "vitest";
import { FREE_PUZZLE_LABEL, PIEZA_LIBRE_LABEL, freeBadgeLabel } from "./pieza-libre";
import { categoryLabel, CARD_COPY, cardPrice } from "./experience-card";
import { FORMATO_LABEL, FORMATO_CARD_LABEL, formatoLabel, formatoCardLabel } from "@/taxonomy/lib/filters";
import { CATEGORY_GROUPS } from "./extra-filters";
import { tripCopy } from "@/trips/lib/copy";
import { hubCopy } from "@/destinations/lib/hub-copy";
import { fallbackTourTitle } from "@/destinations/lib/pieza-libre-copy";
import { homeCopy } from "@/home/lib/copy";
import { tourLabels } from "@/taxonomy/lib/copy";
import { en } from "@/lib/translations/en";
import { pt } from "@/lib/translations/pt";
import { de } from "@/lib/translations/de";
import { fr } from "@/lib/translations/fr";
import { it as it_ } from "@/lib/translations/it";
import { es } from "@/lib/translations/es";
import { DEFAULT_DICTIONARY } from "@/taxonomy/data";

// PO, 7 nov 2026, 06:06 (reemplaza la regla «en inglés Free tour», REQ-1102): «Pieza libre es la categoría que Travel Puzzle
// le da a los free tours, por lo tanto en la página en inglés debe decir Categoría: Free Puzzle». pt/fr/it/de salen en inglés.
const OTHER = ["en", "pt", "de", "fr", "it"] as const;

describe("REQ-1103: la categoría de los free tours en inglés (y pt/de/fr/it) es «Free Puzzle»", () => {
  it("REQ-1103: la constante es «Free Puzzle» y el español sigue «Pieza libre»", () => {
    expect(FREE_PUZZLE_LABEL).toBe("Free Puzzle");
    expect(PIEZA_LIBRE_LABEL).toBe("Pieza libre");
    for (const l of OTHER) expect(freeBadgeLabel(l)).toBe("Free Puzzle");
    expect(freeBadgeLabel("es")).toBe("Pieza libre");
  });

  it("REQ-1103 (1/4 tarjeta): la etiqueta de categoría de la tarjeta dice «Free Puzzle»; la línea de precio sigue «Free tour»", () => {
    expect(FORMATO_CARD_LABEL["pieza-libre"]).toEqual({ es: "Pieza libre", en: "Free Puzzle" });
    for (const l of OTHER) {
      expect(categoryLabel("pieza-libre", l)).toBe("Free Puzzle");
      expect(formatoCardLabel("pieza-libre", l)).toBe("Free Puzzle");
      expect(CARD_COPY[l].free).toBe("Free tour");
      expect(cardPrice({ free: true }, l)).toEqual({ text: "Free tour", free: true });
    }
    expect(homeCopy("en").freeBadge).toBe("Free Puzzle");
    expect(homeCopy("en").free).toBe("Free tour");
  });

  it("REQ-1103 (2/4 /tours): filtro, chips y grupo viejo «Tipo de actividad» dicen «Free Puzzle»", () => {
    expect(FORMATO_LABEL["pieza-libre"]).toEqual({ es: "Pieza libre", en: "Free Puzzle" });
    for (const l of OTHER) {
      expect(formatoLabel("pieza-libre", l)).toBe("Free Puzzle");
      expect(tripCopy(l).filterFree).toBe("Free Puzzle");
    }
    const visitas = CATEGORY_GROUPS.find((g) => g.id === "visitas")!;
    for (const l of OTHER) {
      expect(visitas.label[l]).toContain("Free Puzzle");
      expect(visitas.label[l]).not.toMatch(/free tour/i);
    }
    // marcado: «Experience type» (additionalProperty) y etiquetas de la ficha salen de formatoLabel
    expect(tourLabels("pieza-libre", "en")).toEqual(["Free Puzzle"]);
  });

  it("REQ-1103 (3/4 ciudad): sección e intro de la ciudad en inglés con «Free Puzzle»; «La Primera Pieza» no cambia", () => {
    expect(hubCopy("en").freeSection).toBe("Free Puzzle (La Primera Pieza)");
    expect(hubCopy("en").cityFreeIntro("Mexico City", 38, 39)).toBe("38 in Free Puzzle and 39 tours with local guides in Mexico City.");
    expect(hubCopy("en").cityFreeIntro("Lima", 1, 1)).toBe("1 in Free Puzzle and 1 tour with local guides in Lima.");
    expect(fallbackTourTitle(123, "en")).toBe("Free Puzzle 123");
  });

  it("REQ-1103 (4/4 pin e insignia): traducciones de pin e insignia en en/pt/de/fr/it; el precio «Free tour» no cambia", () => {
    for (const t of [en, pt, de, fr, it_] as Record<string, string>[]) {
      expect(t["tours.freePin"]).toBe("Free Puzzle");
      expect(t["tours.freeBadge"]).toBe("Free Puzzle");
      expect(t["tours.free"]).toBe("Free tour");
    }
  });

  it("REQ-1103: el diccionario de la taxonomía usa «Free Puzzle» en inglés y conserva «free tour» como sinónimo de búsqueda", () => {
    const t = DEFAULT_DICTIONARY.terminos.find((x) => x.slug === "pieza-libre")!;
    expect(t.termino_es).toBe("Pieza libre");
    expect(t.termino_en).toBe("Free Puzzle");
    expect(t.sinonimos).toContain("free tour");
  });

  it("REQ-1103: el español no cambia", () => {
    const e = es as Record<string, string>;
    expect(e["tours.freePin"]).toBe("Pieza libre");
    expect(e["tours.freeBadge"]).toBe("Pieza libre");
    expect(formatoLabel("pieza-libre", "es")).toBe("Pieza libre");
    expect(categoryLabel("pieza-libre", "es")).toBe("Pieza libre");
    expect(tripCopy("es").filterFree).toBe("Pieza libre");
    expect(hubCopy("es").freeSection).toBe("Pieza libre (La Primera Pieza)");
    expect(hubCopy("es").cityFreeIntro("Barcelona", 67, 35)).toBe("67 en Pieza libre y 35 tours con guías locales en Barcelona.");
    expect(homeCopy("es").freeBadge).toBe("Pieza libre");
    expect(fallbackTourTitle(9, "es")).toBe("Pieza libre 9");
    expect(CATEGORY_GROUPS.find((g) => g.id === "visitas")!.label.es).toBe("Visitas guiadas y Pieza libre");
  });
});
