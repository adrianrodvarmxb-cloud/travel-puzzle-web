import { describe, it, expect, vi } from "vitest";
import { placeBooking, recordBooking, BookingRejected } from "./service";
import { GatewayError } from "./gateway-client";

const dto = { eventId: 631716694, adults: 2, children: 0, price: 0, customer: { email: "ana@example.com", firstName: "Ana", lastName: "Pérez", phone: "55 1234 5678" } };
const event = { id: 631716694, isAvailable: true, minAdultsPerBooking: 1, availableAdultPlaces: 10, availableChildrenPlaces: 5, isPhoneRequired: false, fullPricePerGroup: {}, payableNowPricePerGroup: {}, isPartiallyPaid: false };
const getEvent = vi.fn(async () => event);
const booking = { refNumber: "TP123", eventId: 631716694, status: "confirmed", canBeCanceled: 1, canBeEdited: 1, createdAt: "2026-10-30" };

describe("placeBooking", () => {
  it("con el interruptor apagado no llama a la pasarela", async () => {
    const gateway = { createBooking: vi.fn() };
    await expect(placeBooking(dto, { gateway, getEvent, enabled: false })).rejects.toMatchObject({ code: "bookings_disabled" });
    expect(gateway.createBooking).not.toHaveBeenCalled();
  });

  it("tours de pago todavía no (el precio lo da Freetour, no el navegador)", async () => {
    const gateway = { createBooking: vi.fn() };
    const paid = vi.fn(async () => ({ ...event, fullPricePerGroup: { "2": 50 } }));
    await expect(placeBooking({ ...dto, price: 0 }, { gateway, getEvent: paid, enabled: true })).rejects.toMatchObject({ code: "paid_not_available" });
    expect(gateway.createBooking).not.toHaveBeenCalled();
  });

  it("REQ-802: reserva y devuelve la reserva; sin isPhoneRequired el teléfono NO se manda a FREETOUR (G2)", async () => {
    const gateway = { createBooking: vi.fn(async () => booking) };
    const out = await placeBooking(dto, { gateway, getEvent, enabled: true });
    expect(gateway.createBooking).toHaveBeenCalledWith({ ...dto, customer: { email: "ana@example.com", firstName: "Ana", lastName: "Pérez" } });
    expect(out).toEqual({ booking, price: 0 });
  });

  it("REQ-802: con isPhoneRequired el teléfono va normalizado", async () => {
    const gateway = { createBooking: vi.fn(async () => booking) };
    const required = vi.fn(async () => ({ ...event, isPhoneRequired: true }));
    await placeBooking(dto, { gateway, getEvent: required, enabled: true });
    expect(gateway.createBooking).toHaveBeenCalledWith({ ...dto, customer: { ...dto.customer, phone: "+525512345678" } });
  });

  it("REQ-802: a FREETOUR solo van email, nombre y apellido (y teléfono si lo pide); nada más del cliente", async () => {
    const gateway = { createBooking: vi.fn(async () => booking) };
    const extra = { ...dto, customer: { ...dto.customer, marketingConsent: true, birthDate: "1990-01-01" } } as unknown as typeof dto;
    await placeBooking(extra, { gateway, getEvent, enabled: true });
    const sent = (gateway.createBooking.mock.calls[0] as unknown as [{ customer: Record<string, unknown> }])[0];
    expect(Object.keys(sent.customer).sort()).toEqual(["email", "firstName", "lastName"]);
    expect(Object.keys(sent).sort()).toEqual(["adults", "children", "customer", "eventId", "price"]);
  });

  it("teléfono inválido: error claro sin llamar a la pasarela", async () => {
    const gateway = { createBooking: vi.fn() };
    const err = await placeBooking({ ...dto, customer: { ...dto.customer, phone: "123" } }, { gateway, getEvent, enabled: true }).catch((e) => e);
    expect(err).toBeInstanceOf(BookingRejected);
    expect(err.code).toBe("invalid_phone");
  });

  it("si Freetour rechaza, se traduce a un error para el cliente sin detalles internos", async () => {
    const gateway = { createBooking: vi.fn(async () => { throw new GatewayError("Return value of App\\Models\\Customer::getEmail()", 500, null); }) };
    const err = await placeBooking(dto, { gateway, getEvent, enabled: true }).catch((e) => e);
    expect(err).toBeInstanceOf(BookingRejected);
    expect(err.code).toBe("provider_error");
    expect(err.message).not.toContain("App\\Models");
  });

  it("evento sin lugares o no encontrado (404 de Freetour): no_availability", async () => {
    const gateway = { createBooking: vi.fn(async () => { throw new GatewayError("Event not found", 404, 0); }) };
    await expect(placeBooking(dto, { gateway, getEvent, enabled: true })).rejects.toMatchObject({ code: "no_availability" });
  });

  it("si el navegador manda un precio, se ignora y se usa el de Freetour", async () => {
    const gateway = { createBooking: vi.fn(async () => booking) };
    await placeBooking({ ...dto, price: 999 }, { gateway, getEvent, enabled: true });
    expect(gateway.createBooking).toHaveBeenCalledWith(expect.objectContaining({ price: 0 }));
  });

  it("si no se puede leer el evento: no_availability y no reserva", async () => {
    const gateway = { createBooking: vi.fn() };
    const broken = vi.fn(async () => { throw new Error("404"); });
    await expect(placeBooking(dto, { gateway, getEvent: broken, enabled: true })).rejects.toMatchObject({ code: "no_availability" });
    expect(gateway.createBooking).not.toHaveBeenCalled();
  });
});

