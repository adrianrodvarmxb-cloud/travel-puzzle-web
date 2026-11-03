import { describe, it, expect } from "vitest";
import { buildReviewAlertEmail, type ReviewAlertData } from "./review-alert-email";

const base: ReviewAlertData = {
  rate: 5,
  content: "Guía increíble <b>",
  displayName: "Ana G.",
  consent: true,
  tourTitle: "Visita gratuita a Split",
  refNumber: "6782-1-1",
  customerName: "Ana Gómez",
  customerEmail: "ana@example.com",
  customerPhone: "+5215555555555",
  publishUrl: "https://travelpuzzle.com.mx/resenas/moderar?id=r1&a=publish&exp=1&sig=x",
  hideUrl: "https://travelpuzzle.com.mx/resenas/moderar?id=r1&a=hide&exp=1&sig=y",
  adminUrl: "https://travelpuzzle.com.mx/admin/resenas?exp=1&sig=z",
  logoUrl: "https://travelpuzzle.com.mx/brand/logo-tp-oscuro.png",
};

describe("aviso interno de reseña", () => {
  it("trae estrellas, texto escapado y botones Publicar / Ocultar / panel", () => {
    const m = buildReviewAlertEmail(base);
    expect(m.subject).toBe("Nueva reseña ★★★★★ · Visita gratuita a Split");
    expect(m.html).toContain("Guía increíble &lt;b&gt;");
    expect(m.html).toContain(base.publishUrl.replace(/&/g, "&amp;"));
    expect(m.html).toContain(base.hideUrl.replace(/&/g, "&amp;"));
    expect(m.html).toContain("Ver todas las reseñas");
    expect(m.text).toContain(`Publicar: ${base.publishUrl}`);
    expect(m.html).not.toMatch(/freetour/i);
  });

  it("1 a 3 estrellas: pide seguimiento con WhatsApp del cliente", () => {
    const m = buildReviewAlertEmail({ ...base, rate: 2 });
    expect(m.subject).toBe("Dar seguimiento · reseña ★★ · Visita gratuita a Split");
    expect(m.html).toContain("https://wa.me/5215555555555");
    expect(m.text).toContain("Dar seguimiento");
  });

  it("sin permiso para publicar: no ofrece el botón Publicar", () => {
    const m = buildReviewAlertEmail({ ...base, consent: false });
    expect(m.html).not.toContain("a=publish");
    expect(m.html).toContain("no aceptó que se publique");
  });
});
