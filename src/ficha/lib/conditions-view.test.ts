import { describe, expect, it } from "vitest";
import { beforeYouGoView, conditionsText, conditionsView, importantInfoView, withoutRequestNotes } from "./conditions-view";
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

describe("REQ-10902: el plazo de confirmación se dice completo una sola vez", () => {
  it("REQ-10902: la nota «Reserva bajo solicitud: … 48 horas hábiles; no cobramos nada…» del proveedor se quita del bloque 15; las demás notas quedan", () => {
    const notas = [
      "Salida diaria a las 08:45 desde el mostrador de tours del hotel Paradox Singapore; se confirma con un mínimo de 4 personas.",
      "Reserva bajo solicitud: el operador confirma disponibilidad en un máximo de 48 horas hábiles; no cobramos nada antes de esa confirmación.",
      "Reserva bajo solicitud: confirmamos disponibilidad con Extime Travel antes de cualquier cobro.",
      "Precio por persona en USD, en grupo con guía de habla inglesa.",
    ];
    expect(withoutRequestNotes(notas)).toEqual([notas[0], notas[3]]);
    const v = importantInfoView(notas, null, "es");
    expect(v?.notes).toEqual([notas[0], notas[3]]);
    expect(JSON.stringify(v)).not.toMatch(/48 horas|cobramos/);
    expect(importantInfoView(["Reserva bajo solicitud: confirmamos con el operador."], null, "es")).toBeNull();
    // Una nota que menciona la solicitud en medio del texto no se toca.
    expect(withoutRequestNotes(["Las extensiones se venden bajo solicitud con el circuito."])).toEqual(["Las extensiones se venden bajo solicitud con el circuito."]);
  });
});
