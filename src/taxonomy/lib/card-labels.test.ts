import { describe, expect, it } from "vitest";
import { FORMATOS_FILTRO, FORMATO_CARD_LABEL, FORMATO_LABEL, formatoCardLabel } from "./filters";
import { categoryLabel } from "@/tours/lib/experience-card";

describe("REQ-531: nombres cortos solo en la etiqueta de la foto de la tarjeta (opción A, PO 6-11 20:30)", () => {
  it("REQ-531: cada formato del filtro tiene su etiqueta corta y ninguna lleva paréntesis", () => {
    for (const f of FORMATOS_FILTRO) {
      for (const l of ["es", "en"] as const) {
        expect(FORMATO_CARD_LABEL[f][l], `${f} ${l}`).toBeTruthy();
        expect(FORMATO_CARD_LABEL[f][l], `${f} ${l}`).not.toMatch(/[()]/);
      }
    }
    expect(Object.keys(FORMATO_CARD_LABEL).sort()).toEqual([...FORMATOS_FILTRO].sort());
  });

  it("REQ-531: la tabla firmada por el PO", () => {
    expect(FORMATO_CARD_LABEL).toEqual({
      "pieza-libre": { es: "Pieza libre", en: "Free Puzzle" }, // REQ-1103
      caminata: { es: "Caminata", en: "Walking tour" },
      "visita-guiada": { es: "Visita guiada", en: "Guided visit" }, // REQ-1250
      tour: { es: "Tour", en: "Tour" }, // REQ-1250 reemplaza «Tour → Visita guiada»
      "excursion-dia": { es: "Excursión de un día", en: "Day trip" },
      "experiencia-unica": { es: "Momentos de autor", en: "Signature moments" },
      entradas: { es: "Boletos", en: "Tickets" },
      autoguiado: { es: "Autoguiado", en: "Self-guided" },
      circuito: { es: "Circuito", en: "Multi-day tour" },
      "a-la-medida": { es: "Viaje a la medida", en: "Tailor-made" },
    });
  });

  it("REQ-531: la tarjeta usa la etiqueta corta; el filtro «Tipo de experiencia» conserva la larga", () => {
    expect(categoryLabel("caminata", "es")).toBe("Caminata");
    expect(categoryLabel("circuito", "es")).toBe("Circuito");
    expect(categoryLabel("tour", "es")).toBe("Tour"); // REQ-1250
    expect(categoryLabel("visita-guiada", "es")).toBe("Visita guiada");
    expect(categoryLabel("entradas", "en")).toBe("Tickets");
    expect(categoryLabel("autoguiado", "pt")).toBe("Self-guided"); // pt/de/fr/it en inglés, como el filtro
    expect(FORMATO_LABEL.caminata.es).toBe("Caminata"); // REQ-1250: mismo nombre en tarjeta, filtro y chips
    expect(FORMATO_LABEL.circuito.es).toBe("Circuito (varios días)");
    expect(formatoCardLabel("tour", "es")).toBe("Tour"); // REQ-1250
    expect(formatoCardLabel("visita-guiada", "en")).toBe("Guided visit");
  });
});
