import { describe, it, expect } from "vitest";
import { SITE_META, tourMeta, clip } from "./meta";

describe("vista previa al compartir", () => {
  it("el sitio en español con su imagen", () => {
    expect(SITE_META.title).toBe("Travel Puzzle · Te armamos tu viaje");
    expect(SITE_META.description).toBe("Tours con guías locales en todo el mundo y un asesor en español que te acompaña por WhatsApp.");
    expect(SITE_META.image).toBe("/og-2.jpg");
  });
  it("el tour lleva calificación y reseñas en el título, y su foto", () => {
    const m = tourMeta({ title: "Free Tour de Budapest", brief: "Recorre Budapest con un guía local.", rating: "4.83", reviews: 12703, image: "https://www.freetour.com/x.jpg" }, "es");
    expect(m.title).toBe("Free Tour de Budapest · ★ 4.8 (12,703 reseñas)");
    expect(m.description).toBe("Recorre Budapest con un guía local.");
    expect(m.image).toBe("https://www.freetour.com/x.jpg");
  });
  it("sin reseñas ni foto: título solo y la imagen general", () => {
    const m = tourMeta({ title: "Tour nuevo", brief: null, rating: null, reviews: 0, image: null }, "en");
    expect(m.title).toBe("Tour nuevo");
    expect(m.description).toBe(SITE_META.description);
    expect(m.image).toBe("/og-2.jpg");
  });
  it("corta la descripción sin romper palabras", () => {
    const s = clip("palabra ".repeat(40), 60);
    expect(s.length).toBeLessThanOrEqual(61);
    expect(s.endsWith("palabra…")).toBe(true);
  });
});
