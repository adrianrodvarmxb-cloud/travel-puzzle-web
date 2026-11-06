import { describe, it, expect } from "vitest";
import { HOME_TITLE, homeDescription, hubTitle, freeToursCityTitle, tourTitle, findDuplicateTitles } from "./titles";

describe("REQ-099: titles únicos por tipo de página", () => {
  it("REQ-099: home con marca, qué ofrece y alcance", () => {
    expect(HOME_TITLE).toBe("Travel Puzzle – Free tours, tours y traslados en todo el mundo");
  });
  it("REQ-099: la description de la home menciona los destinos principales (máx. 160)", () => {
    const d = homeDescription(["Perú", "China", "México"]);
    expect(d).toContain("Perú, China y México");
    expect(d.length).toBeLessThanOrEqual(161);
    expect(homeDescription([])).not.toContain(" y .");
  });
  it("REQ-099: hubs empiezan por la sección y la marca va al final", () => {
    expect(hubTitle("Ciudad de México")).toBe("Ciudad de México | Travel Puzzle");
    expect(hubTitle("La Primera Pieza")).toBe("La Primera Pieza | Travel Puzzle");
  });
  it("REQ-099: ciudades de free tours", () => {
    expect(freeToursCityTitle("Lima")).toBe("Free tours en Lima: tú decides cuánto vale | Travel Puzzle");
  });
  it("REQ-099: fichas: free tour o tour de pago", () => {
    expect(tourTitle({ title: "Free Tour del Centro", city: "Lima", isFreeTour: true })).toBe("Free Tour del Centro – Free tour en Lima | Travel Puzzle");
    expect(tourTitle({ title: "Machu Picchu", city: "Cusco", isFreeTour: false })).toBe("Machu Picchu – Tour en Cusco | Travel Puzzle");
  });
  it("REQ-099: detecta titles repetidos entre páginas distintas", () => {
    const dups = findDuplicateTitles([
      { url: "/a", title: "X | Travel Puzzle" },
      { url: "/b", title: "x | travel puzzle " },
      { url: "/c", title: "Y | Travel Puzzle" },
    ]);
    expect(dups).toEqual([{ title: "x | travel puzzle", urls: ["/a", "/b"] }]);
  });
});
