import { describe, it, expect } from "vitest";
import { PIEZA_LIBRE_LABEL, freeBadgeLabel } from "./pieza-libre";
import { translations } from "@/lib/translations";
import { homeCopy } from "@/home/lib/copy";
import { tripCopy } from "@/trips/lib/copy";
import { PRIMERA_PIEZA_LABEL } from "./menu";

const LANGS = ["es", "en", "pt", "de", "fr", "it"] as const;

describe("REQ-480: la categoría de los free tours se llama «Pieza libre» (PO, 6 nov 2026, 10:45 y 10:46)", () => {
  it("REQ-480: nombre de la categoría; EN «Free tour» (pendiente de firma)", () => {
    expect(PIEZA_LIBRE_LABEL).toBe("Pieza libre");
    expect(freeBadgeLabel("es")).toBe("Pieza libre");
    expect(freeBadgeLabel("en")).toBe("Free tour");
    expect(freeBadgeLabel("fr")).toBe("Free tour");
  });

  it("REQ-480: chip de filtros de /tours: «Free tours» → «Pieza libre»", () => {
    expect(tripCopy("es").filterFree).toBe("Pieza libre");
    expect(tripCopy("en").filterFree).toBe("Free tour");
  });

  it.each(LANGS)("REQ-480: insignia azul sobre la foto en %s (tarjetas de /tours, carruseles y ficha)", (lang) => {
    expect(translations[lang]["tours.freeBadge"]).toBe(freeBadgeLabel(lang));
  });

  it("REQ-480: insignia de las tarjetas del inicio", () => {
    expect(homeCopy("es").freeBadge).toBe("Pieza libre");
    expect(homeCopy("en").freeBadge).toBe("Free tour");
  });

  it.each(LANGS)("REQ-480 (corrección 10:46): el precio verde «Free tour» de las tarjetas no cambia en %s", (lang) => {
    expect(translations[lang]["tours.free"]).toBe("Free tour");
  });

  it("REQ-480: el precio del inicio tampoco cambia; «La Primera Pieza» sigue siendo la colección", () => {
    expect(homeCopy("es").free).toBe("Free tour");
    expect(homeCopy("en").free).toBe("Free tour");
    expect(PRIMERA_PIEZA_LABEL).toBe("La Primera Pieza");
  });
});
