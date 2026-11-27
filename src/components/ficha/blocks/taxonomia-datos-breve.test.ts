import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TaxonomiaBlock } from "./TaxonomiaBlock";
import { DatosClaveBlock } from "./DatosClaveBlock";
import { EnBreveBlock } from "./EnBreveBlock";
import { taxonomyChips } from "@/ficha/lib/taxonomy-view";
import { keyFactsRows } from "@/ficha/lib/key-facts";
import { briefHeading, briefText } from "@/ficha/lib/brief-view";
import { fichaEjemplo } from "@/ficha/lib/fixtures";

const f = fichaEjemplo();
const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);

describe("Bloques 4, 5 y 6 de la ficha única", () => {
  it("REQ-10814: la taxonomía pinta el tipo primero; sin etiquetas no pinta nada", () => {
    const out = html(createElement(TaxonomiaBlock, { chips: taxonomyChips(f.taxonomy, f.provider) }));
    expect(out).toContain('data-kind="tipo"');
    expect(out).toContain("Excursión de un día");
    expect(html(createElement(TaxonomiaBlock, { chips: [] }))).toBe("");
  });

  it("REQ-10815: datos clave solo con filas con dato, nunca «N/D»", () => {
    const out = html(createElement(DatosClaveBlock, { rows: keyFactsRows(f.facts, f.lang) }));
    expect(out.match(/<dt/g)).toHaveLength(5);
    expect(out).toContain("8 h");
    expect(out).not.toContain("Temporada");
    expect(out).not.toContain("N/D");
    expect(html(createElement(DatosClaveBlock, { rows: [] }))).toBe("");
  });

  it("REQ-10816: «En breve» sale con su título; en FREETOUR no pinta nada y nunca nombra al operador", () => {
    const out = html(createElement(EnBreveBlock, { text: briefText(f), heading: briefHeading(f.lang) }));
    expect(out).toContain("En breve");
    expect(out).toContain("Un día en el glaciar.");
    expect(out).not.toContain(f.operator!);
    expect(html(createElement(EnBreveBlock, { text: briefText({ ...f, provider: "freetour" }), heading: briefHeading("es") }))).toBe("");
  });
});
