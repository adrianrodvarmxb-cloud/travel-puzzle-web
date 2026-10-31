import { describe, it, expect } from "vitest";
import { buildReviewRequestEmail } from "./review-email";

const base = {
  lang: "es" as const,
  refNumber: "6782-20261030162746-244",
  firstName: "Ana",
  tourTitle: "Free Tour Centro",
  reviewUrl: "https://travelpuzzle.com.mx/reserva/abc/resena",
  logoUrl: "https://travelpuzzle.com.mx/brand/logo-tp-oscuro.png",
  contact: { whatsapp: "525536490320" },
};

describe("correo post-tour", () => {
  it("cinco estrellas, cada una con su calificación en un clic", () => {
    const { subject, html, text } = buildReviewRequestEmail(base);
    expect(subject).toBe("¿Qué tal estuvo tu tour? – Free Tour Centro");
    for (const n of [1, 2, 3, 4, 5]) expect(html).toContain(`/reserva/abc/resena?rate=${n}`);
    expect(text).toContain("Excelente: https://travelpuzzle.com.mx/reserva/abc/resena?rate=5");
  });
  it("siguiente plan solo con foto segura y WhatsApp para quejas", () => {
    const { html } = buildReviewRequestEmail({ ...base, cityName: "CDMX", moreTours: [{ title: "Coyoacán", url: "https://x/a", imageUrl: "https://x/a.jpg" }] });
    expect(html).toContain("Sigue explorando CDMX");
    expect(html).toContain("https://wa.me/525536490320?text=");
  });
});
