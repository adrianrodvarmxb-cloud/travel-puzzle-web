import { describe, it, expect } from "vitest";
import { toBlocks, slug } from "./blocks";
import { TERMINOS } from "./terminos";
import { PRIVACIDAD_INTEGRAL, PRIVACIDAD_SIMPLIFICADO } from "./privacidad";
import { LEGAL_PATHS, legalLabels } from "./labels";

describe("toBlocks", () => {
  it("convierte títulos, subtítulos, incisos y párrafos", () => {
    const blocks = toBlocks("## Uso\nTexto uno.\n### 1. Tipo\n- a) Primero\n- b) Segundo\nTexto dos.");
    expect(blocks).toEqual([
      { type: "h2", text: "Uso" },
      { type: "p", text: "Texto uno." },
      { type: "h3", text: "1. Tipo" },
      { type: "list", items: ["a) Primero", "b) Segundo"] },
      { type: "p", text: "Texto dos." },
    ]);
  });

  it("ignora líneas vacías y espacios sobrantes", () => {
    expect(toBlocks("\n  Hola  \n\n")).toEqual([{ type: "p", text: "Hola" }]);
  });

  it("da un id estable a cada título para enlazarlo", () => {
    expect(slug("Política de cancelación")).toBe("politica-de-cancelacion");
    expect(slug("¿Con quién compartimos su información?")).toBe("con-quien-compartimos-su-informacion");
    expect(slug("Límites de responsabilidad de “Travel Puzzle”")).toBe("limites-de-responsabilidad-de-travel-puzzle");
  });
});

const TODOS = { TERMINOS, PRIVACIDAD_INTEGRAL, PRIVACIDAD_SIMPLIFICADO };

describe("contenido legal", () => {
  const PROHIBIDAS = [
    /free ?tour/i,
    /claulet/i,
    /canc[uú]n/i,
    /\$30/,
    /\bBONO\b/,
    /INAPAM/,
    /moratorio/i,
    /retener un 10%/i,
    /cup[oó]n de compensaci[oó]n/i,
    /tienda en l[ií]nea/i,
    /Firma del “El cliente”/,
    /travelpuzzle\.com(?!\.mx)/,
    /03\/07\/2023/,
    /\[fecha/,
    /Comentado/,
  ];

  for (const [nombre, texto] of Object.entries(TODOS)) {
    it(`${nombre} no trae cadenas prohibidas`, () => {
      for (const re of PROHIBIDAS) expect(texto, re.toString()).not.toMatch(re);
    });
    it(`${nombre} usa info@ como contacto`, () => {
      expect(texto).toContain("info@travelpuzzle.com.mx");
    });
  }

  it("T&C muestran RNT, registro Profeco, Durango y las reglas de los tours", () => {
    for (const s of ["04100050179", "6635-2023", "Durango", "propina", "24 horas", "cláusula novena", "48 (cuarenta y ocho)", "puntualmente", "reventa"]) {
      expect(TERMINOS).toContain(s);
    }
  });

  it("aviso integral incluye plataformas de reservación y cómo negarse a la publicidad", () => {
    expect(PRIVACIDAD_INTEGRAL).toContain("Plataformas de reservación");
    expect(PRIVACIDAD_INTEGRAL).toContain("No publicidad");
  });

  it("aviso simplificado enlaza al integral", () => {
    expect(PRIVACIDAD_SIMPLIFICADO).toContain("travelpuzzle.com.mx/privacidad");
  });

  it("los documentos tienen títulos y no dejan párrafos vacíos", () => {
    for (const texto of Object.values(TODOS).slice(0, 2)) {
      const blocks = toBlocks(texto);
      expect(blocks.some((b) => b.type === "h2")).toBe(true);
      expect(blocks.every((b) => (b.type === "list" ? b.items.length > 0 : b.text.length > 0))).toBe(true);
    }
  });
});

describe("enlaces legales", () => {
  it("rutas fijas", () => {
    expect(LEGAL_PATHS).toEqual({ terms: "/terminos", privacy: "/privacidad" });
  });
  it("etiquetas en español por defecto e inglés para el resto", () => {
    expect(legalLabels("es").terms).toBe("Términos y condiciones");
    expect(legalLabels("en").privacy).toBe("Privacy notice");
    expect(legalLabels("fr").spanishOnly).toMatch(/Spanish/);
    expect(legalLabels("es").spanishOnly).toBe("");
  });
});
