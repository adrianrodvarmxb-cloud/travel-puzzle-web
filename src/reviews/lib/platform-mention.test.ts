import { describe, it, expect } from "vitest";
import { mentionsPlatform, withoutPlatformMentions } from "./platform-mention";

const r = (id: number, content: string, title: string | null = null) => ({ id, reviewerName: "Ana", title, content, rate: 5, addedAt: "2026-10-01" });

describe("REQ-171: no se muestran reseñas que nombran la plataforma (decisión del PO, 6 nov 2026)", () => {
  it("REQ-171: oculta «freetour», «freetours», «free tour .com» y «freetour.com» sin importar mayúsculas ni acentos", () => {
    for (const t of ["Lo reservé por Freetour", "los FREETOURS son geniales", "lo vi en free tour .com", "gracias a freetour.com!", "en FreeTóur todo bien", "free-tour.com", "reservé en FREE TOURS.COM"]) {
      expect(mentionsPlatform(t), t).toBe(true);
    }
  });
  it("REQ-171: «free tour» como categoría genérica NO se oculta", () => {
    for (const t of ["fue el mejor free tour de mi vida", "Hicimos varios free tours en Lima", "Free Tour muy recomendable", "un tour gratis increíble"]) {
      expect(mentionsPlatform(t), t).toBe(false);
    }
  });
  it("REQ-171: revisa título y contenido; las demás se quedan en su orden", () => {
    const list = [r(1, "Excelente guía"), r(2, "Muy bien", "Reservado en Freetour"), r(3, "el mejor free tour"), r(4, "vía freetour.com")];
    expect(withoutPlatformMentions(list).map((x) => x.id)).toEqual([1, 3]);
  });
});
