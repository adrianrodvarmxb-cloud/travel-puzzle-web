// REQ-10728 / REQ-10733: las etiquetas «incluido» con cantidad se muestran en la ficha del viaje, tras bandera, en el
// idioma de la página (es y en; los demás idiomas usan en). Sin cantidad cierta, sin etiqueta.
// npx vitest run src/taxonomy/lib/incluido-ficha.test.ts
import { describe, expect, it } from "vitest";
import { etiquetasIncluidoFicha, incluidoFichaEnabled, textoEtiquetaIncluido } from "./incluido-ficha";

const trip = { includes: ["Cena de Pato Laqueado en Beijing", "Tren de alta velocidad Beijing - Xian", "Hoteles con desayuno buffet"], itinerary: [], durationDays: 8 };

describe("REQ-10728: etiquetas «incluido» en la ficha", () => {
  it("REQ-10728: con la bandera encendida devuelve las etiquetas con cantidad en español", () => {
    const e = etiquetasIncluidoFicha(trip, "es", { INCLUIDO_ETIQUETAS_ENABLED: "true" });
    expect(e).toContain("1 cena incluida");
    expect(e).toContain("Desayuno diario");
    expect(e.some((x) => /tren/.test(x))).toBe(true);
  });

  it("REQ-10728: con la bandera apagada no devuelve nada (la ficha queda como hoy)", () => {
    expect(etiquetasIncluidoFicha(trip, "es", { INCLUIDO_ETIQUETAS_ENABLED: "false" })).toEqual([]);
    expect(etiquetasIncluidoFicha(trip, "es", {})).toEqual([]);
    expect(incluidoFichaEnabled({ INCLUIDO_ETIQUETAS_ENABLED: "TRUE" })).toBe(false);
  });

  it("REQ-10728: en inglés traduce la misma cantidad; otros idiomas usan inglés", () => {
    const en = etiquetasIncluidoFicha(trip, "en", { INCLUIDO_ETIQUETAS_ENABLED: "true" });
    expect(en).toContain("1 dinner included");
    expect(en).toContain("Daily breakfast");
    expect(etiquetasIncluidoFicha(trip, "de", { INCLUIDO_ETIQUETAS_ENABLED: "true" })).toEqual(en);
  });

  it("REQ-10728: sin cantidad cierta no hay etiqueta (nunca sugiere más de lo que incluye)", () => {
    const e = etiquetasIncluidoFicha({ includes: ["Comidas según la opción elegida"], durationDays: 5 }, "es", { INCLUIDO_ETIQUETAS_ENABLED: "true" });
    expect(e).toEqual([]);
  });

  it("REQ-10733: el bus turístico hop-on hop-off lleva «Autobús turístico incluido» / «Sightseeing bus included»", () => {
    const bb = { includes: ["Bus turístico hop-on hop-off con paradas libres"], durationDays: 1 };
    expect(etiquetasIncluidoFicha(bb, "es", { INCLUIDO_ETIQUETAS_ENABLED: "true" })).toEqual(["Autobús turístico incluido"]);
    expect(etiquetasIncluidoFicha(bb, "en", { INCLUIDO_ETIQUETAS_ENABLED: "true" })).toEqual(["Sightseeing bus included"]);
  });

  it("REQ-10728: textos en inglés por concepto y cantidad", () => {
    expect(textoEtiquetaIncluido({ concepto: "hotel", cantidad: 7, etiqueta: "", fuente: "incluye" }, "en")).toBe("7 hotel nights included");
    expect(textoEtiquetaIncluido({ concepto: "tren", cantidad: 2, idaYVuelta: true, etiqueta: "", fuente: "incluye" }, "en")).toBe("Round-trip train included");
    expect(textoEtiquetaIncluido({ concepto: "comida", cantidad: 1, etiqueta: "1 comida incluida", fuente: "incluye" }, "es")).toBe("1 comida incluida");
  });
});
