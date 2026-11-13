import { describe, expect, it } from "vitest";
import {
  canBuyDirect, chainAfterPaid, decide, isDirectBuyEnabled, isPastDeadline, signSupplierLink, supplierDeadline, supplierLink, verifySupplierLink,
} from "./direct-buy";
import { isPubliclyReachable, STATUS_LABEL } from "./trip";

describe("compra directa de viajes (REQ-3533, REQ-3534)", () => {
  it("REQ-3533: la bandera solo se enciende con \"true\" exacto", () => {
    expect(isDirectBuyEnabled("true")).toBe(true);
    for (const v of [undefined, "", "false", "TRUE", "1"]) expect(isDirectBuyEnabled(v)).toBe(false);
  });

  it("REQ-3533: se compra directo solo con bandera, Stripe y el viaje en modo «comprar»", () => {
    const on = { enabled: true, stripe: true };
    expect(canBuyDirect({ purchaseMode: "buy", kind: "tour" }, on)).toBe(true);
    expect(canBuyDirect({ purchaseMode: "quote", kind: "tour" }, on)).toBe(false);
    expect(canBuyDirect({ purchaseMode: "buy", kind: "personalizado" }, on)).toBe(false);
    expect(canBuyDirect({ purchaseMode: "buy", kind: "tour" }, { enabled: false, stripe: true })).toBe(false);
    expect(canBuyDirect({ purchaseMode: "buy", kind: "tour" }, { enabled: true, stripe: false })).toBe(false);
  });

  it("REQ-3534: confirmar cierra la compra; «no hay lugar» y el vencimiento reembolsan", () => {
    expect(decide("awaiting_supplier", "confirm")).toEqual({ next: "confirmed", refund: false });
    expect(decide("awaiting_supplier", "decline")).toEqual({ next: "refunding", refund: true });
    expect(decide("awaiting_supplier", "timeout")).toEqual({ next: "refunding", refund: true });
  });

  it("REQ-3534: una compra ya decidida o sin pagar no cambia (doble clic, cron)", () => {
    for (const s of ["awaiting_payment", "confirmed", "refunding", "refunded", "refund_failed", "failed"]) {
      expect(decide(s, "confirm")).toBeNull();
      expect(decide(s, "decline")).toBeNull();
    }
  });

  it("REQ-3534: el proveedor tiene 48 h desde el pago", () => {
    const paid = new Date("2026-11-13T10:00:00Z");
    expect(supplierDeadline(paid).toISOString()).toBe("2026-11-15T10:00:00.000Z");
    expect(isPastDeadline(paid, new Date("2026-11-15T09:59:59Z"))).toBe(false);
    expect(isPastDeadline(paid, new Date("2026-11-15T10:00:00Z"))).toBe(true);
  });

  it("REQ-3534: el enlace del proveedor se verifica con su firma y no sirve para otra compra", async () => {
    const sig = await signSupplierLink("s3creto", "req_1");
    expect(await verifySupplierLink("s3creto", "req_1", sig)).toBe(true);
    expect(await verifySupplierLink("s3creto", "req_2", sig)).toBe(false);
    expect(await verifySupplierLink("otro", "req_1", sig)).toBe(false);
    expect(await verifySupplierLink("", "req_1", sig)).toBe(false);
    expect(await verifySupplierLink("s3creto", "req_1", "")).toBe(false);
    expect(supplierLink("https://tp.mx/", "req_1", sig)).toBe(`https://tp.mx/api/viajes/confirmar?id=req_1&sig=${encodeURIComponent(sig)}`);
  });

  it("REQ-3533: el gancho después del pago prueba la compra directa y luego Big Bus", async () => {
    const calls: string[] = [];
    const a = async (id: string) => { calls.push(`a:${id}`); return false; };
    const b = async (id: string) => { calls.push(`b:${id}`); return true; };
    const chained = chainAfterPaid(a, undefined, b)!;
    expect(await chained("r1")).toBe(true);
    expect(calls).toEqual(["a:r1", "b:r1"]);
    expect(chainAfterPaid(undefined)).toBeUndefined();
  });
});

describe("viaje «solo con enlace» (REQ-3535)", () => {
  it("REQ-3535: la ficha y la compra abren publicados y «solo con enlace», nunca borrador ni oculto", () => {
    expect(isPubliclyReachable("published")).toBe(true);
    expect(isPubliclyReachable("unlisted")).toBe(true);
    expect(isPubliclyReachable("hidden")).toBe(false);
    expect(isPubliclyReachable("draft")).toBe(false);
    expect(STATUS_LABEL.unlisted).toBe("Solo con enlace");
  });
});
