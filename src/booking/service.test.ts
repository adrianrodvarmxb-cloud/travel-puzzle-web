import { describe, it, expect, vi } from "vitest";
import { placeBooking, BookingRejected } from "./service";
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

  it("reserva con el teléfono normalizado y devuelve la reserva", async () => {
    const gateway = { createBooking: vi.fn(async () => booking) };
    const out = await placeBooking(dto, { gateway, getEvent, enabled: true });
    expect(gateway.createBooking).toHaveBeenCalledWith({ ...dto, customer: { ...dto.customer, phone: "+525512345678" } });
    expect(out).toEqual(booking);
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
