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
    const r = publishChecklist({ ...full, titleEs: "x".repeat(61), highlights: ["uno"], images: full.images.slice(0, 2), options: [], meetingPoints: [{ ...full.meetingPoints[0], lat: null, lng: null }], languages: [] });
    expect(r).toEqual([
      "título de máximo 60 caracteres",
      "3 a 5 puntos destacados",
      "al menos una opción con precio adulto",
      "punto de encuentro con ubicación en el mapa",
      "idiomas del guía",
      `al menos ${MIN_PHOTOS} fotos (tienes 2)`,
    ]);
  });
  it("personalizado: sin precio ni punto de encuentro obligatorio", () => {
    expect(publishChecklist({ ...full, kind: "personalizado", options: [], meetingPoints: [] })).toEqual([]);
  });
});
