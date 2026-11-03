import { describe, it, expect } from "vitest";
import { pickVaried } from "./featured";
import { pickHeroSlides, HERO_CITIES, type HeroCity } from "./hero";

const t = (id: string, cityId: number, code: string, reviews: number) => ({ id, cityId, countryCode: code, reviews });

describe("favoritos variados", () => {
  it("sin repetir ciudad y alternando continentes", () => {
    const out = pickVaried(
      [t("a", 1, "HU", 900), t("b", 1, "HU", 800), t("c", 2, "IT", 700), t("d", 3, "MX", 600), t("e", 4, "JP", 500), t("f", 5, "ES", 400)],
      4
    );
    expect(out.map((x) => x.id)).toEqual(["a", "d", "e", "c"]);
  });
  it("si faltan continentes, completa con otras ciudades", () => {
    const out = pickVaried([t("a", 1, "HU", 9), t("b", 2, "IT", 8), t("c", 3, "FR", 7)], 3);
    expect(out.map((x) => x.id)).toEqual(["a", "b", "c"]);
  });
});

describe("carrusel principal", () => {
  it("solo ciudades con tours y con su enlace", () => {
    const cities: HeroCity[] = [
      { cityId: 7, countryId: 75, tours: 5, names: { en: "Venice", es: "Venecia" } },
      { cityId: 8, countryId: 1, tours: 0, names: { en: "Singapore" } },
    ];
    const slides = pickHeroSlides(cities);
    expect(slides).toHaveLength(1);
    expect(slides[0]).toMatchObject({ image: "/home/hero/venecia.webp", href: "/tours?countryId=75&cityId=7", tours: 5 });
  });
  it("reconoce nombres alternos (Cuzco, Tokio)", () => {
    const slides = pickHeroSlides([
      { cityId: 1, countryId: 2, tours: 3, names: { en: "Cuzco" } },
      { cityId: 3, countryId: 4, tours: 9, names: { en: "Tokyo" } },
    ]);
    expect(slides.map((s) => s.image)).toEqual(["/home/hero/machu-picchu.webp", "/home/hero/tokio.webp"]);
  });
  it("cada foto lleva su punto de enfoque para que luzca en celular", () => {
    const slides = pickHeroSlides([
      { cityId: 1, countryId: 2, tours: 3, names: { en: "Singapore" } },
      { cityId: 3, countryId: 4, tours: 9, names: { en: "Tokyo" } },
    ]);
    expect(slides[0].focus).toBe("74% 50%");
    expect(slides[1].focus).toBe("50% 50%");
    for (const c of HERO_CITIES) expect(c.focus ?? "50% 50%").toMatch(/^\d{1,3}% \d{1,3}%$/);
  });
  it("tiene las 6 fotos rescatadas", () => {
    expect(HERO_CITIES).toHaveLength(6);
  });
});
