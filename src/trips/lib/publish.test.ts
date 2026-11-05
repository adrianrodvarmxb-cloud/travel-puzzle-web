import { describe, it, expect } from "vitest";
import { publishChecklist, MIN_PHOTOS } from "./publish";

const full = {
  kind: "tour" as const, titleEs: "Tour gastronómico por Oaxaca", summaryEs: "Prueba los sabores", descriptionEs: "Descripción",
  highlights: ["Prueba mole", "Visita mercado", "Aprende a cocinar"], includes: ["Comida"], excludes: ["Propinas"],
  countries: ["MX"], durationDays: 1, languages: ["es"],
  options: [{ id: "a", name: "Grupo", mode: "group" as const, adult: 900, child: null, infant: null, childAgeMin: 3, childAgeMax: 11 }],
  meetingPoints: [{ name: "Zócalo", address: "Centro", lat: 17.06, lng: -96.72, instructions: "", photoKey: null }],
  images: Array.from({ length: MIN_PHOTOS }, (_, i) => ({ key: `trips/${i}-a.jpg`, alt: "" })),
};

describe("publishChecklist (estándar GYG, gate J)", () => {
  it("completo: nada falta", () => {
    expect(publishChecklist(full)).toEqual([]);
  });
  it("dice exactamente qué falta", () => {
    const r = publishChecklist({ ...full, titleEs: "x".repeat(61), highlights: ["uno"], images: [], options: [], meetingPoints: [{ ...full.meetingPoints[0], lat: null, lng: null }], languages: [] });
    expect(r).toEqual([
      "título de máximo 60 caracteres",
      "3 a 5 puntos destacados",
      "al menos una opción con precio adulto",
      "punto de encuentro con ubicación en el mapa",
      "idiomas del guía",
      "al menos 1 foto (tienes 0)",
    ]);
  });
  it("REQ-043: basta 1 foto para publicar (sin mínimo de 5)", () => {
    expect(MIN_PHOTOS).toBe(1);
    expect(publishChecklist({ ...full, images: full.images.slice(0, 1) })).toEqual([]);
  });
  it("personalizado: sin precio ni punto de encuentro obligatorio", () => {
    expect(publishChecklist({ ...full, kind: "personalizado", options: [], meetingPoints: [] })).toEqual([]);
  });
});
