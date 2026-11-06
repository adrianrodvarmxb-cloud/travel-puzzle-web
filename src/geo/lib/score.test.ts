import { describe, it, expect } from "vitest";
import { distanceScore, scoreCandidate, decideMatch, THRESHOLDS, type Candidate } from "./score";

const c = (over: Partial<Candidate> & Pick<Candidate, "geonameid">): Candidate => ({
  name: "X", admin1: "01", countryCode: "GR", population: 1000, lat: 0, lng: 0, match: "exact", nameScore: 1, distanceKm: null, ...over,
});

describe("puntaje", () => {
  it("REQ-133: la distancia es puntaje, no filtro: 1 hasta 15 km, baja lineal y 0 desde 100 km", () => {
    expect(distanceScore(3)).toBe(1);
    expect(distanceScore(15)).toBe(1);
    expect(distanceScore(57.5)).toBeCloseTo(0.5, 2);
    expect(distanceScore(100)).toBe(0);
    expect(distanceScore(4657)).toBe(0);
    expect(distanceScore(null)).toBe(0.5); // sin centroide: neutro
  });

  it("REQ-133: puntaje = 0.6 nombre + 0.4 distancia", () => {
    expect(scoreCandidate({ nameScore: 1, distanceKm: 5 })).toBe(1);
    expect(scoreCandidate({ nameScore: 0.95, distanceKm: 200 })).toBe(0.57);
  });

  it("REQ-133: umbrales del informe", () => {
    expect(THRESHOLDS).toMatchObject({ autoKm: 30, autoFarKm: 70, rivalKm: 150, fuzzyJw: 0.93, fuzzyKm: 15, populationLead: 10 });
  });
});

