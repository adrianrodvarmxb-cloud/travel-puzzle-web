import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CityGuideView } from "./CityGuideView";
import { parseGuide } from "@/destinations/lib/guia";
import { sampleGuide } from "@/destinations/fixtures/guias";

describe("CityGuideView", () => {
  it("REQ-1230: pinta «En breve», las preguntas como subtítulos, los enlaces a las fuentes y «Cómo lo sabemos»", () => {
    const r = parseGuide(sampleGuide());
    if (!r.ok) throw new Error(r.error);
    const html = renderToStaticMarkup(createElement(CityGuideView, { g: r.guide }));
    expect(html).toContain('aria-label="En breve"');
    expect(html).toContain("<h3");
    expect(html).toContain("¿Qué ver primero?");
    expect(html).toContain('href="https://www.louvre.fr/en/hours-admission/admission"');
    expect(html).toContain('aria-label="Cómo lo sabemos"');
    expect(html).toContain("Equipo editorial de Travel Puzzle · 7 de noviembre de 2026");
    expect(html).not.toContain("](");
  });
});

describe("REQ-3336: CityGuideView en inglés", () => {
  it("REQ-3336: con la guía en inglés pinta «In short», «How we know», byline y fecha en inglés y su texto en inglés", async () => {
    const { guideIn } = await import("@/destinations/lib/guia");
    const r = parseGuide(sampleGuide());
    if (!r.ok) throw new Error(r.error);
    const html = renderToStaticMarkup(createElement(CityGuideView, { g: guideIn(r.guide, "en")! }));
    expect(html).toContain('aria-label="In short"');
    expect(html).toContain('aria-label="How we know"');
    expect(html).toContain("Travel Puzzle editorial team · November 7, 2026");
    expect(html).toContain("What should you see first?");
    expect(html).not.toContain("¿Qué ver primero?");
    expect(html).not.toContain("En breve");
  });
});
