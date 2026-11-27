import { describe, expect, it } from "vitest";
import { beforeYouGoView, conditionsText, conditionsView, importantInfoView } from "./conditions-view";
import { bookingSteps } from "@/trips/lib/booking-steps";

describe("Ficha única, bloques 13–15 (lógica)", () => {
  it("REQ-10831: qué llevar y requisitos sin vacíos ni repetidos; sin nada, null", () => {
    expect(beforeYouGoView(["Agua", "Agua", " "], [])).toEqual({ bring: ["Agua"], requirements: [] });
    expect(beforeYouGoView([], ["Pasaporte"])?.requirements).toEqual(["Pasaporte"]);
    expect(beforeYouGoView([" "], [])).toBeNull();
  });

  it("REQ-10832: una sola cancelación (horas resumidas o texto) y «Cómo funciona tu reserva» con 48 horas hábiles", () => {
    const how = bookingSteps("es", { cardHold: false });
    const v = conditionsView({ hours: 48, text: null }, "es", how);
    expect(v.cancellation).toBe("Cancelación sin cargo hasta 48 h antes de la salida.");
    expect(v.howTitle).toBe("Cómo funciona tu reserva");
    expect(v.howSteps.join(" ")).toContain("48 horas hábiles");
    expect(conditionsView({ hours: 168, text: null }, "es", how).cancellation).toBe("Cancelación sin cargo hasta 7 días antes de la salida.");
    expect(conditionsView({ hours: null, text: "No reembolsable" }, "es", how).cancellation).toBe("No reembolsable");
    expect(conditionsView(null, "es", how).cancellation).toBeNull();
  });

  it("REQ-10833: notas y la línea «Opera en destino: …»; sin operador ni notas, null", () => {
    expect(importantInfoView(["Llevar DNI"], "Operador X", "es")).toEqual({ notes: ["Llevar DNI"], operatorLine: "Opera en destino: Operador X" });
    expect(importantInfoView([], "Operador X", "en")?.operatorLine).toBe("Operated locally by: Operador X");
    expect(importantInfoView(["Nota"], null, "es")?.operatorLine).toBeNull();
    expect(importantInfoView([], "  ", "es")).toBeNull();
  });

  it("REQ-10831 REQ-10832 REQ-10833: títulos en cada idioma, español por defecto", () => {
    expect(conditionsText("antesDeIr", "es")).toBe("Antes de ir");
    expect(conditionsText("informacion", "en")).toBe("Important information");
    expect(conditionsText("condiciones", "xx" as never)).toBe("Condiciones");
  });
});

describe("REQ-10895: el operador se dice una sola vez (decisión 38)", () => {
  it("REQ-10895: las notas «Operador local: …» / «Operado por …» / «Local operator: …» se quitan del bloque 15 y queda la línea discreta", () => {
    const notas = [
      "Salida diaria a las 08:45 desde el mostrador de tours del hotel Paradox Singapore; se confirma con un mínimo de 4 personas.",
      "Operador local: Turismo Asiático, división de The Malayan Safari & Expedition Company SDN BHD (licencia KPL No. 4824, Malasia).",
      "Operado por Turismo Asiático.",
      "Local operator: Turismo Asiático.",
      "Operated by Turismo Asiático.",
      "Precio por persona en USD, en grupo con guía de habla inglesa.",
    ];
    const v = importantInfoView(notas, "Turismo Asiático", "es");
    expect(v?.notes).toEqual([notas[0], notas[5]]);
    expect(v?.operatorLine).toBe("Opera en destino: Turismo Asiático");
    expect(JSON.stringify(v)).not.toMatch(/Operador local|Operado por|Local operator|Operated by/);
    // Una nota que solo menciona al operador en medio del texto no se toca.
    expect(importantInfoView(["El operador local confirma en 48 h."], null, "es")?.notes).toEqual(["El operador local confirma en 48 h."]);
    // Solo notas de operador y sin línea discreta: el bloque no sale.
    expect(importantInfoView(["Operador local: X"], null, "es")).toBeNull();
  });
});
