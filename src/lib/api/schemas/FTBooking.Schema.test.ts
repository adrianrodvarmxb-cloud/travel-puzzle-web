import { describe, expect, it } from "vitest";
import { zFTBookingDTO } from "./FTBooking.Schema";

const base = { eventId: 1, adults: 1, children: 0, price: 0, customer: { email: "a@b.co", firstName: "A", lastName: "B" } };

describe("zFTBookingDTO teléfono", () => {
  it("REQ-018: WhatsApp vacío es opcional de verdad (el formulario manda '')", () => {
    const r = zFTBookingDTO.safeParse({ ...base, customer: { ...base.customer, phone: "" } });
    expect(r.success).toBe(true);
    expect(r.success && r.data.customer.phone).toBeUndefined();
  });
  it("REQ-018: sin teléfono también pasa; con teléfono se conserva", () => {
    expect(zFTBookingDTO.safeParse(base).success).toBe(true);
    const r = zFTBookingDTO.safeParse({ ...base, customer: { ...base.customer, phone: "+52 55 1234 5678" } });
    expect(r.success && r.data.customer.phone).toBe("+52 55 1234 5678");
  });
});
