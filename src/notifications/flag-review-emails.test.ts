import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { buildReviewRequestEmail } from "./lib/review-email";

describe("REQ-1631: correo post-tour pidiendo reseña, encendido en producción", () => {
  const wrangler = readFileSync("wrangler.jsonc", "utf8");
  it("REQ-1631: wrangler.jsonc enciende REVIEW_EMAILS_ENABLED y su requisito EMAILS_ENABLED sigue encendido", () => {
    expect(wrangler).toMatch(/"REVIEW_EMAILS_ENABLED": "true"/);
    expect(wrangler).toMatch(/"EMAILS_ENABLED": "true"/);
  });
  it("REQ-1631: el correo lleva a la página de reseña publicada (PR #37) y no menciona a FREETOUR (REQ-081)", () => {
    const { html, text } = buildReviewRequestEmail({
      lang: "es", refNumber: "6782-20261030162746-244", firstName: "Ana", tourTitle: "Free Tour Centro",
      reviewUrl: "https://travelpuzzle.com.mx/reserva/abc/resena", logoUrl: "https://travelpuzzle.com.mx/brand/logo-tp-oscuro.png", contact: { whatsapp: "525536490320" },
    });
    expect(html).toContain("/reserva/abc/resena?rate=5");
    expect(`${html}\n${text}`).not.toMatch(/freetour/i);
  });
});
