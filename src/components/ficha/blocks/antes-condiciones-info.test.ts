import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AntesDeIrBlock } from "./AntesDeIrBlock";
import { CondicionesBlock } from "./CondicionesBlock";
import { InfoImportanteBlock } from "./InfoImportanteBlock";
import { beforeYouGoView, conditionsText, conditionsView, importantInfoView } from "@/ficha/lib/conditions-view";
import { bookingSteps } from "@/trips/lib/booking-steps";
import { fichaEjemplo } from "@/ficha/lib/fixtures";

const f = fichaEjemplo();
const r = renderToStaticMarkup;
const T13 = { heading: conditionsText("antesDeIr", "es"), bring: conditionsText("queLlevar", "es"), requirements: conditionsText("requisitos", "es") };
const T14 = { heading: conditionsText("condiciones", "es"), cancellation: conditionsText("cancelacion", "es") };

describe("Bloques 13, 14 y 15 de la ficha única", () => {
  it("REQ-10831: qué llevar sin requisitos vacíos; sin nada no pinta", () => {
    const out = r(createElement(AntesDeIrBlock, { view: beforeYouGoView(f.whatToBring, f.requirements), text: T13 }));
    expect(out).toContain("Ropa de abrigo");
    expect(out).not.toContain('data-lista="requisitos"');
    expect(r(createElement(AntesDeIrBlock, { view: beforeYouGoView([], []), text: T13 }))).toBe("");
  });

  it("REQ-10832: una sola cancelación y los pasos con 48 horas hábiles; sin política, solo los pasos", () => {
    const how = bookingSteps("es", { cardHold: false });
    const out = r(createElement(CondicionesBlock, { view: conditionsView(f.cancellation, f.lang, how), text: T14 }));
    expect(out.match(/data-cancelacion/g)).toHaveLength(1);
    expect(out).toContain("48 h antes de la salida");
    expect(out).toContain("48 horas hábiles");
    const sin = r(createElement(CondicionesBlock, { view: conditionsView(null, "es", how), text: T14 }));
    expect(sin).not.toContain("data-cancelacion");
    expect(sin).toContain("Cómo funciona tu reserva");
  });

  it("REQ-10833: «Opera en destino» discreto; sin notas ni operador no pinta", () => {
    const out = r(createElement(InfoImportanteBlock, { view: importantInfoView(f.notes, f.operator, f.lang), heading: conditionsText("informacion", "es") }));
    expect(out).toContain("Opera en destino: Operador de ejemplo");
    expect(r(createElement(InfoImportanteBlock, { view: importantInfoView([], null, "es"), heading: "x" }))).toBe("");
  });
});
