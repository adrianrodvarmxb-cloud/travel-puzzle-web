import { describe, expect, it, vi } from "vitest";
import { cancelPiece, chargePart, ensurePaymentUrl, needsRenewal, splitByProvider, SplitError } from "./split";
import { createCartItem, type CartItem } from "./item";
import { addSuggestion, openCart } from "./cart";
import type { ProviderAdapter } from "./adapter";

const item = (o: Partial<CartItem> & Pick<CartItem, "id" | "type" | "providerId" | "mode">, status: CartItem["status"] = "in_cart") =>
  createCartItem({
    externalId: `x-${o.id}`, cityCode: "pe-cusco", date: "2026-12-01", people: { adults: 2, children: 0 },
    price: { amount: 10, currency: "USD" }, chargedBy: o.providerId, cancellationPolicy: { freeUntilHours: 24, text: `Política ${o.id}` },
    ...o,
  }, status);

const tap = { source: "user", kind: "tap" } as const;
const ft = item({ id: "ft", type: "free_tour", providerId: "freetour", mode: "api", price: { amount: 0, currency: "EUR" } }, "confirmed");
const paid = item({ id: "pt", type: "tour", providerId: "freetour", mode: "api", price: { amount: 30, currency: "EUR" } });
const t1 = item({ id: "t1", type: "transfer", providerId: "kiwitaxi", mode: "deeplink", price: { amount: 25.1, currency: "USD" } });
const t2 = item({ id: "t2", type: "tickets", providerId: "kiwitaxi", mode: "deeplink", price: { amount: 10.2, currency: "USD" } });
const cart = [paid, t1, t2].reduce((c, i) => addSuggestion(c, i, tap), openCart("c1", ft));

const adapter = (over: Partial<ProviderAdapter> = {}): ProviderAdapter => ({
  id: "freetour", mode: "api", types: ["tour"], chargedBy: "Travel Puzzle",
  search: async () => [], availability: async () => ({ available: true }),
  reserve: async () => ({ kind: "reserved", externalRef: "R1" }), cancel: async () => ({ ok: true }),
  charge: async () => ({ kind: "payment_url", url: "https://pay/new", expiresAt: "2026-12-02T00:00:00Z" }),
  ...over,
});

describe("Cobro dividido", () => {
  it("REQ-107: separa el cobro por proveedor con desglose y política de cada pieza", () => {
    const parts = splitByProvider(cart);
    expect(parts.map((p) => p.providerId)).toEqual(["freetour", "kiwitaxi"]);
    const kiwi = parts[1];
    expect(kiwi.totals).toEqual({ USD: 35.3 });
    expect(kiwi.lines.map((l) => [l.itemId, l.policy])).toEqual([["t1", "Política t1"], ["t2", "Política t2"]]);
    expect(parts[0].totals).toEqual({ EUR: 30 });
  });

  it("REQ-107: la pieza confirmada de costo 0 aparece en el desglose pero no se cobra", () => {
    const fr = splitByProvider(cart)[0];
    expect(fr.lines.find((l) => l.itemId === "ft")).toMatchObject({ amount: 0, payable: false });
  });

  it("REQ-107: el seguro solo va como deeplink", () => {
    const ins = item({ id: "s1", type: "insurance", providerId: "seguro", mode: "api" });
    expect(() => splitByProvider(addSuggestion(openCart("c2"), ins, tap))).toThrow(SplitError);
    const insDeep = item({ id: "s2", type: "insurance", providerId: "seguro", mode: "deeplink" });
    expect(splitByProvider(addSuggestion(openCart("c2"), insDeep, tap))[0].mode).toBe("deeplink");
  });

  it("REQ-107: un paymentUrl vencido se renueva y uno vigente se conserva", async () => {
    const now = Date.parse("2026-12-01T12:00:00Z");
    const expired = { ...paid, payment: { url: "https://pay/old", expiresAt: "2026-12-01T11:00:00Z" } };
    const fresh = { ...paid, payment: { url: "https://pay/ok", expiresAt: "2026-12-01T20:00:00Z" } };
    expect(needsRenewal(expired, now)).toBe(true);
    expect(needsRenewal(fresh, now)).toBe(false);
    const charge = vi.fn(adapter().charge);
    const a = adapter({ charge });
    expect((await ensurePaymentUrl(expired, a, { now, paymentsEnabled: true, urls: { success: "s", cancel: "c" } })).payment?.url).toBe("https://pay/new");
    expect((await ensurePaymentUrl(fresh, a, { now, paymentsEnabled: true, urls: { success: "s", cancel: "c" } })).payment?.url).toBe("https://pay/ok");
    expect(charge).toHaveBeenCalledTimes(1);
  });

  it("REQ-107: sin OK de pagos no se llama al cobro (candado Stripe)", async () => {
    const charge = vi.fn(adapter().charge);
    const res = await chargePart(splitByProvider(cart)[0], adapter({ charge }), { paymentsEnabled: false, urls: { success: "s", cancel: "c" } });
    expect(res).toEqual({ kind: "disabled" });
    expect(charge).not.toHaveBeenCalled();
  });

  it("REQ-107: en stage cobra solo las piezas pagables de esa parte, cada una por separado", async () => {
    const charge = vi.fn(adapter().charge);
    const res = await chargePart(splitByProvider(cart)[0], adapter({ charge }), { paymentsEnabled: true, urls: { success: "s", cancel: "c" }, items: cart.items });
    expect(res.kind).toBe("charged");
    expect(charge).toHaveBeenCalledTimes(1);
    expect(charge.mock.calls[0][0].id).toBe("pt");
  });

  it("REQ-107: cancelar una pieza no afecta a las demás", async () => {
    const res = await cancelPiece(cart, "t1", adapter({ id: "kiwitaxi" }));
    expect(res.ok).toBe(true);
    expect(res.cart.items.find((i) => i.id === "t1")?.status).toBe("cancelled");
    for (const id of ["ft", "pt", "t2"]) expect(res.cart.items.find((i) => i.id === id)).toEqual(cart.items.find((i) => i.id === id));
  });

  it("REQ-107: si el proveedor no cancela, la pieza y las demás quedan igual", async () => {
    const res = await cancelPiece(cart, "pt", adapter({ cancel: async () => { throw new Error("403"); } }));
    expect(res.ok).toBe(false);
    expect(res.cart).toEqual(cart);
  });
});
