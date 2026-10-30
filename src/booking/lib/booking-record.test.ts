import { describe, it, expect } from "vitest";
import { tourIdFromRef, buildBookingRecord } from "./booking-record";
import { findEventInfo } from "./event-info";

describe("tourIdFromRef", () => {
  it("el número de reserva de Freetour empieza con el id del tour", () => {
    expect(tourIdFromRef("6782-20261030162746-244")).toBe(6782);
    expect(tourIdFromRef("raro")).toBeNull();
  });
});

describe("findEventInfo", () => {
  const body = { data: [{ id: 1, tourId: 6782, language: "French", date: "2026-10-31 08:00:00", utcDate: "2026-10-31 06:00:00" }], status: 200 };
  it("encuentra fecha local, UTC e idioma del evento", () => {
    expect(findEventInfo(body, 1)).toEqual({ date: "2026-10-31 08:00:00", utcDate: "2026-10-31 06:00:00", language: "French" });
    expect(findEventInfo(body, 2)).toBeNull();
    expect(findEventInfo({ data: { events: body.data } }, 1)?.language).toBe("French");
  });
});

describe("buildBookingRecord", () => {
  it("arma el registro con el token privado y sin precio del navegador", () => {
    const now = new Date("2026-10-30T14:27:46Z");
    const rec = buildBookingRecord({
      booking: { refNumber: "6782-1-244", eventId: 1, status: "active", canBeCanceled: 1, canBeEdited: 1, createdAt: "x" },
      request: { eventId: 1, adults: 2, children: 1, price: 0, customer: { email: "Ana@Example.com ", firstName: "Ana", lastName: "Pérez", phone: "+525512345678" } },
      price: 0,
      event: { date: "2026-10-31 08:00:00", utcDate: "2026-10-31 06:00:00", language: "French" },
      token: "tok",
      now,
    });
    expect(rec).toEqual({
      refNumber: "6782-1-244", tourExternalId: 6782, eventId: 1, adults: 2, children: 1, price: 0,
      email: "ana@example.com", firstName: "Ana", lastName: "Pérez", phone: "+525512345678",
      eventDate: "2026-10-31 08:00:00", eventUtcDate: "2026-10-31 06:00:00", language: "French",
      status: "active", manageToken: "tok", createdAt: now, updatedAt: now,
    });
  });
});
