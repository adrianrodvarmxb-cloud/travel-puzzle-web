import { describe, it, expect } from "vitest";
import { toFreetourRequest } from "./operations.js";

const customer = { email: "ana@example.com", firstName: "Ana", lastName: "Pérez", phone: "+525512345678" };

describe("operaciones permitidas", () => {
  it("createBooking → POST /booking con el cuerpo exacto que pide Freetour", () => {
    const r = toFreetourRequest("createBooking", { eventId: 631716694, adults: 2, children: 0, price: 0, customer, extra: "x" });
    expect(r).toEqual({ ok: true, method: "POST", path: "/booking", body: { eventId: 631716694, adults: 2, children: 0, price: 0, customer } });
  });

  it("getBooking → GET /booking/{ref} (ref escapado)", () => {
    expect(toFreetourRequest("getBooking", { refNumber: "AB/1" })).toEqual({ ok: true, method: "GET", path: "/booking/AB%2F1" });
  });

  it("cancelBooking y editBooking piden refNumber, eventId, adults y children", () => {
    const p = { refNumber: "R1", eventId: 5, adults: 1, children: 0 };
    expect(toFreetourRequest("cancelBooking", p)).toMatchObject({ ok: true, method: "POST", path: "/booking/cancel", body: p });
    expect(toFreetourRequest("editBooking", p)).toMatchObject({ ok: true, method: "POST", path: "/booking/edit", body: p });
    expect(toFreetourRequest("cancelBooking", { refNumber: "R1" }).ok).toBe(false);
  });

  it("getEventForEdit → GET /event/{id}/{ref}", () => {
    expect(toFreetourRequest("getEventForEdit", { eventId: 5, refNumber: "R1" })).toEqual({ ok: true, method: "GET", path: "/event/5/R1" });
  });

  it("createPayment exige URLs https de regreso", () => {
    const ok = toFreetourRequest("createPayment", { refNumber: "R1", successUrl: "https://travelpuzzle.com/ok", cancelUrl: "https://travelpuzzle.com/no" });
    expect(ok).toMatchObject({ ok: true, method: "POST", path: "/payment" });
    expect(toFreetourRequest("createPayment", { refNumber: "R1", successUrl: "javascript:alert(1)", cancelUrl: "https://x.com" }).ok).toBe(false);
  });

  it("getPaymentStatus → GET /payment/{id}", () => {
    expect(toFreetourRequest("getPaymentStatus", { checkoutSessionId: "cs_1" })).toEqual({ ok: true, method: "GET", path: "/payment/cs_1" });
  });

  it("rechaza datos inválidos y operaciones que no están en la lista", () => {
    expect(toFreetourRequest("createBooking", { eventId: "1", adults: 2, children: 0, price: 0, customer }).ok).toBe(false);
    expect(toFreetourRequest("createBooking", { eventId: 1, adults: 0, children: 0, price: 0, customer }).ok).toBe(false);
    expect(toFreetourRequest("createBooking", { eventId: 1, adults: 1, children: 0, price: 0, customer: { ...customer, email: "no" } }).ok).toBe(false);
    expect(toFreetourRequest("login", {}).ok).toBe(false);
    expect(toFreetourRequest("tours", {}).ok).toBe(false);
  });
});
