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
  it("REQ-041: T&C remiten a la política de cancelación de cada ficha y al operador local", () => {
    expect(TERMINOS).toContain("Política de cancelación de cada servicio");
    expect(TERMINOS).toContain("acepta expresamente la política de cancelación de esa ficha");
    expect(TERMINOS).toContain("operador local");
    expect(TERMINOS).toContain("Ley Federal de Protección al Consumidor");
  });
});

describe("REQ-1597: el aviso de privacidad cubre las cuentas de cliente", () => {
  it("REQ-1597: finalidad de la cuenta y datos que llegan de Google", () => {
    expect(PRIVACIDAD_INTEGRAL).toContain("Crear y administrar su cuenta (opcional) para consultar sus reservas");
    expect(PRIVACIDAD_INTEGRAL).toContain("nombre, correo electrónico y foto de perfil");
    expect(PRIVACIDAD_INTEGRAL).toMatch(/sesión de su cuenta/i);
  });
});
describe("REQ-1597: aviso simplificado", () => {
  it("REQ-1597: también lleva la finalidad de la cuenta", () => {
    expect(PRIVACIDAD_SIMPLIFICADO).toContain("Crear y administrar su cuenta (opcional) para consultar sus reservas");
  });
});

describe("REQ-1635: términos v2 (Mila, moneda, vuelos, prestador)", () => {
  it("REQ-1635: explica que la asesoría es inteligencia artificial y cuándo vale lo que dice", () => {
    expect(TERMINOS).toContain("## Asesoría con inteligencia artificial");
    expect(TERMINOS).toContain("Mila");
    expect(TERMINOS).toMatch(/hablar con una persona del equipo/);
    expect(TERMINOS).toMatch(/número de confirmación/);
  });
  it("REQ-1635: aclara la moneda de cada tour y que la conversión es aproximada", () => {
    expect(TERMINOS).toMatch(/moneda del prestador/);
    expect(TERMINOS).toMatch(/aproximad/);
    expect(TERMINOS).not.toMatch(/recibimos en Moneda Nacional/);
  });
  it("REQ-1635: deslinde de aerolíneas sin quitar derechos del pasajero", () => {
    expect(TERMINOS).toContain("## Vuelos incluidos en un servicio");
    expect(TERMINOS).toContain("Ley de Aviación Civil");
  });
  it("REQ-1635: identifica al prestador y quita restos del texto de 2024", () => {
    expect(TERMINOS).toMatch(/a solicitud de EL CLIENTE/);
    expect(TERMINOS).not.toMatch(/pagar los beneficios/);
    expect(TERMINOS).not.toMatch(/American Express/);
  });
});

describe("REQ-1636: aviso integral v2", () => {
  it("REQ-1636: informa el uso de inteligencia artificial y WhatsApp", () => {
    expect(PRIVACIDAD_INTEGRAL).toContain("## Asesoría con inteligencia artificial y WhatsApp");
    expect(PRIVACIDAD_INTEGRAL).toMatch(/Meta/);
  });
  it("REQ-1636: nombra regiones y países de las transferencias", () => {
    for (const s of ["India", "Reino Unido", "Suiza", "Perú", "Colombia", "Singapur"]) expect(PRIVACIDAD_INTEGRAL).toContain(s);
    expect(PRIVACIDAD_INTEGRAL).toMatch(/no requieren su consentimiento/);
  });
  it("REQ-1636: lista a los proveedores que tratan datos por cuenta de Travel Puzzle", () => {
    expect(PRIVACIDAD_INTEGRAL).toContain("## Proveedores que tratan datos por cuenta de Travel Puzzle");
    for (const s of ["Stripe", "Cloudflare", "Resend", "Google"]) expect(PRIVACIDAD_INTEGRAL).toContain(s);
    expect(PRIVACIDAD_INTEGRAL).toMatch(/nunca guardamos el número completo de su tarjeta/);
  });
});

describe("REQ-1637: aviso simplificado v2", () => {
  it("REQ-1637: menciona la inteligencia artificial y el envío de datos al país del destino", () => {
    expect(PRIVACIDAD_SIMPLIFICADO).toMatch(/inteligencia artificial/);
    expect(PRIVACIDAD_SIMPLIFICADO).toMatch(/fuera de México/);
  });
});
