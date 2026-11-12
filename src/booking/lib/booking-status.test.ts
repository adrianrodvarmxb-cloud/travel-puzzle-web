import { describe, it, expect } from "vitest";
import { bookingHeadline } from "./booking-status";

describe("REQ-065: estados unpaid y rejected en la página de la reserva", () => {
  it("REQ-065: rechazada dice que no se pudo confirmar, nunca que el lugar está apartado", () => {
    const h = bookingHeadline("rejected", null);
    expect(h).toMatchObject({ label: "Reserva rechazada", title: "Tu reserva no pudo confirmarse", active: false });
  });

  it("REQ-065: sin pagar con enlace de pago pide completar el pago", () => {
    expect(bookingHeadline("unpaid", "/reserva/t/pago/continuar")).toMatchObject({ label: "Pago pendiente", title: "Falta completar tu pago", active: false });
    expect(bookingHeadline("pending_payment", "/reserva/t/pago/continuar").label).toBe("Pago pendiente");
  });

  it("REQ-065: sin pagar y sin enlace no promete la reserva", () => {
    const h = bookingHeadline("unpaid", null);
    expect(h.label).toBe("Pago pendiente");
    expect(h.title).not.toMatch(/apartado/);
    expect(h.active).toBe(false);
  });

  it("REQ-065: activa, cancelada y cancelación solicitada conservan su texto", () => {
    expect(bookingHeadline("active", null)).toMatchObject({ label: "Reserva confirmada", title: "¡Tu lugar está apartado!", active: true });
    expect(bookingHeadline("canceled", null).title).toBe("Tu reserva quedó cancelada");
    expect(bookingHeadline("cancel_requested", null).title).toBe("Recibimos tu cancelación");
  });

  it("REQ-065: un estado desconocido no se muestra como confirmado", () => {
    expect(bookingHeadline("algo_nuevo", null)).toMatchObject({ active: false, title: "Tu reserva no pudo confirmarse" });
  });
});