describe("decideMatch con centroide confiable", () => {
  it("REQ-133: nombre exacto a ≤ 30 km y sin otro igual cerca → auto", () => {
    const d = decideMatch({ candidates: [c({ geonameid: 1, distanceKm: 4 })], reliable: true });
    expect(d).toMatchObject({ status: "auto", geonameid: 1 });
  });

  it("REQ-133: nombre exacto a 30–70 km sin rival a 150 km → auto (antes se tumbaba)", () => {
    const d = decideMatch({ candidates: [c({ geonameid: 2, distanceKm: 54 })], reliable: true });
    expect(d).toMatchObject({ status: "auto", geonameid: 2 });
  });

  it("REQ-133: dos con el mismo nombre a ≤ 30 km → revisar", () => {
    const d = decideMatch({ candidates: [c({ geonameid: 1, distanceKm: 4 }), c({ geonameid: 3, distanceKm: 20 })], reliable: true });
    expect(d.status).toBe("revisar");
  });

  it("REQ-133: homónimo (Side): gana el cercano, no el más poblado", () => {
    const d = decideMatch({
      candidates: [c({ geonameid: 10, distanceKm: 708, population: 90000 }), c({ geonameid: 11, distanceKm: 2, population: 14000 })],
      reliable: true,
    });
    expect(d).toMatchObject({ status: "auto", geonameid: 11 });
  });

  it("REQ-133: el exacto gana a una variante más cercana (Center City / «Centro de Filadelfia»)", () => {
    const d = decideMatch({ candidates: [c({ geonameid: 4560349, distanceKm: 1.2 }), c({ geonameid: 9958118, match: "variant", nameScore: 0.97, distanceKm: 0.9 })], reliable: true });
    expect(d).toMatchObject({ status: "auto", geonameid: 4560349 });
  });

  it("REQ-133: un barrio (PPLX) no compite con la ciudad del mismo nombre (Zürich Kreis 1)", () => {
    const d = decideMatch({ candidates: [c({ geonameid: 6295546, distanceKm: 0.3, featureCode: "PPLX" }), c({ geonameid: 2657896, distanceKm: 1.1, featureCode: "PPLA" })], reliable: true });
    expect(d).toMatchObject({ status: "auto", geonameid: 2657896 });
    const u = decideMatch({ candidates: [c({ geonameid: 6295546, featureCode: "PPLX" }), c({ geonameid: 2657896, featureCode: "PPLA" })], reliable: false });
    expect(u).toMatchObject({ status: "auto", geonameid: 2657896 });
  });

  it("REQ-133: nombre exacto pero a más de 70 km → revisar con el candidato propuesto", () => {
    const d = decideMatch({ candidates: [c({ geonameid: 5, distanceKm: 144 })], reliable: true });
    expect(d).toMatchObject({ status: "revisar", geonameid: 5 });
  });

  it("REQ-133: variante (San/Saint, prefijo) solo es auto a ≤ 30 km", () => {
    expect(decideMatch({ candidates: [c({ geonameid: 6, match: "variant", nameScore: 0.97, distanceKm: 3 })], reliable: true }).status).toBe("auto");
    expect(decideMatch({ candidates: [c({ geonameid: 6, match: "variant", nameScore: 0.97, distanceKm: 50 })], reliable: true }).status).toBe("revisar");
  });

  it("REQ-133: fuzzy solo con JW ≥ 0.93 y ≤ 15 km", () => {
    expect(decideMatch({ candidates: [c({ geonameid: 7, match: "fuzzy", nameScore: 0.95, distanceKm: 9 })], reliable: true }).status).toBe("auto");
    expect(decideMatch({ candidates: [c({ geonameid: 7, match: "fuzzy", nameScore: 0.95, distanceKm: 20 })], reliable: true }).status).toBe("revisar");
    expect(decideMatch({ candidates: [c({ geonameid: 7, match: "fuzzy", nameScore: 0.9, distanceKm: 2 })], reliable: true }).status).toBe("revisar");
  });

  it("REQ-133: «la más cercana» sin nombre nunca es auto", () => {
    const d = decideMatch({ candidates: [c({ geonameid: 8, match: "nearest", nameScore: 0, distanceKm: 0.7 })], reliable: true });
    expect(d.status).toBe("revisar");
  });

  it("REQ-133: sin candidatos → sin-candidato", () => {
    expect(decideMatch({ candidates: [], reliable: true }).status).toBe("sin-candidato");
  });

  it("REQ-133: devuelve el top-3 ordenado por puntaje", () => {
    const d = decideMatch({
      candidates: [c({ geonameid: 1, distanceKm: 90 }), c({ geonameid: 2, distanceKm: 1 }), c({ geonameid: 3, distanceKm: 40 }), c({ geonameid: 4, distanceKm: 300 })],
      reliable: true,
    });
    expect(d.top.map((t) => t.geonameid)).toEqual([2, 3, 1]);
  });
});

describe("decideMatch con centroide no confiable: «nombre exacto único en el país»", () => {
  it("REQ-133: un solo nombre exacto en el país → auto aunque esté lejos del centroide (Delphi en Atenas)", () => {
    const d = decideMatch({ candidates: [c({ geonameid: 20, distanceKm: 120 })], reliable: false });
    expect(d).toMatchObject({ status: "auto", geonameid: 20 });
    expect(d.reason).toMatch(/único/);
  });

  it("REQ-133: varios exactos → desempate por población solo si el primero tiene ≥ 10×", () => {
    expect(decideMatch({ candidates: [c({ geonameid: 1, population: 500000 }), c({ geonameid: 2, population: 800 })], reliable: false })).toMatchObject({ status: "auto", geonameid: 1 });
    expect(decideMatch({ candidates: [c({ geonameid: 1, population: 5000 }), c({ geonameid: 2, population: 800 })], reliable: false }).status).toBe("revisar");
  });

  it("REQ-133: un nombre que solo es alternatename suelto (La Palma → La Palma del Condado) no basta → revisar", () => {
    expect(decideMatch({ candidates: [c({ geonameid: 2515679, strong: false })], reliable: false }).status).toBe("revisar");
  });

  it("REQ-133: solo variantes o cercanas → revisar", () => {
    expect(decideMatch({ candidates: [c({ geonameid: 1, match: "variant", nameScore: 0.97 })], reliable: false }).status).toBe("revisar");
    expect(decideMatch({ candidates: [c({ geonameid: 1, match: "nearest", nameScore: 0 })], reliable: false }).status).toBe("revisar");
  });
});
