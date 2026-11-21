import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PreguntasBlock } from "./PreguntasBlock";
import { MilaBlock } from "./MilaBlock";
import { ResenasBlock } from "./ResenasBlock";
import { FAQ_LEGEND_K, faqBlockView, milaBlockView, reviewsBlockView, type FichaReviewInput } from "@/ficha/lib/closing-view";
import { keyFactsRows } from "@/ficha/lib/key-facts";
import { fichaEjemplo } from "@/ficha/lib/fixtures";

const f = fichaEjemplo();
const r = renderToStaticMarkup;
const rev = (id: number, extra: Partial<FichaReviewInput> = {}): FichaReviewInput => ({ id, reviewerName: `Viajero ${id}`, title: null, content: `Muy buen tour ${id}`, rate: 5, addedAt: "2026-10-01T00:00:00.000Z", ...extra });

describe("Bloques 16, 17 y 18 de la ficha única", () => {
  it("REQ-10839: preguntas con datos reales y nada sin datos", () => {
    const view = faqBlockView(f);
    expect(view).not.toBeNull();
    const out = r(createElement(PreguntasBlock, { view }));
    expect(out).toContain('data-bloque="preguntas"');
    expect(out).toContain("¿Cuánto dura?");
    expect(out).not.toContain("N/D");
    const vacia = { ...f, cancellation: null, facts: { ...f.facts, duration: null, languages: [], ages: null }, meeting: { ...f.meeting, title: null }, whatToBring: [], price: null };
    expect(faqBlockView(vacia)).toBeNull();
    expect(r(createElement(PreguntasBlock, { view: null }))).toBe("");
  });

  it("REQ-10803: el bloque cierra con §K literal y la duración es la de «Datos clave» (voucher)", () => {
    const out = r(createElement(PreguntasBlock, { view: faqBlockView(f) }));
    expect(FAQ_LEGEND_K).toBe("La información aquí resumida tiene carácter orientativo; las condiciones exactas, horarios definitivos y reglas de cancelación aplicables a su reserva son los establecidos en la ficha específica del servicio, en su confirmación y en nuestros Términos y Condiciones.");
    expect(out.trimEnd().endsWith(`<p data-leyenda="k" class="mt-3 text-xs text-white/60">${FAQ_LEGEND_K}</p></section>`)).toBe(true);
    const dur = keyFactsRows(f.facts, f.lang).find((x) => x.id === "duracion")!.value;
    expect(faqBlockView(f)!.items.find((i) => i.id === "duracion")!.a).toContain(dur);
    expect(faqBlockView({ ...f, lang: "en" })!.legend).toBe(FAQ_LEGEND_K);
  });

  it("REQ-10840: Mila con el código de la ficha y aviso de IA; nunca en FREETOUR ni sin número", () => {
    const view = milaBlockView(f, "5215512345678", {});
    const out = r(createElement(MilaBlock, { view }));
    expect(out).toContain("https://wa.me/5215512345678");
    expect(out).toContain("inteligencia artificial");
    expect(decodeURIComponent(view!.href)).toContain("ejemplo-1");
    expect(milaBlockView({ ...f, provider: "freetour" }, "5215512345678", {})).toBeNull();
    expect(milaBlockView(f, null, {})).toBeNull();
    expect(r(createElement(MilaBlock, { view: null }))).toBe("");
  });

  it("REQ-10841: solo reseñas del mismo proveedor y las propias; fuera las que nombran la plataforma", () => {
    const view = reviewsBlockView(f, [rev(1, { provider: "ejemplo" }), rev(2, { provider: "otro" }), rev(3, { verified: true }), rev(4, { provider: "ejemplo", content: "Lo reservé en freetour.com" }), rev(5)], 40);
    const out = r(createElement(ResenasBlock, { view, language: "es" }));
    expect(view!.items.map((x) => x.id)).toEqual([1, 3]);
    expect(out).toContain("40 reseñas");
    expect(out).not.toContain("Viajero 2");
    expect(out).not.toContain("provider");
    expect(reviewsBlockView(f, [rev(2, { provider: "otro" })], 3)).toBeNull();
    expect(r(createElement(ResenasBlock, { view: null, language: "es" }))).toBe("");
  });

  it("REQ-10841: Tangol (nota oculta, decisión 18) sin conteo y solo las propias de Travel Puzzle", () => {
    const view = reviewsBlockView({ provider: "tangol", lang: "es" }, [rev(1, { provider: "tangol" }), rev(3, { verified: true })], 120);
    expect(view!.items.map((x) => x.id)).toEqual([3]);
    expect(view!.totalText).toBeNull();
    expect(r(createElement(ResenasBlock, { view, language: "es" }))).not.toContain("data-conteo");
  });
});
