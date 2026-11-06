import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { durationLabel, isAudioGuided, languagesLabel } from "./trip-facts";
import { tripCopy } from "./copy";

const es = tripCopy("es");
const opts = (...names: string[]) => names.map((name) => ({ name }));

describe("Duración de la ficha (encabezado)", () => {
  it("REQ-145: transporte con opciones de 24 y 48 h muestra el rango en horas", () => {
    expect(durationLabel({ kind: "transporte", durationDays: 1, options: opts("Discover · 24 horas", "Essential · 24 horas", "Explore · 48 horas") }, es)).toBe("24–48 h");
  });
  it("REQ-145: opciones en días muestran el rango en días", () => {
    expect(durationLabel({ kind: "transporte", durationDays: 1, options: opts("Discover · 1 día", "Essential · 1 día", "Explore · 2 días") }, es)).toBe("1–2 días");
    expect(durationLabel({ kind: "transporte", durationDays: 1, options: opts("Discover · recorrido de 90 min", "Essential · 1 día", "Explore · 2 días") }, es)).toBe("1–2 días");
  });
  it("REQ-145: horas y días mezclados se expresan en días", () => {
    expect(durationLabel({ kind: "transporte", durationDays: 1, options: opts("Discover · 24 horas, con dhow", "Essential · 48 horas", "Explore · 5 días, con desierto") }, es)).toBe("1–5 días");
  });
  it("REQ-145: una sola vigencia o un viaje que no es transporte conserva durationDays", () => {
    expect(durationLabel({ kind: "transporte", durationDays: 2, options: opts("Discover · 48 horas", "Essential · 48 horas") }, es)).toBe("2 días");
    expect(durationLabel({ kind: "circuito", durationDays: 12, options: opts("Salida 1 día", "Salida 3 días") }, es)).toBe("12 días");
    expect(durationLabel({ kind: "tour", durationDays: null, options: [] }, es)).toBeNull();
  });
});

describe("Idiomas en hop-on hop-off", () => {
  it("REQ-146: el bus hop-on hop-off dice «Audioguía en» en vez de «Idiomas del guía»", () => {
    const bus = { kind: "transporte", titleEs: "Bus turístico hop-on hop-off en París" };
    expect(isAudioGuided(bus)).toBe(true);
    expect(languagesLabel(bus, es)).toBe("Audioguía en");
    expect(languagesLabel(bus, tripCopy("en"))).toBe("Audio guide in");
  });
  it("REQ-146: los demás viajes siguen con «Idiomas del guía»", () => {
    expect(languagesLabel({ kind: "tour", titleEs: "Tour por el centro" }, es)).toBe("Idiomas del guía");
    expect(languagesLabel({ kind: "transporte", titleEs: "Traslado aeropuerto–hotel" }, es)).toBe("Idiomas del guía");
  });
});

describe("Texto corto de Big Bus", () => {
  it("REQ-144: el texto corto no repite vigencias", () => {
    const d = JSON.parse(readFileSync("imports/bigbus-2026.json", "utf8")) as { trips: { ref: string; trip: { summaryEs: string } }[] };
    for (const t of d.trips) {
      const m = t.trip.summaryEs.match(/\(([^)]*)\)\.?$/);
      if (!m) continue;
      const parts = m[1].split(/, | o /).map((s) => s.trim());
      expect(new Set(parts).size, `${t.ref}: ${m[1]}`).toBe(parts.length);
    }
  });
});
