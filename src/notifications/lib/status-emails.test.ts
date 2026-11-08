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

describe("REQ-079 cancelación y rechazo", () => {
  it("REQ-079: existen el correo de cancelación y el de rechazo, con número de reserva y tour", () => {
    for (const kind of ["canceled", "rejected"] as const) {
      const { subject, html, text } = buildStatusEmail({ ...base, kind });
      expect(subject).toContain(base.tourTitle);
      expect(html).toContain(base.refNumber);
      expect(text).toContain(base.refNumber);
    }
    expect(buildStatusEmail({ ...base, kind: "canceled" }).subject).toMatch(/cancelada/);
    expect(buildStatusEmail({ ...base, kind: "rejected" }).subject).toMatch(/no pudo confirmarse/);
  });
});

// REQ-811 (D3, A3): un tour de pago rechazado o cancelado dice qué pasa con lo pagado. Nunca «No se te cobró nada».
describe("REQ-811 rechazo y cancelación de un tour de pago", () => {
  it("REQ-811: rechazo de pago → reembolso automático, sin «No se te cobró nada»", () => {
    const { html, text } = buildStatusEmail({ ...base, paid: true });
    expect(html).not.toContain("No se te cobró nada");
    expect(text).toContain("el reembolso de lo que pagaste es automático");
  });
  it("REQ-811: cancelación con 24 h o más → reembolso automático", () => {
    const { text } = buildStatusEmail({ ...base, kind: "canceled", paid: true, refund: "full" });
    expect(text).toContain("Cancelaste con 24 h o más de anticipación: el reembolso de lo que pagaste es automático.");
  });
  it("REQ-811: cancelación con menos de 24 h → sin reembolso", () => {
    const { text } = buildStatusEmail({ ...base, kind: "canceled", paid: true, refund: "none" });
    expect(text).toContain("Cancelaste con menos de 24 h de anticipación: según la política del tour, no hay reembolso.");
  });
  it("REQ-811: en inglés", () => {
    expect(buildStatusEmail({ ...base, lang: "en", paid: true }).text).toContain("the refund of what you paid is automatic");
  });
  it("REQ-811: un free tour sigue igual", () => {
    expect(buildStatusEmail({ ...base }).html).toContain("No se te cobró nada");
    expect(buildStatusEmail({ ...base, kind: "canceled" }).text).not.toMatch(/reembolso/);
  });
});

// REQ-932: la sesión de pago venció sin pago y la reserva se canceló en FREETOUR: se avisa al cliente.
describe("REQ-932 correo de pago vencido", () => {
  it("REQ-932: dice que se canceló por falta de pago, que no se cobró nada y ofrece reservar otra vez", () => {
    const { subject, html, text } = buildStatusEmail({ ...base, kind: "expired" });
    expect(subject).toBe("Tu reserva se canceló: no se completó el pago – Free Tour Centro Histórico");
    expect(html).toContain("No se te cobró nada");
    expect(html).toContain("6782-20261030162746-244");
    expect(html).toContain("https://travelpuzzle.com.mx/tours/xyz");
    expect(html).not.toContain("/reserva/abc");
    expect(text).toContain("venció");
  });
  it("REQ-932: en inglés", () => {
    const { subject, text } = buildStatusEmail({ ...base, kind: "expired", lang: "en" });
    expect(subject).toBe("Your booking was canceled: the payment wasn't completed – Free Tour Centro Histórico");
    expect(text).toContain("You haven't been charged");
  });
  it("REQ-932: nunca promete reembolso aunque la reserva tuviera precio", () => {
    const { text } = buildStatusEmail({ ...base, kind: "expired", paid: true, refund: "full" });
    expect(text).not.toMatch(/reembolso/i);
  });
});
