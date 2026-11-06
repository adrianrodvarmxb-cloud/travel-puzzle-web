import { describe, it, expect } from "vitest";
import { WIKIDATA_USER_AGENT, buildWikidataQuery, parseWikidataResponse, wikidataOpinion } from "./wikidata";

describe("Wikidata (segunda opinión)", () => {
  it("REQ-137: User-Agent genérico de la marca, sin correos", () => {
    expect(WIKIDATA_USER_AGENT).toBe("TravelPuzzleBot/1.0 (+https://travelpuzzle.com.mx)");
    expect(WIKIDATA_USER_AGENT).not.toMatch(/@/);
  });

  it("REQ-137: consulta por etiqueta es/en + país ISO-2 en un solo VALUES, con comillas escapadas", () => {
    const q = buildWikidataQuery([{ cityId: 234, iso2: "AT", labels: ["Hallstatt"] }, { cityId: 9, iso2: "IT", labels: ['Ca"pri'] }]);
    expect(q).toContain('("234" "Hallstatt"@es "AT")');
    expect(q).toContain('("234" "Hallstatt"@en "AT")');
    expect(q).toContain('"Ca\\"pri"@en');
    expect(q).toContain("wdt:P1566");
    expect(q).toContain("wdt:P297");
  });

  it("REQ-137: lee P1566 y P625 por ciudad, sin repetir items", () => {
    const json = {
      results: {
        bindings: [
          { cid: { value: "234" }, item: { value: "http://www.wikidata.org/entity/Q15106" }, gn: { value: "2775220" }, coord: { value: "Point(13.6493 47.5622)" } },
          { cid: { value: "234" }, item: { value: "http://www.wikidata.org/entity/Q15106" }, gn: { value: "2775220" } },
          { cid: { value: "764" }, item: { value: "http://www.wikidata.org/entity/Q14452" } },
          { cid: { value: "764" }, item: { value: "http://www.wikidata.org/entity/Q1" } },
        ],
      },
    };
    const r = parseWikidataResponse(json);
    expect(r.get(234)).toEqual([{ qid: "Q15106", geonameid: 2775220, lat: 47.5622, lng: 13.6493 }]);
    expect(r.get(764)).toHaveLength(2);
  });

  it("REQ-137: opinión: coincide / difiere / varios / sin dato (nunca decide sola)", () => {
    expect(wikidataOpinion([{ qid: "Q1", geonameid: 5, lat: null, lng: null }], 5)).toEqual({ opinion: "coincide", qid: "Q1", geonameid: 5 });
    expect(wikidataOpinion([{ qid: "Q1", geonameid: 6, lat: null, lng: null }], 5)).toEqual({ opinion: "difiere", qid: "Q1", geonameid: 6 });
    expect(wikidataOpinion([{ qid: "Q1", geonameid: 6, lat: null, lng: null }, { qid: "Q2", geonameid: 7, lat: null, lng: null }], 5).opinion).toBe("varios");
    expect(wikidataOpinion([], 5).opinion).toBe("sin-dato");
    expect(wikidataOpinion(undefined, 5).opinion).toBe("sin-dato");
  });
});
