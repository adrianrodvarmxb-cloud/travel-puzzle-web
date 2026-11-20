import { describe, expect, it } from "vitest";
import { highlightItems, descriptionHtml, itineraryDays } from "./content-view";

describe("bloques de contenido de la ficha única", () => {
  it("REQ-10817: lo más destacado solo con lo que trae el proveedor, sin vacíos ni repetidos", () => {
    expect(highlightItems([" Glaciar ", "", "Glaciar", "Navegación"])).toEqual(["Glaciar", "Navegación"]);
    expect(highlightItems([])).toEqual([]);
  });

  it("REQ-10818: descripción saneada (sin script ni atributos); FREETOUR no se reescribe, solo se sanea", () => {
    expect(descriptionHtml('<p class="x">Hola <script>alert(1)</script><b>mundo</b></p>', "ejemplo")).toBe("<p>Hola <b>mundo</b></p>");
    expect(descriptionHtml("<p>Texto original de FREETOUR.</p>", "freetour")).toBe("<p>Texto original de FREETOUR.</p>");
    expect(descriptionHtml("<p>&nbsp;</p>", "ejemplo")).toBeNull();
    expect(descriptionHtml(null, "ejemplo")).toBeNull();
  });

  it("REQ-10819: itinerario por día, en orden, con «Día N» en el idioma; días sin texto fuera", () => {
    const days = itineraryDays([{ day: 2, title: "Glaciar", text: "Navegación." }, { day: 1, title: null, text: "Llegada." }, { day: 3, title: "x", text: " " }], "en");
    expect(days).toEqual([
      { day: 1, label: "Day 1", title: null, text: "Llegada." },
      { day: 2, label: "Day 2", title: "Glaciar", text: "Navegación." },
    ]);
    expect(itineraryDays([], "es")).toEqual([]);
    expect(itineraryDays([{ day: 1, title: null, text: "a" }], "es")[0].label).toBe("Día 1");
  });
});
