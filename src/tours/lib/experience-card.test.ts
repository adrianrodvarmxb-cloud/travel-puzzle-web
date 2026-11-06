import { describe, expect, it } from "vitest";
import dictionary from "@/taxonomy/data/dictionary.json";
import { FORMATOS } from "@/taxonomy/lib/types";
import { CARD_COPY, CARD_LANGS, CATEGORY_FALLBACK, FORMAT_LABELS, cardDuration, cardPrice, cardProvider, categoryLabel, experienceCard, type CardInput } from "./experience-card";
import { FAVORITE_MIN_RATING, FAVORITE_MIN_REVIEWS } from "./favorite";

const base: CardInput = {
  key: "t1", href: "/tours/t1", title: "Free tour por el Madrid de los Austrias", image: "https://img/x.jpg", city: "Madrid", duration: "2 h",
  description: "Recorre el centro histórico.", formato: "pieza-libre", rating: 4.96, reviews: 2140, provider: "Ana García", price: { text: "Free tour", free: true },
};

describe("tarjeta única de experiencia", () => {
  it("REQ-521: «★ Favorito» solo con la regla de favorite.ts, en los 6 idiomas", () => {
    expect(experienceCard(base, "es").favorite).toBe("Favorito");
    expect(experienceCard(base, "en").favorite).toBe("Favorite");
    expect(CARD_LANGS.map((l) => CARD_COPY[l].favorite)).toEqual(["Favorito", "Favorite", "Favorito", "Favorit", "Favori", "Preferito"]);
    expect(experienceCard({ ...base, rating: FAVORITE_MIN_RATING, reviews: FAVORITE_MIN_REVIEWS - 1 }, "es").favorite).toBeNull();
    expect(experienceCard({ ...base, rating: FAVORITE_MIN_RATING - 0.01, reviews: 5000 }, "es").favorite).toBeNull();
    expect(experienceCard({ ...base, rating: FAVORITE_MIN_RATING, reviews: FAVORITE_MIN_REVIEWS }, "es").favorite).toBe("Favorito");
    for (const l of CARD_LANGS) expect(CARD_COPY[l].favorite).not.toMatch(/viajeros|travel/i); // sin «de los viajeros»
  });

  it("REQ-522: la categoría sale del formato de la taxonomía; pieza libre = «Free tour» en inglés", () => {
    expect(categoryLabel("pieza-libre", "es")).toBe("Pieza libre");
    expect(categoryLabel("pieza-libre", "en")).toBe("Free tour");
    expect(categoryLabel("excursion-dia", "es")).toBe("Excursión de un día");
    expect(categoryLabel("experiencia-unica", "es")).toBe("Momentos de autor");
    expect(categoryLabel("transporte", "es")).toBe("Transporte turístico");
  });

  it("REQ-522: sin formato, el respaldo es «Experiencia», nunca «Tour»", () => {
    for (const f of [null, undefined, "por-revisar", "fuera", "algo-nuevo"]) {
      expect(categoryLabel(f, "es")).toBe("Experiencia");
      expect(categoryLabel(f, "en")).toBe("Experience");
    }
    for (const l of CARD_LANGS) expect(CATEGORY_FALLBACK[l]).not.toMatch(/^tour$/i);
  });

  it("REQ-522: es/en son los términos del diccionario sin paréntesis; hay etiqueta para cada formato y los 6 idiomas", () => {
    const terms = (dictionary.terminos as { eje: string; slug: string; termino_es: string; termino_en: string; nombres?: Record<string, string> }[]).filter((t) => t.eje === "formato");
    const strip = (s: string) => s.replace(/\s*\(.*\)\s*$/, "").trim();
    for (const f of FORMATOS) {
      const t = terms.find((x) => x.slug === f)!;
      expect(FORMAT_LABELS[f].es, f).toBe(strip(t.termino_es));
      expect(FORMAT_LABELS[f].en, f).toBe(strip(t.termino_en));
      if (t.nombres) for (const l of ["pt", "de", "fr", "it"] as const) expect(FORMAT_LABELS[f][l]).toBe(t.nombres[l]);
      for (const l of CARD_LANGS) expect(FORMAT_LABELS[f][l]).toBeTruthy();
    }
  });

  it("REQ-523: ciudad · duración, título y descripción breve opcional", () => {
    const m = experienceCard(base, "es");
    expect(m.meta).toBe("Madrid · 2 h");
    expect(m.title).toBe(base.title);
    expect(m.description).toBe("Recorre el centro histórico.");
    expect(experienceCard({ ...base, description: "  " }, "es").description).toBeNull();
    expect(experienceCard({ ...base, city: null }, "es").meta).toBe("2 h");
    expect(experienceCard({ ...base, duration: null }, "es").meta).toBe("Madrid");
  });

  it("REQ-523: duración sin Intl", () => {
    expect(cardDuration({ raw: "2:30" }, "es")).toBe("2 h 30 min");
    expect(cardDuration({ raw: "0:45" }, "en")).toBe("45 min");
    expect(cardDuration({ raw: "3:00" }, "es")).toBe("3 h");
    expect(cardDuration({ minutes: 2880 }, "es")).toBe("2 días");
    expect(cardDuration({ days: 1 }, "en")).toBe("1 day");
    expect(cardDuration({ days: 8 }, "de")).toBe("8 Tage");
    expect(cardDuration({ raw: "" }, "es")).toBeNull();
  });

  it("REQ-524: ★ calificación · N reseñas; sin reseñas no se inventa nada", () => {
    expect(experienceCard(base, "es").rating).toEqual({ value: "5.0", count: "2,140 reseñas" });
    expect(experienceCard(base, "de").rating).toEqual({ value: "5.0", count: "2.140 Bewertungen" });
    expect(experienceCard({ ...base, reviews: 0, rating: 4.8 }, "es").rating).toBeNull();
    expect(experienceCard({ ...base, rating: null }, "es").rating).toBeNull();
  });

  it("REQ-524: el proveedor real; FREETOUR / freetour.com nunca se muestra (espacio vacío)", () => {
    expect(cardProvider("Ana García")).toBe("Ana García");
    expect(cardProvider("Big Bus Tours")).toBe("Big Bus Tours");
    expect(cardProvider("  Extime Travel ")).toBe("Extime Travel");
    for (const n of ["FREETOUR", "freetour.com", "Freetour.com Madrid", "FreeTour", "free tour.com", "", "   ", null, undefined]) expect(cardProvider(n), String(n)).toBeNull();
    expect(experienceCard({ ...base, provider: "FREETOUR.com" }, "es").provider).toBeNull();
  });

  it("REQ-525: precio en su línea — de pago «Desde aprox. MXN $X · EUR €Y»; pieza libre «Free tour»", () => {
    expect(cardPrice({ free: true }, "es")).toEqual({ text: "Free tour", free: true });
    expect(cardPrice({ free: true }, "en")).toEqual({ text: "Free tour", free: true });
    expect(cardPrice({ free: false, label: { main: "EUR €99", approx: "aprox. MXN $2,080" } }, "es")).toEqual({ text: "Desde aprox. MXN $2,080 · EUR €99", free: false });
    expect(cardPrice({ free: false, label: { main: "EUR €99", approx: null } }, "es")?.text).toBe("Desde EUR €99");
    expect(cardPrice({ free: false, label: null, price: 35, currency: "EUR" }, "en")?.text).toBe("From EUR 35");
    expect(cardPrice({ free: false, label: null, price: 0, currency: "EUR" }, "es")).toBeNull();
  });

  it("REQ-526: el modelo solo trae dos textos para la foto (favorito y categoría) y ningún logo", () => {
    const m = experienceCard(base, "es");
    const overPhoto = [m.favorite, m.category];
    expect(overPhoto).toEqual(["Favorito", "Pieza libre"]);
    expect(JSON.stringify(m)).not.toMatch(/freetour/i);
  });

  it("REQ-520: determinista — mismo modelo en llamadas repetidas (sin reloj ni azar)", () => {
    expect(experienceCard(base, "fr")).toEqual(experienceCard(base, "fr"));
  });
});