describe("placeBooking: duplicados", () => {
  it("si ya tiene una reserva activa en ese horario con ese correo, no reserva otra", async () => {
    const gateway = { createBooking: vi.fn() };
    const hasActiveBooking = vi.fn(async () => true);
    const err = await placeBooking(dto, { gateway, getEvent, enabled: true, hasActiveBooking }).catch((e) => e);
    expect(err).toMatchObject({ code: "already_booked" });
    expect(err.message).toMatch(/revisa tu correo/i);
    expect(hasActiveBooking).toHaveBeenCalledWith(631716694, "ana@example.com");
    expect(gateway.createBooking).not.toHaveBeenCalled();
  });

  it("si la revisión de traslapes falla, la reserva sigue (no se bloquea al cliente)", async () => {
    const gateway = { createBooking: vi.fn(async () => booking) };
    const hasActiveBooking = vi.fn(async () => { throw new Error("D1 caído"); });
    await expect(placeBooking(dto, { gateway, getEvent, enabled: true, hasActiveBooking })).resolves.toMatchObject({ booking });
  });

  it("pasa el token del intento a la pasarela", async () => {
    const gateway = { createBooking: vi.fn(async () => booking) };
    await placeBooking({ ...dto, idempotencyKey: "abcdefghijklmnop1234" }, { gateway, getEvent, enabled: true });
    expect(gateway.createBooking).toHaveBeenCalledWith(expect.objectContaining({ idempotencyKey: "abcdefghijklmnop1234" }));
  });

  it("si la pasarela no respondió a tiempo, error para el cliente sin detalles", async () => {
    const gateway = { createBooking: vi.fn(async () => { throw new GatewayError("timeout", 504, null); }) };
    await expect(placeBooking(dto, { gateway, getEvent, enabled: true })).rejects.toMatchObject({ code: "provider_error" });
  });
});

describe("REQ-083 placeBooking: contacto adulto", () => {
  it("REQ-083: con la revisión encendida y sin declarar adulto, no reserva", async () => {
    const gateway = { createBooking: vi.fn() };
    await expect(placeBooking(dto, { gateway, getEvent, enabled: true, adultContactRequired: true })).rejects.toMatchObject({ code: "adult_required" });
    expect(gateway.createBooking).not.toHaveBeenCalled();
  });
  it("REQ-083: declarado adulto reserva, y la declaración no se envía a FREETOUR", async () => {
    const gateway = { createBooking: vi.fn(async () => booking) };
    await placeBooking({ ...dto, contactIsAdult: true }, { gateway, getEvent, enabled: true, adultContactRequired: true });
    // REQ-802: sin isPhoneRequired tampoco va el teléfono (G2).
    expect(gateway.createBooking).toHaveBeenCalledWith({ ...dto, customer: { email: "ana@example.com", firstName: "Ana", lastName: "Pérez" } });
  });
  it("REQ-083: con la bandera apagada se comporta como hoy", async () => {
    const gateway = { createBooking: vi.fn(async () => booking) };
    await expect(placeBooking(dto, { gateway, getEvent, enabled: true })).resolves.toEqual({ booking, price: 0 });
  });
});

describe("recordBooking", () => {
  const now = new Date("2026-10-30T14:27:46Z");
  const b = { ...booking, refNumber: "6782-20261030162746-244" };
  const info = { date: "2026-10-31 08:00:00", utcDate: "2026-10-31 06:00:00", language: "French" };

  it("busca la fecha real del evento en el tour del número de reserva y guarda", async () => {
    const getEventInfo = vi.fn(async () => info);
    const save = vi.fn(async () => {});
    const rec = await recordBooking({ booking: b, request: dto, price: 0 }, { getEventInfo, save, newToken: () => "tok", now });
    expect(getEventInfo).toHaveBeenCalledWith(6782, 631716694);
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ refNumber: b.refNumber, tourExternalId: 6782, eventDate: info.date, manageToken: "tok" }));
    expect(rec?.manageToken).toBe("tok");
  });

  it("si falla el guardado no lanza (el cliente igual ve su reserva)", async () => {
    const save = vi.fn(async () => { throw new Error("D1 caído"); });
    const rec = await recordBooking({ booking: b, request: dto, price: 0 }, { getEventInfo: async () => info, save, newToken: () => "t", now });
    expect(rec).toBeNull();
  });

  it("si no se encuentra la fecha, guarda igual sin fecha", async () => {
    const save = vi.fn(async () => {});
    await recordBooking({ booking: b, request: dto, price: 0 }, { getEventInfo: async () => { throw new Error("x"); }, save, newToken: () => "t", now });
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ eventDate: null }));
  });
});

