// REQ-10783: el HTML del proveedor nunca se pinta tal cual en la ficha.
import { describe, expect, it } from "vitest";
import { cleanMeetingPoint, plainLines, plainTitle } from "./meeting-text";

const TANGOL = '<p>Hoteles céntricos de El Calafate</p><ul><li><span style="background-color:rgb(255,255,255);color:rgb(79,107,114);">Abril a Septiembre: Pick up a partir de las 09.00 hs.</span></li><li>Octubre a Marzo: Pick &nbsp;up a partir de las 07.15 hs.</li></ul>';

describe("REQ-10783: HTML del proveedor a texto", () => {
  it("REQ-10783: el título del punto de encuentro de Tangol queda en una línea de texto, sin etiquetas ni estilos", () => {
    expect(plainTitle(TANGOL)).toBe("Hoteles céntricos de El Calafate Abril a Septiembre: Pick up a partir de las 09.00 hs. Octubre a Marzo: Pick up a partir de las 07.15 hs.");
    expect(cleanMeetingPoint({ title: TANGOL, coordinates: "", googlePlaceId: "" })).toEqual({ title: plainTitle(TANGOL), coordinates: "", googlePlaceId: "" });
    expect(cleanMeetingPoint(null)).toBeNull();
  });
  it("REQ-10783: lo que ya es texto (FREETOUR) pasa igual; qué llevar va renglón por renglón", () => {
    expect(plainTitle("351 High Street (Royal Mile), frente a la Catedral de St. Giles.")).toBe("351 High Street (Royal Mile), frente a la Catedral de St. Giles.");
    expect(plainLines("<p>Cámara de fotos.</p><p>&nbsp;Ropa de abrigo.</p><p>&nbsp;Lentes de sol.</p>")).toBe("Cámara de fotos.\nRopa de abrigo.\nLentes de sol.");
    expect(plainLines("<p>Bajo.</p>")).toBe("Bajo.");
    expect(plainLines("Agua.\nGorra.")).toBe("Agua.\nGorra.");
    expect(plainLines(null)).toBeNull();
    expect(plainTitle("Guías Español/Inglés.&nbsp;")).toBe("Guías Español/Inglés."); // renglón de «Incluye» de Tangol
  });
});
