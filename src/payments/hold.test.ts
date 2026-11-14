import { describe, it, expect, vi } from "vitest";
import { startRequestHold, type HoldDeps } from "./hold";

const found = { id: "req_1", kind: "reserva", estimate: 1500, currency: "MXN" as const };

function deps(over: Partial<HoldDeps> = {}): HoldDeps {
  return {
    holdFlag: "true", stripeFlag: "true",
    findByRef: vi.fn(async () => found),
    createHold: vi.fn(async () => ({ ok: true as const, url: "https://checkout.stripe.com/c/pay/cs_1", centavos: 150000 })),
    ...over,
  };
}

describe("startRequestHold", () => {
  it("REQ-3482: con la bandera encendida crea la retención por el total del estimado y devuelve el enlace", async () => {
    const d = deps();
    const r = await startRequestHold("TP-ABC", d);
    expect(r).toEqual({ url: "https://checkout.stripe.com/c/pay/cs_1" });
    expect(d.createHold).toHaveBeenCalledWith({ requestId: "req_1", amount: 1500, currency: "MXN", kind: "total", hold: true });
  });
  it("REQ-3482: con la bandera apagada no busca ni crea nada", async () => {
    const d = deps({ holdFlag: "false" });
    expect(await startRequestHold("TP-ABC", d)).toBeNull();
    expect(d.findByRef).not.toHaveBeenCalled();
    expect(d.createHold).not.toHaveBeenCalled();
  });
  it("REQ-3482: sin estimado (precio por confirmar) no retiene", async () => {
    const d = deps({ findByRef: vi.fn(async () => ({ ...found, estimate: null })) });
    expect(await startRequestHold("TP-ABC", d)).toBeNull();
    expect(d.createHold).not.toHaveBeenCalled();
  });
  it("REQ-3482: si Stripe falla la solicitud sigue como hoy (devuelve null, no lanza)", async () => {
    const d = deps({ createHold: vi.fn(async () => ({ ok: false as const, code: "stripe_error" as const })) });
    expect(await startRequestHold("TP-ABC", d)).toBeNull();
    const boom = deps({ createHold: vi.fn(async () => { throw new Error("red caída"); }) });
    expect(await startRequestHold("TP-ABC", boom)).toBeNull();
  });
  it("REQ-3482: una URL que no es de Stripe se descarta", async () => {
    const d = deps({ createHold: vi.fn(async () => ({ ok: true as const, url: "https://evil.example/pay", centavos: 150000 })) });
    expect(await startRequestHold("TP-ABC", d)).toBeNull();
  });
});
