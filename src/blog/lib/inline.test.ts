import { describe, expect, it } from "vitest";
import { parseInline, inlineLinks, plainText } from "./inline";
import { readingMinutes } from "./reading-time";
import { tocFor, headingId } from "./toc";

describe("mini-formato del texto, lectura y tabla de contenidos", () => {
  it("REQ-255: [texto](/ruta) y **negrita** se vuelven nodos; el HTML queda como texto", () => {
    expect(parseInline("Ve a [Perú](/blog/peru) y **ya**. <b>x</b>")).toEqual([
      { t: "text", v: "Ve a " },
      { t: "link", v: "Perú", href: "/blog/peru" },
      { t: "text", v: " y " },
      { t: "bold", v: "ya" },
      { t: "text", v: ". <b>x</b>" },
    ]);
    expect(plainText("Ve a [Perú](/blog/peru) y **ya**")).toBe("Ve a Perú y ya");
  });

  it("REQ-255: solo enlaces internos (/…) o https; javascript: queda como texto", () => {
    expect(parseInline("[x](javascript:alert(1))")).toEqual([{ t: "text", v: "[x](javascript:alert(1))" }]);
    expect(inlineLinks("[a](/x) [b](https://y.org)")).toEqual([{ text: "a", href: "/x" }, { text: "b", href: "https://y.org" }]);
  });

  it("REQ-255: tiempo de lectura a 200 palabras por minuto, redondeo hacia arriba (mínimo 1)", () => {
    expect(readingMinutes(1)).toBe(1);
    expect(readingMinutes(200)).toBe(1);
    expect(readingMinutes(201)).toBe(2);
  });

  it("REQ-255: «En esta página» solo con 4 o más H2; ids estables sin acentos", () => {
    expect(tocFor(["¿Uno?", "Dos", "Tres"])).toEqual([]);
    expect(tocFor(["¿Qué visa piden?", "Dos", "Tres", "Cuatro"])[0]).toEqual({ id: "que-visa-piden", label: "¿Qué visa piden?" });
    expect(headingId("Árbol  ñandú!")).toBe("arbol-nandu");
  });
});
