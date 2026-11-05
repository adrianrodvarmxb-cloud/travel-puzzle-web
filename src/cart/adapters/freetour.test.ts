import { describe, expect, it, vi } from "vitest";
import { createFreetourAdapter } from "./freetour";
import { createFreetourApi } from "@/freetour/api";
import { createCartItem } from "../lib/item";

const event = (over: Record<string, unknown> = {}) => ({
  id: 77, isAvailable: 1, minAdultsPerBooking: 1, availableAdultPlaces: 10, availableChildrenPlaces: 5,
  isPhoneRequired: 0, fullPricePerGroup: { "1": 20, "2": 40 }, payableNowPricePerGroup: { "1": 0, "2": 0 }, isPartiallyPaid: 0, ...over,
});

/** Cliente real de src/freetour/api.ts con fetch falso: prueba la integración sin red. */
function apiWith(handler: (url: string, init?: RequestInit) => unknown) {
  const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url);
    if (u.endsWith("/login")) return new Response(JSON.stringify({ data: { token: { accessToken: "t" } } }));
    return new Response(JSON.stringify(handler(u, init)));
  });
  const api = createFreetourApi({ config: { baseUrl: "https://ft.example/partnersAPI/v.2.0", email: "e", password: "p", environment: "staging" } as never, fetch: fetchImpl as never });
  return { api, fetchImpl };
}

const tourItem = createCartItem({
  id: "p1", type: "tour", providerId: "freetour", externalId: "77", mode: "api", cityCode: "pe-lima",
  date: "2026-12-01T10:00", people: { adults: 2, children: 0 }, price: { amount: 1, currency: "EUR" },
  chargedBy: "Travel Puzzle", cancellationPolicy: { freeUntilHours: 24, text: "Hasta 24 h antes." },
});

describe("Adaptador FREETOUR (api)", () => {
  it("REQ-104: es un adaptador api para free tours y tours, y nunca nombra a FREETOUR al cliente", () => {
    const { api } = apiWith(() => ({}));
    const a = createFreetourAdapter({ api, paymentsEnabled: false });
    expect(a.mode).toBe("api");
    expect(a.types).toEqual(["free_tour", "tour"]);
    expect(a.chargedBy.toLowerCase()).not.toContain("freetour");
  });

  it("REQ-104: precio y lugares en vivo con GET /events/{id}, cada vez (sin caché)", async () => {
    const { api, fetchImpl } = apiWith(() => ({ data: event() }));
    const a = createFreetourAdapter({ api, paymentsEnabled: false });
    const q = { type: "tour" as const, cityCode: "pe-lima", country: "PE", date: "2026-12-01", people: { adults: 2, children: 0 } };
    expect(await a.availability("77", q)).toEqual({ available: true, price: { amount: 40, currency: "EUR" }, places: 10 });
    await a.availability("77", q);
    const eventCalls = fetchImpl.mock.calls.filter(([u]) => String(u).endsWith("/events/77"));
    expect(eventCalls).toHaveLength(2);
  });

  it("REQ-104: sin lugares para el grupo no hay disponibilidad", async () => {
    const { api } = apiWith(() => ({ data: event({ availableAdultPlaces: 1 }) }));
    const a = createFreetourAdapter({ api, paymentsEnabled: false });
    expect((await a.availability("77", { type: "tour", cityCode: "x", country: "PE", date: "2026-12-01", people: { adults: 2, children: 0 } })).available).toBe(false);
  });

  it("REQ-104: reservar consulta el evento en vivo antes y usa ese precio, no el del carrito", async () => {
    const { api } = apiWith(() => ({ data: event() }));
    const book = vi.fn(async () => ({ refNumber: "TP-1" }));
    const a = createFreetourAdapter({ api, paymentsEnabled: false, book });
    expect(await a.reserve(tourItem)).toEqual({ kind: "reserved", externalRef: "TP-1", price: { amount: 40, currency: "EUR" } });
    expect(book).toHaveBeenCalledWith({ eventId: 77, adults: 2, children: 0, price: 40 });
  });

  it("REQ-104: si el evento ya no tiene lugar, no reserva", async () => {
    const { api } = apiWith(() => ({ data: event({ isAvailable: 0 }) }));
    const book = vi.fn();
    const a = createFreetourAdapter({ api, paymentsEnabled: false, book });
    await expect(a.reserve(tourItem)).rejects.toThrow();
    expect(book).not.toHaveBeenCalled();
  });

  it("REQ-107: cobrar con pagos apagados no llama a POST /payment (candado Stripe)", async () => {
    const { api, fetchImpl } = apiWith(() => ({ data: {} }));
    const a = createFreetourAdapter({ api, paymentsEnabled: false });
    expect(await a.charge({ ...tourItem, externalRef: "TP-1" }, { success: "s", cancel: "c" })).toEqual({ kind: "disabled" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("REQ-107: cobrar (stage) pide el paymentUrl con refNumber, successUrl y cancelUrl", async () => {
    const { api, fetchImpl } = apiWith(() => ({ data: { paymentUrl: "https://checkout.stripe.example/x", expiresAt: "2026-12-02T10:00:00Z" } }));
    const a = createFreetourAdapter({ api, paymentsEnabled: true });
    expect(await a.charge({ ...tourItem, externalRef: "TP-1" }, { success: "https://s", cancel: "https://c" })).toEqual({
      kind: "payment_url", url: "https://checkout.stripe.example/x", expiresAt: "2026-12-02T10:00:00Z",
    });
    const call = fetchImpl.mock.calls.find(([u]) => String(u).endsWith("/payment"))!;
    expect(JSON.parse(String(call[1]?.body))).toEqual({ refNumber: "TP-1", successUrl: "https://s", cancelUrl: "https://c" });
  });

  it("REQ-107: un free tour (costo 0) no se cobra", async () => {
    const { api, fetchImpl } = apiWith(() => ({}));
    const a = createFreetourAdapter({ api, paymentsEnabled: true });
    expect(await a.charge({ ...tourItem, price: { amount: 0, currency: "EUR" } }, { success: "s", cancel: "c" })).toEqual({ kind: "none" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
