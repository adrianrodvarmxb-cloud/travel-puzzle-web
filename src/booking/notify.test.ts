import { describe, it, expect, vi } from "vitest";
import { sendBookingConfirmation, sendStatusEmail } from "./notify";

const record = {
  refNumber: "6782-1-244", tourExternalId: 6782, eventId: 1, adults: 2, children: 0, price: 0,
  email: "ana@example.com", firstName: "Ana", lastName: "P", phone: null,
  eventDate: "2026-10-31 08:00:00", eventUtcDate: "2026-10-31 06:00:00", language: "French",
  status: "active", manageToken: "tok", createdAt: new Date(), updatedAt: new Date(),
};
const tour = { title: "Free Tour Centro", provider: "Mpika", duration: "2:30", meetingPoint: { title: { es: "Zócalo" } } };

describe("sendBookingConfirmation", () => {
  it("con el interruptor apagado no envía", async () => {
    const send = vi.fn();
    expect(await sendBookingConfirmation(record, { enabled: false, lang: "es", siteUrl: "https://x", getTour: async () => tour, send })).toBe("disabled");
    expect(send).not.toHaveBeenCalled();
  });

  it("envía al correo del cliente con el enlace privado del sitio", async () => {
    const send = vi.fn(async (_email: { to: string; subject: string; html: string; text: string }) => "em_1");
    const out = await sendBookingConfirmation(record, { enabled: true, lang: "es", siteUrl: "https://travelpuzzle.com.mx/", getTour: async () => tour, send });
    expect(out).toBe("sent");
    const email = send.mock.calls[0][0];
    expect(email.to).toBe("ana@example.com");
    expect(email.subject).toContain("Free Tour Centro");
    expect(email.html).toContain("https://travelpuzzle.com.mx/reserva/tok");
    expect(email.html).toContain("Zócalo");
  });

  it("si falla el envío no lanza (la reserva ya está hecha)", async () => {
    const send = vi.fn(async () => { throw new Error("Resend 500"); });
    expect(await sendBookingConfirmation(record, { enabled: true, lang: "es", siteUrl: "https://x", getTour: async () => tour, send })).toBe("failed");
  });

  it("sin datos del tour usa el número de reserva como referencia", async () => {
    const send = vi.fn(async (_email: { to: string; subject: string; html: string; text: string }) => "em_1");
    await sendBookingConfirmation(record, { enabled: true, lang: "en", siteUrl: "https://x", getTour: async () => null, send });
    expect(send.mock.calls[0][0].subject).toContain("Free tour 6782");
  });
});

describe("sendStatusEmail", () => {
  it("rechazo: al cliente, con el motivo y enlace a la página del tour", async () => {
    const send = vi.fn(async (_email: { to: string; subject: string; html: string; text: string }) => "em_2");
    const out = await sendStatusEmail("rejected", record, { enabled: true, lang: "es", siteUrl: "https://travelpuzzle.com.mx", getTour: async () => ({ ...tour, pageId: "abc" }), send }, { reason: "Grupo completo" });
    expect(out).toBe("sent");
    const email = send.mock.calls[0][0];
    expect(email.to).toBe("ana@example.com");
    expect(email.subject).toContain("no pudo confirmarse");
    expect(email.html).toContain("Grupo completo");
    expect(email.html).toContain("https://travelpuzzle.com.mx/tours/abc");
  });
  it("apagado no envía; si falla no lanza", async () => {
    const send = vi.fn(async () => { throw new Error("x"); });
    expect(await sendStatusEmail("canceled", record, { enabled: false, lang: "es", siteUrl: "https://x", getTour: async () => tour, send })).toBe("disabled");
    expect(await sendStatusEmail("canceled", record, { enabled: true, lang: "es", siteUrl: "https://x", getTour: async () => tour, send })).toBe("failed");
  });
});
