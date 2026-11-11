import { describe, it, expect } from "vitest";
import { accountBookings, type TourBookingRow, type TripRequestRow } from "./bookings";

const now = new Date("2026-11-11T12:00:00Z");
const tour = (o: Partial<TourBookingRow>): TourBookingRow => ({
  refNumber: "R1", manageToken: "tok1", title: "Free tour", eventDate: "2026-12-01 10:00:00", status: "active", paymentStatus: null, price: 0, currency: null, ...o,
});
const req = (o: Partial<TripRequestRow>): TripRequestRow => ({ ref: "TP-1", tripTitle: "Japón", date: "2027-03-10", status: "new", createdAt: new Date("2026-11-01T00:00:00Z"), ...o });

describe("REQ-1593: Mis reservas junta todo lo hecho con el correo", () => {
  it("REQ-1593: tours y solicitudes juntos; próximas primero (la más cercana arriba) y luego las pasadas (la más reciente arriba)", () => {
    const out = accountBookings({
      tours: [tour({ refNumber: "LEJOS", eventDate: "2027-01-05 10:00:00" }), tour({ refNumber: "PASADA", eventDate: "2026-10-01 10:00:00" }), tour({ refNumber: "CERCA", eventDate: "2026-11-20 10:00:00" })],
      requests: [req({ ref: "TP-9", date: "2026-12-15" })],
      now,
    });
    expect(out.map((b) => b.ref)).toEqual(["CERCA", "TP-9", "LEJOS", "PASADA"]);
    expect(out.find((b) => b.ref === "PASADA")?.upcoming).toBe(false);
  });
  it("REQ-1593: cada reserva de tour lleva su enlace de gestión; las solicitudes no tienen enlace", () => {
    const out = accountBookings({ tours: [tour({ manageToken: "abc" })], requests: [req({})], now });
    expect(out.find((b) => b.kind === "tour")?.href).toBe("/reserva/abc");
    expect(out.find((b) => b.kind === "request")?.href).toBeNull();
  });
  it("REQ-1593: estados claros para el cliente", () => {
    const out = accountBookings({
      tours: [tour({ refNumber: "A", status: "canceled" }), tour({ refNumber: "B", paymentStatus: "pending" }), tour({ refNumber: "C" })],
      requests: [req({ ref: "R", status: "quoted" })],
      now,
    });
    const s = Object.fromEntries(out.map((b) => [b.ref, b.statusLabel]));
    expect(s).toEqual({ A: "Cancelada", B: "Pago pendiente", C: "Confirmada", R: "Cotizada" });
  });
  it("REQ-1593: una fecha rota no tumba la lista (queda al final)", () => {
    const out = accountBookings({ tours: [tour({ refNumber: "X", eventDate: null }), tour({ refNumber: "Y" })], requests: [], now });
    expect(out.map((b) => b.ref)).toEqual(["Y", "X"]);
  });
});

describe("REQ-1593: fechas que llegan como objeto Date (D1 crudo) no tumban la página", () => {
  it("REQ-1593: una fecha Date se convierte a texto y se ordena igual", () => {
    const out = accountBookings({
      tours: [tour({ refNumber: "D", eventDate: new Date("2026-12-20T10:00:00Z") as unknown as string })],
      requests: [req({ ref: "S", date: new Date("2027-03-10T00:00:00Z") as unknown as string })],
      now,
    });
    expect(out.map((b) => [b.ref, b.date])).toEqual([["D", "2026-12-20 10:00:00"], ["S", "2027-03-10"]]);
  });
});
