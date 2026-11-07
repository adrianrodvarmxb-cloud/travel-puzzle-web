import { describe, it, expect, vi } from "vitest";
import { sendBookingConfirmation, sendStatusEmail, sendReviewRequest } from "./notify";

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

describe("invitación de calendario", () => {
  const withUtc = { ...record, eventUtcDate: "2026-10-31 14:00:00" };
  it("la confirmación lleva la invitación; los recordatorios no", async () => {
    const send = vi.fn(async (_e: { attachments?: { filename: string; content: string }[] }) => "id");
    const deps = { enabled: true, lang: "es" as const, siteUrl: "https://x", getTour: async () => tour, send, calendar: { organizerEmail: "reservas@travelpuzzle.com.mx" } };
    await sendBookingConfirmation(withUtc, deps);
    const a = send.mock.calls[0][0].attachments!;
    expect(a[0].filename).toBe("invitacion.ics");
    expect(atob(a[0].content)).toContain("METHOD:REQUEST");
    await sendBookingConfirmation(withUtc, deps, { variant: "reminder48" });
    expect(send.mock.calls[1][0].attachments).toBeUndefined();
  });
  it("cancelación borra el evento del calendario", async () => {
    const send = vi.fn(async (_e: { attachments?: { filename: string; content: string }[] }) => "id");
    await sendStatusEmail("canceled", withUtc, { enabled: true, lang: "es", siteUrl: "https://x", getTour: async () => tour, send, calendar: { organizerEmail: "reservas@travelpuzzle.com.mx" } });
    expect(atob(send.mock.calls[0][0].attachments![0].content)).toContain("METHOD:CANCEL");
  });
});

describe("REQ-081 correo post-tour sin FREETOUR", () => {
  const more = [
    { title: "Free tour Coyoacán", url: "https://x/tours/a", imageUrl: "https://x/a.jpg", source: "freetour" as const },
    { title: "Traslado al aeropuerto", url: "https://x/traslados", imageUrl: "https://x/b.jpg", source: "affiliate" as const },
  ];
  it("REQ-081: con FREETOUR_POSTTOUR_PROMO_ENABLED apagada, el correo post-tour no ofrece tours de FREETOUR", async () => {
    const send = vi.fn(async (_e: { html: string; text: string }) => "id");
    await sendReviewRequest(record, { enabled: true, lang: "es", siteUrl: "https://x", getTour: async () => tour, getMoreTours: async () => more, send });
    const { html, text } = send.mock.calls[0][0];
    expect(html).not.toContain("Free tour Coyoacán");
    expect(text).not.toContain("Free tour Coyoacán");
    expect(text).toContain("Traslado al aeropuerto");
  });
  it("REQ-081: solo con la bandera encendida (autorización escrita) se ofrecen", async () => {
    const send = vi.fn(async (_e: { html: string; text: string }) => "id");
    await sendReviewRequest(record, { enabled: true, lang: "es", siteUrl: "https://x", getTour: async () => tour, getMoreTours: async () => more, send, freetourPostTourPromo: true });
    expect(send.mock.calls[0][0].text).toContain("Free tour Coyoacán");
  });
  // Gate del PO (5 nov 2026): «Más planes» de la confirmación y de los cambios de estado tampoco ofrecen FREETOUR.
  it("REQ-081: la confirmación y los recordatorios no ofrecen tours de FREETOUR en «Más planes»", async () => {
    for (const variant of [undefined, "reminder48", "dayOf"] as const) {
      const send = vi.fn(async (_e: { html: string; text: string }) => "id");
      await sendBookingConfirmation(record, { enabled: true, lang: "es", siteUrl: "https://x", getTour: async () => tour, getMoreTours: async () => more, send }, { variant });
      const { html, text } = send.mock.calls[0][0];
      expect(html).not.toContain("Free tour Coyoacán");
      expect(text).not.toContain("Free tour Coyoacán");
      expect(text).toContain("Traslado al aeropuerto");
    }
  });
  it("REQ-081: los correos de rechazo, cancelación y cambio no ofrecen tours de FREETOUR", async () => {
    for (const kind of ["rejected", "canceled", "modified"] as const) {
      const send = vi.fn(async (_e: { html: string; text: string }) => "id");
      await sendStatusEmail(kind, record, { enabled: true, lang: "es", siteUrl: "https://x", getTour: async () => tour, getMoreTours: async () => more, send });
      const { html, text } = send.mock.calls[0][0];
      expect(html, kind).not.toContain("Free tour Coyoacán");
      expect(text, kind).not.toContain("Free tour Coyoacán");
    }
  });
  it("REQ-081: con la bandera encendida la confirmación vuelve a mostrarlos", async () => {
    const send = vi.fn(async (_e: { html: string; text: string }) => "id");
    await sendBookingConfirmation(record, { enabled: true, lang: "es", siteUrl: "https://x", getTour: async () => tour, getMoreTours: async () => more, send, freetourPostTourPromo: true });
    expect(send.mock.calls[0][0].text).toContain("Free tour Coyoacán");
  });
});

