import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { homeCopy } from "./copy";

const read = (f: string) => readFileSync(`src/components/home/v2/${f}.tsx`, "utf8");

/** REQ-3315 (REEMPLAZADO en parte por REQ-3380): franja, enlace de destinos, chips y reseñas siguen sin cifras. */
describe("REQ-3315: home sin cifras fuera de las tarjetas", () => {
  it("REQ-3315: la franja, el enlace de destinos, los chips y las reseñas no pintan cifras", () => {
    expect(read("ProofStrip")).not.toMatch(/counts\.|statTours|statCities|statCountries/);
    expect(read("PopularDestinations")).not.toMatch(/destAll\(formatCount/);
    expect(read("ContinentExplorer")).not.toMatch(/countriesN\(|formatCount\(t\.tours/);
    expect(read("HomeReviews")).not.toMatch(/avgLabel|formatRating\(/);
    expect(homeCopy("es").destAllPlain).toBe("Ver todos los destinos →");
  });
});

/** REQ-3380: «en las tarjetas, en todas, sí deja el número de tours»; sin la línea repetida «De la mano de nuestros aliados». */
describe("REQ-3380: tarjetas con número de tours", () => {
  it("REQ-3380: hero, destinos y continentes vuelven a mostrar el número de tours", () => {
    expect(read("HeroSearch")).toMatch(/c\.tours\(current\.toursText/);
    expect(read("PopularDestinations")).toMatch(/c\.tours\(formatCount\(d\.tours/);
    expect(read("ContinentExplorer")).toMatch(/c\.tours\(formatCount\(k\.tours/);
  });
  it("REQ-3380: la tarjeta del hero ya no repite «De la mano de nuestros aliados»", () => {
    expect(read("HeroSearch")).not.toMatch(/heroSlideLine/);
  });
});

/** REQ-3381: franja con íconos, menos texto, alto impacto (PO, 12 nov 2026). Mila sigue dicha como IA (REQ-3316). */
describe("REQ-3381: franja visual con íconos", () => {
  it("REQ-3381: tres piezas con ícono, título corto y bajada corta, sin números", () => {
    for (const lang of ["es", "en"]) {
      const p = homeCopy(lang).pillars;
      expect(p.map((x) => x.icon)).toEqual(["aliados", "mila", "mx"]);
      for (const x of p) {
        expect(x.title.split(" ").length).toBeLessThanOrEqual(5);
        expect(x.sub.split(" ").length).toBeLessThanOrEqual(5);
        expect(x.title + x.sub).not.toMatch(/\d/);
      }
    }
    expect(read("ProofStrip")).toMatch(/<svg/);
  });
  it("REQ-3316: Mila se presenta como IA con respaldo del equipo, sin «24/7»", () => {
    const es = homeCopy("es");
    expect(es.pillars[1].title).toMatch(/Mila/);
    expect(es.pillars[1].title + es.pillars[1].sub).toMatch(/IA|inteligencia artificial/);
    expect(es.pillars[1].sub).toMatch(/humano|equipo/);
    expect(es.expertCta).toBe("Hablar con Mila");
    expect(es.expertSub).toMatch(/inteligencia artificial/);
    for (const lang of ["es", "en"]) expect(JSON.stringify(homeCopy(lang).pillars) + homeCopy(lang).expertSub).not.toMatch(/24\/7|cualquier hora|any time/i);
  });
});
