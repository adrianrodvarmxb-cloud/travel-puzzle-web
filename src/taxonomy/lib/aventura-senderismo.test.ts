import { describe, expect, it } from "vitest";
import { PALABRAS_SENDERISMO, propuestaDecision9, veredictoDecision9 } from "./aventura-senderismo";

// REQ-10660 (construye la decisión 9, REQ-10588): aventura y senderismo con guía. Los tours de «Excursiones de
// aventura» de Tangol (9000003) y «Tours de aventura» de FREETOUR (16) que son caminata o trekking pasan a
// «Excursión de un día» con los temas Aventura y Montaña y senderismo. La lista se le muestra al PO antes de aplicarla.
describe("REQ-10660: veredicto por título para la lista de la decisión 9", () => {
  it("REQ-10660: trekking, senderismo, caminata, hike, ascenso y escalada cambian a Excursión de un día", () => {
    for (const t of ["Minitrekking Glaciar Perito Moreno", "Senderismo En La Reserva Barbas Bremen", "Caminata En Archipielago De Anavilhanas", "Trekking Ascenso Volcán Villarrica", "Escalada Nevado Mateo", "Ice Trekking Al Glaciar Grey", "Kayak Y Trekking Rio La Leona", "Trek Parque Nacional Alerce Costero"]) {
      expect(veredictoDecision9(t, 480), t).toMatchObject({ veredicto: "cambia", formato: "excursion-dia", temas: ["aventura", "montana-senderismo"] });
    }
  });
  it("REQ-10660: un lugar de montaña (cerro, volcán, glaciar, laguna, nevado, páramo) sin otra actividad también cambia", () => {
    for (const t of ["Cerro Champaqui", "Montañas Y Glaciares Del Tronador", "Laguna Esmeralda A La Noche", "Explora El Páramo De Santurbán", "Nevado Pastoruri Y Puya Raimondi"]) {
      expect(veredictoDecision9(t, 600).veredicto, t).toBe("cambia");
    }
  });
  it("REQ-10660: otra actividad de aventura (kayak, rafting, 4x4, bici, cabalgata, buceo, buggy, canopy) se queda como Momentos de autor", () => {
    for (const t of ["Rafting Río Mendoza", "Kayak En El Lago Argentino", "Volcan Galan En 4X4", "Circuito Chico En Mountain Bike", "Cabalgata Al Ventisquero Colgante Glaciar El Morado", "Buceo En Los Motus", "Buggy Tour A Genipabu", "Canopy", "Parapente", "Dia De Pesca En El Lago Fonck", "Excursión extrema en quad por la cordillera de los Andes desde Medellín"]) {
      expect(veredictoDecision9(t, 300), t).toMatchObject({ veredicto: "queda", formato: "experiencia-unica" });
    }
  });
  it("REQ-10660: los juegos de exploración autoguiados de FREETOUR se quedan; no son senderismo con guía", () => {
    expect(veredictoDecision9("Fantasmas de Barcelona: juego de exploración autoguiado", 60).veredicto).toBe("queda");
    expect(veredictoDecision9("Brasov romántico: juego de exploración autoguiado y recorrido a pie", 90).veredicto).toBe("queda");
  });
  it("REQ-10660: varios días, autoguiado de trekking, alquiler, transfer y crucero van a dudas", () => {
    expect(veredictoDecision9("Circuito W Express Autoguiado 4 Dias - En Camping O Refugio", 5760).veredicto).toBe("duda");
    expect(veredictoDecision9("Crucero Clásico Galápagos Salvaje 5D/4N", 7200).veredicto).toBe("duda");
    expect(veredictoDecision9("Alquiler De Bicicleta", 360).veredicto).toBe("duda");
    expect(veredictoDecision9("Transfer Escénico Hacia Quila Quina", 60).veredicto).toBe("duda");
    expect(veredictoDecision9("Excursión de tres días a Quito: Los vientos del páramo andino", 600).veredicto).toBe("duda");
    expect(veredictoDecision9("Descubre Reloncavi, Kayak En El Primer Fiordo De Chile", 1440).veredicto).toBe("duda");
  });
  it("REQ-10660: la lista no tiene palabras repetidas y la propuesta cuenta sin perder filas", () => {
    const todas = [...PALABRAS_SENDERISMO.actividad, ...PALABRAS_SENDERISMO.lugar, ...PALABRAS_SENDERISMO.otraActividad, ...PALABRAS_SENDERISMO.duda];
    expect(new Set(todas).size).toBe(todas.length);
    const p = propuestaDecision9([
      { proveedor: "tangol", ciudad: "ushuaia", minutos: 360, titulo: "Trekking A Laguna Esmeralda" },
      { proveedor: "tangol", ciudad: "mendoza", minutos: 360, titulo: "Rafting Río Mendoza" },
      { proveedor: "tangol", ciudad: "colonia", minutos: 360, titulo: "Alquiler De Bicicleta" },
      { proveedor: "freetour", ciudad: "york", minutos: 60, titulo: "Los fantasmas de York: juego de exploración autoguiado" },
    ]);
    expect(p.conteo).toEqual({ cambia: 1, queda: 2, duda: 1 });
    expect(p.porProveedor).toEqual({ tangol: { cambia: 1, queda: 1, duda: 1 }, freetour: { cambia: 0, queda: 1, duda: 0 } });
    expect(p.filas).toHaveLength(4);
    expect(p.filas[0]).toMatchObject({ titulo: "Trekking A Laguna Esmeralda", veredicto: "cambia", regla: expect.stringContaining("trekking") });
  });
});
