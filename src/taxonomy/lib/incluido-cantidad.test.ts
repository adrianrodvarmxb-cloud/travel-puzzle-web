import { describe, expect, it } from "vitest";
import { etiquetasIncluido } from "./incluido-cantidad";

const textos = (r: ReturnType<typeof etiquetasIncluido>) => r.etiquetas.map((e) => e.etiqueta);

describe("REQ-10728: etiquetas «incluido» con cantidad", () => {
  it("REQ-10728: una sola cena en la lista sale como «1 cena incluida», nunca como «cena incluida» a secas", () => {
    const r = etiquetasIncluido({ includes: ["Cena de Pato Laqueado en Beijing"], durationDays: 8 });
    expect(textos(r)).toEqual(["1 cena incluida"]);
  });

  it("REQ-10728: hotel con desayuno da «Desayuno diario» y las noches salen de la duración", () => {
    const r = etiquetasIncluido({ includes: ["Hoteles con desayuno buffet (hoteles previstos o de categoría similar)"], durationDays: 8 });
    expect(textos(r)).toEqual(["Desayuno diario", "7 noches de hotel incluidas"]);
  });

  it("REQ-10728: cantidades escritas en la lista («2 almuerzos y 2 cenas»)", () => {
    const r = etiquetasIncluido({ includes: ["Hoteles previstos con desayuno, o similares", "2 almuerzos y 2 cenas"], durationDays: 6 });
    expect(textos(r)).toEqual(["Desayuno diario", "2 comidas incluidas", "2 cenas incluidas", "5 noches de hotel incluidas"]);
  });

  it("REQ-10728: lo que depende de la opción no lleva etiqueta y se reporta sin cantidad", () => {
    const r = etiquetasIncluido({ includes: ["2 noches en hotel de 4* o 5* previsto o similar, en habitación doble", "Desayuno diario; almuerzos y cenas según la opción (MP o PC)"], durationDays: 3 });
    expect(textos(r)).toEqual(["Desayuno diario", "2 noches de hotel incluidas"]);
    expect(r.sinCantidad).toEqual(["comida", "cena"]);
  });

  it("REQ-10728: «plan alimenticio según la categoría» no promete desayuno; las noches por ciudad se suman si cuadran con la duración", () => {
    const r = etiquetasIncluido({ includes: ["2 noches en Bogotá, 2 en Medellín y 3 en Cartagena en hotel con plan alimenticio según la categoría elegida"], durationDays: 8 });
    expect(textos(r)).toEqual(["7 noches de hotel incluidas"]);
    const mal = etiquetasIncluido({ includes: ["2 noches en Bogotá, 2 en Medellín y 3 en Cartagena en hotel"], durationDays: 10 });
    expect(textos(mal)).toEqual([]);
    expect(mal.sinCantidad).toEqual(["hotel"]);
  });

  it("REQ-10728: «almuerzos indicados en el itinerario» se cuentan día por día y se saltan los no incluidos", () => {
    const r = etiquetasIncluido({
      includes: ["Almuerzos indicados en el itinerario (comida china o buffet mixto)", "Cena de Pato Laqueado en Beijing (en los programas que pasan por Beijing)"],
      itinerary: [
        { text: "Llegada a Beijing. Resto del día libre, almuerzo no incluido. Alojamiento." },
        { text: "Desayuno Buffet. Visita al Palacio Imperial. Almuerzo buffet en un hotel de 5*. Alojamiento." },
        { text: "Desayuno Buffet. Excursión a la Gran Muralla. Almuerzo incluido. Por la noche, cena de bienvenida degustando el Pato Laqueado." },
        { text: "Desayuno. Traslado al aeropuerto." },
      ],
      durationDays: 4,
    });
    expect(textos(r)).toEqual(["2 comidas incluidas", "1 cena incluida"]);
    expect(r.etiquetas.every((e) => e.fuente === "itinerario")).toBe(true);
  });

  it("REQ-10728: si la lista remite al itinerario y no hay itinerario, no hay etiqueta", () => {
    const r = etiquetasIncluido({ includes: ["Pensión completa según el itinerario (bebidas no incluidas)"], durationDays: 5 });
    expect(textos(r)).toEqual(["Desayuno diario"]);
    expect(r.sinCantidad).toEqual(["comida", "cena"]);
  });

  it("REQ-10728: tren y autobús cuentan trayectos; el «city tour en bus» no lleva etiqueta", () => {
    expect(textos(etiquetasIncluido({ includes: ["Tren de ida y vuelta"] }))).toEqual(["Tren de ida y vuelta incluido"]);
    expect(textos(etiquetasIncluido({ includes: ["Tren Agra–Jhansi en clase con aire acondicionado y vuelos Khajuraho–Benarés y Benarés–Delhi"] }))).toEqual(["1 trayecto en tren incluido"]);
    expect(textos(etiquetasIncluido({ includes: ["Bus de subida y bajada a Machu Picchu"] }))).toEqual(["Autobús de ida y vuelta incluido"]);
    expect(textos(etiquetasIncluido({ includes: ["City tour en bus panorámico"] }))).toEqual([]);
    const ambiguo = etiquetasIncluido({ includes: ["Vuelos domésticos o trenes entre ciudades"] });
    expect(textos(ambiguo)).toEqual([]);
    expect(ambiguo.sinCantidad).toEqual(["tren"]);
  });

  it("REQ-10728: comidas sueltas de varias líneas se suman («Giverny guiado con almuerzo», «Cena en crucero por el Sena»)", () => {
    const r = etiquetasIncluido({ includes: ["Giverny guiado con almuerzo", "Cena en crucero por el Sena", "Cena con bebidas en el 1.er piso de la Torre Eiffel"], durationDays: 1 });
    expect(textos(r)).toEqual(["1 comida incluida", "2 cenas incluidas"]);
  });

  it("REQ-10728: una extensión opcional no quita ni pone etiquetas; «recogida en tu hotel» no es hospedaje", () => {
    const r = etiquetasIncluido({ includes: ["Hoteles previstos con desayuno, o similares", "Con extensión: traslados, lancha y noches con desayuno indicadas"], durationDays: 6 });
    expect(textos(r)).toEqual(["Desayuno diario", "5 noches de hotel incluidas"]);
    const tour = etiquetasIncluido({ includes: ["Recogida y regreso al hotel", "Traslados aeropuerto – hotel – aeropuerto"], durationDays: 1 });
    expect(tour).toEqual({ etiquetas: [], sinCantidad: [] });
  });

  it("REQ-10728: un subprograma «de 3 días y 2 noches» no se toma como el total de noches; si las noches no cuadran, no hay etiqueta", () => {
    const r = etiquetasIncluido({ includes: ["Programa en ecolodge de 3 días y 2 noches con canopy", "Alojamiento en hoteles de 3 estrellas y ecolodge"], durationDays: 9 });
    expect(textos(r)).toEqual(["8 noches de hotel incluidas"]);
    const duda = etiquetasIncluido({ includes: ["10 noches de alojamiento en hoteles de 3 estrellas", "1 noche en Aguas Calientes"], durationDays: 11 });
    expect(duda.sinCantidad).toContain("hotel");
  });

  it("REQ-10728: dos trayectos de tren contados en el itinerario no se llaman «ida y vuelta»", () => {
    const r = etiquetasIncluido({
      includes: ["Trenes en clase turista indicados en el itinerario"],
      itinerary: [{ text: "Desayuno. Salida en tren de alta velocidad a Xi'an." }, { text: "Día libre." }, { text: "Traslado a la estación y tren a Shanghai." }],
    });
    expect(textos(r)).toEqual(["2 trayectos en tren incluidos"]);
    expect(textos(etiquetasIncluido({ includes: ["Tren de ida a Aguas Calientes y de regreso a Ollantaytambo"] }))).toEqual(["Tren de ida y vuelta incluido"]);
  });

  it("REQ-10728: con noches a bordo (crucero o tren nocturno) no se promete un número de noches de hotel", () => {
    const r = etiquetasIncluido({ includes: ["Hoteles con desayuno buffet"], itinerary: [{ text: "Embarque en el crucero. Cena y alojamiento a bordo." }], durationDays: 12 });
    expect(textos(r)).toEqual(["Desayuno diario"]);
    expect(r.sinCantidad).toEqual(["hotel"]);
  });

  it("REQ-10733: el bus hop-on hop-off de cualquier proveedor lleva «Autobús turístico incluido», sin número de trayectos", () => {
    const bigBus = etiquetasIncluido({ includes: ["Boleto de autobús turístico hop-on hop-off según la opción elegida"], durationDays: 1 });
    expect(bigBus).toEqual({ etiquetas: [{ concepto: "autobus", cantidad: "turistico", etiqueta: "Autobús turístico incluido", fuente: "incluye" }], sinCantidad: [] });
    expect(textos(etiquetasIncluido({ includes: ["Bus de dos pisos hop-on hop-off, 2 días consecutivos"] }))).toEqual(["Autobús turístico incluido"]);
    expect(textos(etiquetasIncluido({ includes: ["Bus hop-on hop-off 1 día con comentarios (incluido español)", "Almuerzo de 3 tiempos con bebidas"] }))).toEqual(["1 comida incluida", "Autobús turístico incluido"]);
  });

  it("REQ-10728: una ruta que sale y vuelve al mismo punto es «ida y vuelta»", () => {
    expect(textos(etiquetasIncluido({ includes: ["Tren Ollantaytambo – Aguas Calientes – Ollantaytambo"] }))).toEqual(["Tren de ida y vuelta incluido"]);
    expect(textos(etiquetasIncluido({ includes: ["Bus turístico Cusco – Puno por la Ruta del Sol"] }))).toEqual(["1 trayecto en autobús incluido"]);
  });
});
