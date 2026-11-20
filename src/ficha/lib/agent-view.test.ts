import { describe, expect, it } from "vitest";
import { fichaEjemplo } from "./fixtures";
import { agentView, agentViewText } from "./agent-view";
import { cancellationSummary } from "./cancellation";
import { keyFactsRows } from "./key-facts";

describe("REQ-10825: vista de Mila desde el modelo común (decisiones 40 y 42; igual que la pública, sin FREETOUR)", () => {
  it("REQ-10825: la vista trae los mismos datos públicos que la ficha", () => {
    const f = fichaEjemplo();
    const v = agentView(f, { path: "/destinos/ar/el-calafate/tour-de-ejemplo" })!;
    expect(v.title).toBe(f.title);
    expect(v.reference).toBe("ejemplo-1");
    expect(v.place).toBe("El Calafate, Argentina");
    expect(v.summary).toBe("Un día en el glaciar.");
    expect(v.duration).toBe(keyFactsRows(f.facts, "es").find((r) => r.id === "duracion")!.value);
    expect(v.languages).toEqual(["es", "en"]);
    expect(v.price).toEqual({ amount: 98, currency: "USD", per: "person" });
    expect(v.cancellation).toBe(cancellationSummary(48, "es"));
    expect(v.meeting).toBe("Hoteles céntricos");
    expect(v.includes).toEqual(["Transporte"]);
    expect(v.excludes).toEqual(["Almuerzo"]);
    expect(v.options).toEqual([]);
    expect(v.operator).toBe("Operador de ejemplo");
    expect(v.booking).toEqual({ mode: "request", path: "/destinos/ar/el-calafate/tour-de-ejemplo" });
  });

  it("REQ-10825: FREETOUR nunca sale (decisión 42; regla B3)", () => {
    const f = fichaEjemplo(); f.provider = "freetour";
    expect(agentView(f, { path: "/x" })).toBeNull();
    expect(agentViewText(f, { path: "/x" })).toBeNull();
  });

  it("REQ-10825: la descripción se entrega como texto plano, sin HTML, cuando no hay «En breve»", () => {
    const f = fichaEjemplo(); f.brief = null; f.descriptionHtml = "<p>Caminata <b>guiada</b>.</p><ul><li>Hielo</li></ul>";
    expect(agentView(f, { path: "/x" })!.summary).toBe("Caminata guiada. Hielo");
  });

  it("REQ-10825: las opciones llevan nombre y precio público; sin neto, teléfonos ni correos en toda la vista", () => {
    const f = fichaEjemplo();
    f.options = [
      { id: "a", name: "Con traslado", price: { amount: 120, currency: "USD", per: "person" }, transferIncluded: true, startTime: "08:00" },
      { id: "b", name: "Sin traslado", price: null, transferIncluded: false, startTime: null },
    ];
    const v = agentView(f, { path: "/x" })!;
    expect(v.options).toEqual([{ id: "a", name: "Con traslado", price: { amount: 120, currency: "USD", per: "person" } }, { id: "b", name: "Sin traslado", price: null }]);
    const texto = JSON.stringify(v);
    expect(texto).not.toMatch(/neto|net|comisi|\+?\d{10,}|@/i);
    expect(Object.keys(v)).not.toContain("gallery");
  });

  it("REQ-10825: el texto para el prompt es corto, en el idioma de la ficha y manda a la ficha para reservar (decisión 40)", () => {
    const t = agentViewText(fichaEjemplo(), { path: "/destinos/ar/el-calafate/tour-de-ejemplo" })!;
    expect(t).toContain("Tour de ejemplo");
    expect(t).toContain("USD $98 por persona");
    expect(t).toContain("Cancelación sin cargo hasta 48 h antes de la salida.");
    expect(t).toContain("Reservar: /destinos/ar/el-calafate/tour-de-ejemplo");
    expect(t).not.toContain("<p>");
    const en = fichaEjemplo(); en.lang = "en";
    expect(agentViewText(en, { path: "/x" })!).toContain("Book: /x");
  });
});
