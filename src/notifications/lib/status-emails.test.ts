import { describe, it, expect } from "vitest";
import { buildStatusEmail, type StatusEmailData } from "./status-emails";

const base: StatusEmailData = {
  kind: "rejected",
  lang: "es",
  refNumber: "6782-20261030162746-244",
  firstName: "Ana",
  tourTitle: "Free Tour Centro Histórico",
  eventDate: "2026-11-02 10:00:00",
  duration: "2:00",
  tourLanguage: "Spanish",
  adults: 2,
  children: 0,
  manageUrl: "https://travelpuzzle.com.mx/reserva/abc",
  tourUrl: "https://travelpuzzle.com.mx/tours/xyz",
  logoUrl: "https://travelpuzzle.com.mx/brand/logo-tp-oscuro.png",
  contact: { whatsapp: "525536490320", socials: [{ name: "Instagram", url: "https://www.instagram.com/travelpuzzle/" }] },
};

describe("correos de cambio de estado", () => {
  it("rechazo: avisa, muestra el motivo y ofrece otra fecha (requisito de Freetour)", () => {
    const { subject, html, text } = buildStatusEmail({ ...base, reason: "Grupo completo <b>" });
    expect(subject).toBe("Tu reserva no pudo confirmarse – Free Tour Centro Histórico");
    expect(html).toContain("6782-20261030162746-244");
    expect(html).toContain("No se te cobró nada");
    expect(html).toContain("Grupo completo &lt;b&gt;");
    expect(html).toContain("https://travelpuzzle.com.mx/tours/xyz");
    expect(html).not.toContain("/reserva/abc");
    expect(text).toContain("Motivo indicado por el organizador: Grupo completo <b>");
  });
  it("rechazo sin motivo no deja el bloque vacío", () => {
    expect(buildStatusEmail(base).html).not.toContain("Motivo indicado");
  });
  it("cancelación: confirma y no muestra el enlace de gestión", () => {
    const { subject, html } = buildStatusEmail({ ...base, kind: "canceled" });
    expect(subject).toBe("Tu reserva quedó cancelada – Free Tour Centro Histórico");
    expect(html).toContain("tu lugar quedó liberado");
    expect(html).not.toContain("/reserva/abc");
    expect(html).not.toContain("Mi reserva</a>");
  });
  it("modificación: datos nuevos, enlace de gestión y calendario", () => {
    const { subject, html } = buildStatusEmail({ ...base, kind: "modified", eventDate: "2026-11-05 17:00:00", adults: 3 });
    expect(subject).toBe("Tu reserva se actualizó – Free Tour Centro Histórico");
    expect(html).toContain("5 de noviembre de 2026, 17:00");
    expect(html).toContain("3 adultos");
    expect(html).toContain("/reserva/abc");
    expect(html).toContain("calendar.google.com");
  });
  it("en inglés", () => {
    expect(buildStatusEmail({ ...base, lang: "en", kind: "canceled" }).subject).toBe("Your booking has been canceled – Free Tour Centro Histórico");
  });
  it("WhatsApp con el número de reserva y alternativas solo con foto segura", () => {
    const { html } = buildStatusEmail({
      ...base,
      cityName: "CDMX",
      moreTours: [
        { title: "Coyoacán", url: "https://travelpuzzle.com.mx/tours/a", imageUrl: "https://x/a.jpg", isFree: true },
        { title: "Inseguro", url: "https://travelpuzzle.com.mx/tours/b", imageUrl: "http://x/b.jpg" },
      ],
    });
    expect(html).toContain("https://wa.me/525536490320?text=");
    expect(html).toContain("Otros planes en CDMX");
    expect(html).toContain("Coyoacán");
    expect(html).not.toContain("Inseguro");
  });
});
