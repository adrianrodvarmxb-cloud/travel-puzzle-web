import { describe, it, expect } from "vitest";
import { assessCentroids, centroidOf, spreadKm, FILLER_POINTS } from "./centroid";

const P = (lat: number, lng: number) => ({ lat, lng });
const ATHENS = P(37.98417, 23.72778);

describe("centroidOf y spreadKm", () => {
  it("REQ-132: mediana de los puntos y dispersión mediana en km", () => {
    expect(centroidOf([P(1, 1), P(2, 2), P(30, 30)])).toEqual(P(2, 2));
    expect(centroidOf([])).toBeNull();
    expect(spreadKm([P(0, 1), P(0, 1)], P(0, 1))).toBe(0);
  });
});

describe("assessCentroids", () => {
  const sameCountry = () => 0; // la ciudad del país más cercana está a 0 km

  it("REQ-132: el relleno 51.478,0.0015 (Greenwich) nunca es confiable", () => {
    expect(FILLER_POINTS[0]).toEqual(P(51.478, 0.0015));
    const r = assessCentroids([{ id: 1482, points: [P(51.478, 0.0015)] }], sameCountry);
    expect(r.get(1482)).toMatchObject({ reliable: false });
    expect(r.get(1482)!.reasons.join()).toMatch(/relleno/);
  });

  it("REQ-132: un centroide compartido por varias ciudades (la ciudad de salida) no es confiable para ninguna", () => {
    const r = assessCentroids(
      [
        { id: 1606, points: [ATHENS] }, // Delphi
        { id: 1669, points: [ATHENS] }, // Olympia
        { id: 1, points: [P(40.64, 22.94)] }, // Tesalónica, sola
      ],
      sameCountry,
    );
    expect(r.get(1606)!.reliable).toBe(false);
    expect(r.get(1606)!.reasons.join()).toMatch(/compartido/);
    expect(r.get(1669)!.reliable).toBe(false);
    expect(r.get(1)!.reliable).toBe(true);
  });

  it("REQ-132: los alias de una misma ciudad no cuentan como «compartido»", () => {
    const r = assessCentroids([{ id: 4200, points: [P(25.04, 121.51)] }, { id: 6172, points: [P(25.04, 121.51)] }], sameCountry, { sameGroup: () => true });
    expect(r.get(4200)!.reliable).toBe(true);
  });

  it("REQ-132: dispersión de más de 25 km → no confiable", () => {
    const r = assessCentroids([{ id: 7, points: [P(40, 20), P(40.6, 20), P(41.2, 20)] }], sameCountry);
    expect(r.get(7)!.reliable).toBe(false);
    expect(r.get(7)!.reasons.join()).toMatch(/dispersi/);
  });

  it("REQ-132: lejos de cualquier ciudad de su país (cae en otro país) → no confiable", () => {
    const r = assessCentroids([{ id: 818, points: [P(48.65, 63.3)] }], () => 900);
    expect(r.get(818)!.reliable).toBe(false);
    expect(r.get(818)!.reasons.join()).toMatch(/país/);
  });

  it("REQ-132: sin puntos → sin centroide y no confiable", () => {
    const r = assessCentroids([{ id: 9, points: [] }], sameCountry);
    expect(r.get(9)).toMatchObject({ centroid: null, reliable: false });
  });
});
