import { describe, it, expect } from "vitest";
import { pickDestinations, nameIn, photoFor } from "./destinations";
import { groupByContinent, continentOf } from "./continents";
import { formatRating } from "./format";

const row = (cityId: number, en: string, tours: number, sampleImage: string | null = "https://x/t.jpg") => ({
  cityId,
  countryId: 1,
  tours,
  cityNames: { en, es: en },
  countryNames: { en: "C" },
  sampleImage,
});

describe("destinos populares", () => {
  it("primero las ciudades con foto propia, por número de tours", () => {
    const out = pickDestinations([row(1, "Lyon", 90), row(2, "Venice", 10), row(3, "Paris", 40)], 3);
    expect(out.map((d) => d.cityId)).toEqual([3, 2, 1]);
    expect(out[0].image).toBe("/home/destinos/paris.webp");
    expect(out[2].image).toBe("https://x/t.jpg");
  });
  it("no muestra ciudades sin tours ni sin foto", () => {
    expect(pickDestinations([row(1, "Lyon", 0), row(2, "Nowhere", 5, null), row(3, "Oslo", 5, "http://inseguro")])).toEqual([]);
  });
  it("reconoce nombres con acentos o en mayúsculas", () => {
    expect(photoFor({ en: "Cancún" })).toBe("/home/destinos/cancun.webp");
    expect(photoFor({ en: "NEW YORK" })).toBe("/home/destinos/nueva-york.webp");
  });
  it("nombre en el idioma, con inglés de respaldo", () => {
    expect(nameIn({ en: "Venice", es: "Venecia" }, "es")).toBe("Venecia");
    expect(nameIn({ en: "Venice" }, "fr")).toBe("Venice");
  });
});

describe("continentes", () => {
  it("agrupa países y ordena los más grandes primero", () => {
    const out = groupByContinent([
      { countryId: 1, code: "FR", tours: 10 },
      { countryId: 2, code: "it", tours: 30 },
      { countryId: 3, code: "MX", tours: 5 },
      { countryId: 4, code: "ZZ", tours: 99 },
    ]);
    expect(out.map((c) => c.continent)).toEqual(["america-norte", "europa"]);
    expect(out[1]).toMatchObject({ tours: 40, countries: 2 });
    expect(out[1].top[0].code).toBe("it");
    expect(continentOf("ZZ")).toBeNull();
  });
});

describe("calificación", () => {
  it("siempre con un decimal", () => {
    expect(formatRating(4.9399999999)).toBe("4.9");
    expect(formatRating("4.6")).toBe("4.6");
    expect(formatRating(null)).toBeNull();
  });
});