describe("sendBookingConfirmation con «Arma tu viaje»", () => {
  const rec = { ...record, manageToken: "tok_abcdefgh12345678" };
  it("REQ-182: con ARMA_TU_VIAJE_ENABLED el correo lleva el enlace al carrito de esa reserva", async () => {
    const send = vi.fn(async (_e: { html: string; text: string }) => "em_1");
    await sendBookingConfirmation(rec, { enabled: true, lang: "es", siteUrl: "https://travelpuzzle.com.mx", getTour: async () => tour, send, armaTuViaje: true });
    expect(send.mock.calls[0][0].html).toContain("https://travelpuzzle.com.mx/arma-tu-viaje?reserva=tok_abcdefgh12345678");
  });

  it("REQ-182: con la bandera apagada (u omitida) no hay enlace", async () => {
    const send = vi.fn(async (_e: { html: string; text: string }) => "em_1");
    await sendBookingConfirmation(rec, { enabled: true, lang: "es", siteUrl: "https://travelpuzzle.com.mx", getTour: async () => tour, send });
    await sendBookingConfirmation(rec, { enabled: true, lang: "es", siteUrl: "https://travelpuzzle.com.mx", getTour: async () => tour, send, armaTuViaje: false });
    for (const [e] of send.mock.calls) expect(e.html).not.toContain("arma-tu-viaje");
  });
});


// REQ-811 / REQ-812: una reserva con precio > 0 (tour de pago, o free tour que pasó a tarifa fija) se trata como de pago
// en los correos, aunque el resumen del tour diga isFree.
describe("REQ-811 REQ-812 correos de una reserva de pago", () => {
  const paidRecord = { ...record, price: 40 };
  const mail = () => vi.fn(async (_email: { to: string; subject: string; html: string; text: string }) => "em");
  it("REQ-812: confirmación sin propina y con la política de 24 h, aunque el tour sea free", async () => {
    const send = mail();
    await sendBookingConfirmation(paidRecord, { enabled: true, lang: "es", siteUrl: "https://x", getTour: async () => ({ ...tour, isFree: true }), send });
    const { html, text } = send.mock.calls[0][0];
    expect(`${html}${text}`).not.toMatch(/propina/i);
    expect(text).toContain("hasta 24 h antes del tour");
  });
  it("REQ-811: rechazo → reembolso automático", async () => {
    const send = mail();
    await sendStatusEmail("rejected", paidRecord, { enabled: true, lang: "es", siteUrl: "https://x", getTour: async () => tour, send });
    expect(send.mock.calls[0][0].text).toContain("el reembolso de lo que pagaste es automático");
  });
  it("REQ-811: cancelar 48 h antes → reembolso; 10 h antes → sin reembolso", async () => {
    const at = (iso: string) => () => new Date(iso);
    const s1 = mail();
    await sendStatusEmail("canceled", paidRecord, { enabled: true, lang: "es", siteUrl: "https://x", getTour: async () => tour, send: s1, now: at("2026-10-29T06:00:00Z") });
    expect(s1.mock.calls[0][0].text).toContain("Cancelaste con 24 h o más");
    const s2 = mail();
    await sendStatusEmail("canceled", paidRecord, { enabled: true, lang: "es", siteUrl: "https://x", getTour: async () => tour, send: s2, now: at("2026-10-30T20:00:00Z") });
    expect(s2.mock.calls[0][0].text).toContain("Cancelaste con menos de 24 h");
  });
  it("REQ-811: free tour (precio 0) sin cambios", async () => {
    const send = mail();
    await sendStatusEmail("canceled", record, { enabled: true, lang: "es", siteUrl: "https://x", getTour: async () => tour, send });
    expect(send.mock.calls[0][0].text).not.toMatch(/reembolso/);
  });
});

// REQ-936 (A3, D3): si FREETOUR rechaza una reserva de pago que todavía NO se pagó, el correo no promete reembolso.
describe("REQ-936 rechazo de una reserva de pago sin pagar", () => {
  const mail = () => vi.fn(async (_email: { to: string; subject: string; html: string; text: string }) => "em");
  it("REQ-936: paymentStatus pending → «No se te cobró nada», sin reembolso", async () => {
    const send = mail();
    await sendStatusEmail("rejected", { ...record, price: 40, paymentStatus: "pending" } as typeof record, { enabled: true, lang: "es", siteUrl: "https://x", getTour: async () => tour, send });
    const { text } = send.mock.calls[0][0];
    expect(text).toContain("No se te cobró nada");
    expect(text).not.toMatch(/reembolso/i);
  });
  it("REQ-936: pagada → reembolso automático (REQ-811 se conserva)", async () => {
    const send = mail();
    await sendStatusEmail("rejected", { ...record, price: 40, paymentStatus: "paid" } as typeof record, { enabled: true, lang: "es", siteUrl: "https://x", getTour: async () => tour, send });
    expect(send.mock.calls[0][0].text).toContain("el reembolso de lo que pagaste es automático");
  });
});

// REQ-938 (D7): pago a la llegada: precio cobrado hoy 0 pero el tour es de pago (fullPrice): sin propina y con la regla de 24 h.
describe("REQ-938 confirmación con pago a la llegada", () => {
  it("REQ-938: sin propina, con la regla de 24 h y sin prometer reembolso en un rechazo", async () => {
    const arrival = { ...record, price: 0, fullPrice: 40, paymentStatus: "arrival" } as typeof record;
    const send = vi.fn(async (_email: { to: string; subject: string; html: string; text: string }) => "em");
    await sendBookingConfirmation(arrival, { enabled: true, lang: "es", siteUrl: "https://x", getTour: async () => ({ ...tour, isFree: true }), send });
    const { html, text } = send.mock.calls[0][0];
    expect(`${html}${text}`).not.toMatch(/propina/i);
    expect(text).toContain("hasta 24 h antes del tour");
    const s2 = vi.fn(async (_email: { to: string; subject: string; html: string; text: string }) => "em");
    await sendStatusEmail("rejected", arrival, { enabled: true, lang: "es", siteUrl: "https://x", getTour: async () => tour, send: s2 });
    expect(s2.mock.calls[0][0].text).toContain("No se te cobró nada");
  });
});
