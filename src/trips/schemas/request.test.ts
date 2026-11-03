import { describe, it, expect } from "vitest";
import { requestInputSchema } from "./request";

const base = { tripId: "t1", firstName: "Ana", lastName: "Pérez", email: "ana@example.com", phone: "+52 55 1234 5678", consent: true, adults: 2, children: 0, infants: 0, childAges: [], website: "" };

describe("requestInputSchema", () => {
  it("reserva de tour: fecha, horario y opción", () => {
    expect(requestInputSchema.safeParse({ ...base, kind: "reserva", date: "2027-03-05", time: "09:00", optionId: "g1" }).success).toBe(true);
    expect(requestInputSchema.safeParse({ ...base, kind: "reserva", time: "09:00" }).success).toBe(false);
  });
  it("personalizado: inicio, fin y tipo de servicio", () => {
    expect(requestInputSchema.safeParse({ ...base, kind: "personalizado", startDate: "2027-05-01", endDate: "2027-05-10", serviceType: "private" }).success).toBe(true);
    expect(requestInputSchema.safeParse({ ...base, kind: "personalizado", startDate: "2027-05-10", endDate: "2027-05-01", serviceType: "group" }).success).toBe(false);
  });
  it("sin consentimiento, sin correo válido o con edades que no cuadran: no", () => {
    expect(requestInputSchema.safeParse({ ...base, kind: "reserva", date: "2027-03-05", time: "09:00", consent: false }).success).toBe(false);
    expect(requestInputSchema.safeParse({ ...base, kind: "reserva", date: "2027-03-05", time: "09:00", email: "x" }).success).toBe(false);
    expect(requestInputSchema.safeParse({ ...base, kind: "reserva", date: "2027-03-05", time: "09:00", children: 2, childAges: [5] }).success).toBe(false);
  });
});
