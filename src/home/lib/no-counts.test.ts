import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { homeCopy } from "./copy";

const read = (f: string) => readFileSync(`src/components/home/v2/${f}.tsx`, "utf8");

/** REQ-3315: el home ya no muestra cifras de catálogo ni promedio global (PO, 11 nov 2026). */
describe("REQ-3315: home sin cifras", () => {
  it("REQ-3315: las secciones del home no pintan conteos ni el promedio global", () => {
    expect(read("ProofStrip")).not.toMatch(/counts\.|statTours|statCities|statCountries/);
    expect(read("HeroSearch")).not.toMatch(/c\.tours\(/);
    expect(read("PopularDestinations")).not.toMatch(/c\.tours\(|destAll\(formatCount/);
    expect(read("ContinentExplorer")).not.toMatch(/c\.tours\(|countriesN\(|formatCount\(t\.tours/);
    expect(read("HomeReviews")).not.toMatch(/avgLabel|formatRating\(/);
  });
  it("REQ-3315: la franja trae las tres piezas en es y en, sin números", () => {
    for (const lang of ["es", "en"]) {
      const c = homeCopy(lang);
      expect(c.pillars).toHaveLength(3);
      expect(c.pillars.flat().join(" ")).not.toMatch(/\d/);
    }
    expect(homeCopy("es").pillars[0][0]).toBe("Aliados en cada región");
    expect(homeCopy("es").pillars[2][0]).toBe("Mexicana, de principio a fin");
  });
  it("REQ-3315: enlaces, continentes y tarjetas sin número", () => {
    const es = homeCopy("es");
    expect(es.destAllPlain).toBe("Ver todos los destinos →");
    expect(es.contLine).toBe("Seleccionado por nuestros aliados en la región.");
    expect(es.heroSlideLine).toBe("De la mano de nuestros aliados en la región");
  });
});

/** REQ-3316: Mila, asesora con inteligencia artificial, dicho con cuidado (PO, 11 nov 2026). */
describe("REQ-3316: Mila en el home", () => {
  it("REQ-3316: franja y asesoría dicen que Mila es inteligencia artificial con respaldo del equipo", () => {
    const es = homeCopy("es");
    expect(es.pillars[1][0]).toBe("Mila, tu asesora de viaje con inteligencia artificial");
    expect(es.pillars[1][1]).toMatch(/nuestro equipo/);
    expect(es.expertTitle).toBe("Tu viaje, armado contigo.");
    expect(es.expertSub).toMatch(/inteligencia artificial/);
    expect(es.expertCta).toBe("Hablar con Mila");
    expect(homeCopy("en").expertSub).toMatch(/artificial intelligence/);
  });
  it("REQ-3316: no promete atención 24/7 ni a cualquier hora", () => {
    for (const lang of ["es", "en"]) expect(JSON.stringify(homeCopy(lang).pillars) + homeCopy(lang).expertSub).not.toMatch(/24\/7|cualquier hora|any time/i);
  });
});
