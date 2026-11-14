import { describe, it, expect } from "vitest";
import { plainText, safeDescriptionHtml } from "./provider-html";

// Caso real (Tangol, tour 44, 13 nov 2026): el resumen llega como HTML y la ficha lo pintaba como texto.
const real = '<div style="text-align: justify; "><p data-start="252" data-end="541"><strong data-start="252">Viva la aventura</strong><br data-start="369"> Caminará sobre el hielo&nbsp;milenario &amp; más.</p></div>';

describe("REQ-10544: el resumen del proveedor sale como texto plano", () => {
  it("REQ-10544: quita etiquetas y atributos, decodifica entidades y junta espacios", () => {
    expect(plainText(real)).toBe("Viva la aventura Caminará sobre el hielo milenario & más.");
  });
  it("REQ-10544: un texto sin HTML no cambia; vacío o nulo da null", () => {
    expect(plainText("Paseo por la ciudad.")).toBe("Paseo por la ciudad.");
    expect(plainText("  <p> </p> ")).toBeNull();
    expect(plainText(null)).toBeNull();
  });
  it("REQ-10544: el contenido de script y style no se cuela como texto", () => {
    expect(plainText("<style>.a{color:red}</style>Hola<script>alert(1)</script>")).toBe("Hola");
  });
});

describe("REQ-10545: la descripción del proveedor se pinta con HTML seguro y sin estilos propios", () => {
  it("REQ-10545: conserva párrafos, negritas, listas y saltos; quita style, data-* y clases", () => {
    const out = safeDescriptionHtml(real)!;
    expect(out).toBe("<p><strong>Viva la aventura</strong><br> Caminará sobre el hielo&nbsp;milenario &amp; más.</p>");
    expect(safeDescriptionHtml('<ul class="x"><li style="color:red">Uno</li></ul>')).toBe("<ul><li>Uno</li></ul>");
  });
  it("REQ-10545: quita etiquetas peligrosas con su contenido y no deja manejadores ni enlaces", () => {
    const out = safeDescriptionHtml('<p onclick="x()">Hola</p><script>alert(1)</script><iframe src="https://a"></iframe><a href="https://tangol.com">ver</a><img src=x onerror=alert(1)>')!;
    expect(out).toBe("<p>Hola</p>ver");
    expect(out).not.toMatch(/script|onclick|onerror|iframe|href|img/i);
  });
  it("REQ-10545: texto sin HTML conserva sus saltos de línea como <br>", () => {
    expect(safeDescriptionHtml("Línea 1\nLínea 2")).toBe("Línea 1<br>Línea 2");
  });
  it("REQ-10545: un < suelto que no es etiqueta se escapa", () => {
    expect(safeDescriptionHtml("Edad < 12 años")).toBe("Edad &lt; 12 años");
  });
});

describe("REQ-10544/REQ-10545: la ficha, la tarjeta y el meta usan el filtro (INC-019)", () => {
  it("REQ-10544: resumen en la ficha, la tarjeta y el meta pasa por plainText; REQ-10545: la descripción por safeDescriptionHtml", async () => {
    const { readFileSync } = await import("node:fs");
    const src = (f: string) => readFileSync(f, "utf8");
    expect(src("src/components/tours/one/TourHeroSection.tsx")).toContain("plainText(tour.brief)");
    expect(src("src/components/tours/TourCard.tsx")).toContain("plainText(tour.brief)");
    expect(src("src/app/tours/[id]/page.tsx")).toContain("brief: plainText(tour.brief)");
    const desc = src("src/components/tours/one/TourDescription.tsx");
    expect(desc).toContain("safeDescriptionHtml(description)");
    expect(desc).not.toMatch(/__html:\s*description\b/);
  });
});
