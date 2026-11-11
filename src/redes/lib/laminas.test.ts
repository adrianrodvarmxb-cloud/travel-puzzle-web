import { describe, expect, it } from "vitest";
import { laminaSvg, wrapText, LAMINA_W, LAMINA_H, laminaFile, laminaUrl } from "./laminas";

describe("láminas de Instagram (diseño de marca)", () => {
  // REQ-1516: foto a sangre completa; el texto va sobre un velo de marca, sin banda sólida.
  it("REQ-1516: portada con la foto a sangre completa, velo sobre todo el marco y sin banda sólida; todo el texto dentro del marco", () => {
    expect([LAMINA_W, LAMINA_H]).toEqual([1080, 1350]);
    const svg = laminaSvg({ tipo: "portada", titulo: "¿Qué cambió en 2026 para entrar a Europa?", pilar: "Europa, primer viaje", imagen: "/x", credito: "Foto: A & B / Pexels" });
    expect(svg).toContain('width="1080" height="1350"');
    expect(svg).toContain('<rect x="0" y="0" width="1080" height="1350" fill="url(#v)"/>');
    expect(svg).not.toContain('fill="#0A1330"/>');
    expect(svg).toContain("Foto: A &amp; B / Pexels");
    expect(svg).toContain("EUROPA, PRIMER VIAJE");
    expect(svg).toContain("travelpuzzle.com.mx");
    expect(svg).not.toMatch(/free ?tour/i);
    for (const m of svg.matchAll(/<text[^>]* y="(\d+)"/g)) expect(Number(m[1])).toBeLessThanOrEqual(1350);
  });

  // REQ-1516
  it("REQ-1516: lámina de dato sobre la foto con velo: número, pregunta, dato y «Fuente: …»", () => {
    const svg = laminaSvg({ tipo: "dato", texto: "Turismo sin visa: hasta 90 días en cualquier periodo de 180 días.", fuente: "Embajada de México en Alemania", pregunta: "¿Necesito visa?", n: 2, de: 4, imagen: "/x", credito: "Foto: X / Pexels" });
    expect(svg).toContain('<rect x="0" y="0" width="1080" height="1350" fill="url(#v)"/>');
    expect(svg).toContain("DATO 2 DE 4");
    expect(svg).toContain("¿Necesito visa?");
    expect(svg).toContain("Fuente: Embajada de México en Alemania");
    expect(svg).toContain("#EAF54F");
  });

  it("REQ-1073: el texto se parte en líneas sin pasar del ancho; archivos y URL públicas por entrada", () => {
    expect(wrapText("uno dos tres cuatro cinco seis", 10)).toEqual(["uno dos", "tres", "cuatro", "cinco seis"]);
    expect(laminaFile("mi-entrada", 1)).toBe("public/blog/img/mi-entrada/ig-1.jpg");
    expect(laminaUrl("mi-entrada", 3, "https://t.mx/")).toBe("https://t.mx/blog/img/mi-entrada/ig-3.jpg");
  });
});
