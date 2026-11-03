import { describe, it, expect } from "vitest";
import { HELP_PATH, faqTopics, helpCopy, isHelpVisible, searchFaq, normalize } from "./faq";

describe("centro de ayuda", () => {
  it("ruta fija y solo visible con el interruptor de reservas encendido", () => {
    expect(HELP_PATH).toBe("/ayuda");
    expect(isHelpVisible("true")).toBe(true);
    expect(isHelpVisible("false")).toBe(false);
    expect(isHelpVisible(undefined)).toBe(false);
  });

  it("9 preguntas en español y en inglés, en 4 temas", () => {
    for (const lang of ["es", "en"]) {
      const topics = faqTopics(lang);
      expect(topics).toHaveLength(4);
      expect(topics.flatMap((t) => t.items)).toHaveLength(9);
    }
    expect(faqTopics("fr")[0].title).toBe(faqTopics("en")[0].title);
  });

  it("cada pregunta tiene id único y texto", () => {
    const items = faqTopics("es").flatMap((t) => t.items);
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
    for (const i of items) {
      expect(i.q.length).toBeGreaterThan(5);
      expect(i.a.length).toBeGreaterThan(20);
    }
  });

  it("el buscador ignora acentos y mayúsculas, y busca en preguntas y respuestas", () => {
    const items = faqTopics("es").flatMap((t) => t.items);
    expect(normalize("Cancelación")).toBe("cancelacion");
    expect(searchFaq(items, "cancelacion").map((i) => i.id)).toContain("cancelar");
    expect(searchFaq(items, "PROPINA").map((i) => i.id)).toContain("gratis");
    expect(searchFaq(items, "  ")).toHaveLength(items.length);
    expect(searchFaq(items, "zzzz")).toHaveLength(0);
  });

  it("nunca menciona al proveedor y usa el contacto y horario de los T&C", () => {
    const all = ["es", "en"].flatMap((l) => faqTopics(l).flatMap((t) => t.items.map((i) => `${i.q} ${i.a}`))).join(" ");
    expect(all).not.toMatch(/free ?tour\.com|freetour/i);
    expect(all).toContain("info@travelpuzzle.com.mx");
    expect(all).toContain("9:00 a 19:00");
    expect(all).toContain("24 h");
  });

  it("textos de la página en ambos idiomas", () => {
    expect(helpCopy("es").title).toBe("Centro de ayuda");
    expect(helpCopy("en").title).toBe("Help center");
  });
});
