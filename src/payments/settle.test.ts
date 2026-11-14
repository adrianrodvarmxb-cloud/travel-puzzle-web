import { describe, it, expect, vi } from "vitest";
import { settleHold, type SettleDeps, type HeldPayment } from "./settle";

const held: HeldPayment = {
  payment: { id: "pay_h1", paymentIntent: "pi_h1", amountCentavos: 150000, originalAmount: 1500, originalCurrency: "MXN", kind: "total" },
  request: { id: "req_1", ref: "SOL-20261113-AB12", tripTitle: "Machu Picchu 2D", email: "ana@example.com", firstName: "Ana", date: "2026-12-10", adults: 2, children: 0, infants: 0 },
};
const same = { date: "2026-12-10", adults: 2, children: 0, infants: 0, amount: 1500, currency: "MXN" };

function deps(over: Partial<SettleDeps> = {}): SettleDeps {
  return {
    enabled: true, now: new Date("2026-11-14T16:00:00Z"), siteUrl: "https://travelpuzzle.com.mx", logoUrl: "https://travelpuzzle.com.mx/brand/logo-tp-oscuro.png",
    findHeld: vi.fn(async () => held),
    capture: vi.fn(async () => ({})), cancel: vi.fn(async () => ({})),
    markCaptured: vi.fn(async () => true), markReleased: vi.fn(async () => true),
    setRequestStatus: vi.fn(async () => undefined),
    sendCustomer: vi.fn(async () => "m"), sendTeam: vi.fn(async () => "m"),
    ...over,
  };
}

describe("settleHold: cobrar", () => {
  it("REQ-3483: la confirmación coincide → captura lo retenido, pago Pagado, solicitud Pagada y correos", async () => {
    const d = deps();
    const r = await settleHold({ ref: held.request.ref, action: "capture", confirmation: same }, d);
    expect(r).toEqual({ ok: true, result: "captured", centavos: 150000 });
    expect(d.capture).toHaveBeenCalledWith("pi_h1", 150000, "capture_pay_h1");
    expect(d.markCaptured).toHaveBeenCalledWith("pay_h1", { paidAt: d.now, amountCentavos: 150000 });
    expect(d.setRequestStatus).toHaveBeenCalledWith("req_1", "paid");
    expect(d.sendCustomer).toHaveBeenCalledTimes(1);
    expect((d.sendCustomer as ReturnType<typeof vi.fn>).mock.calls[0][0].subject).toContain("Recibimos tu pago");
    expect(d.sendTeam).toHaveBeenCalledTimes(1);
  });
  it("REQ-3483: si la confirmación no coincide NO captura y devuelve los motivos para pedir el OK al PO", async () => {
    const d = deps();
    const r = await settleHold({ ref: held.request.ref, action: "capture", confirmation: { ...same, date: "2026-12-11", amount: 1700 } }, d);
    expect(r).toEqual({ ok: false, code: "needs_po", reasons: ["date_changed", "price_changed"] });
    expect(d.capture).not.toHaveBeenCalled();
    expect(d.setRequestStatus).not.toHaveBeenCalled();
  });
  it("REQ-3483: con el OK del PO captura aunque no coincida, y deja constancia en el registro", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const d = deps();
    const r = await settleHold({ ref: held.request.ref, action: "capture", confirmation: { ...same, date: "2026-12-11" }, poApproved: true, poNote: "OK por WhatsApp 13 nov 14:02" }, d);
    expect(r).toEqual({ ok: true, result: "captured", centavos: 150000 });
    expect(log).toHaveBeenCalledWith(expect.stringContaining("OK por WhatsApp 13 nov 14:02"));
    log.mockRestore();
  });
  it("REQ-3483: sin confirmación y sin OK del PO no cobra", async () => {
    const d = deps();
    expect(await settleHold({ ref: held.request.ref, action: "capture" }, d)).toEqual({ ok: false, code: "invalid" });
    expect(d.capture).not.toHaveBeenCalled();
  });
  it("REQ-3483: el monto a capturar nunca pasa de lo retenido", async () => {
    const d = deps();
    expect(await settleHold({ ref: held.request.ref, action: "capture", poApproved: true, captureCentavos: 150001 }, d)).toEqual({ ok: false, code: "invalid" });
    const ok = await settleHold({ ref: held.request.ref, action: "capture", poApproved: true, captureCentavos: 120000 }, d);
    expect(ok).toEqual({ ok: true, result: "captured", centavos: 120000 });
    expect(d.capture).toHaveBeenCalledWith("pi_h1", 120000, "capture_pay_h1");
  });
  it("REQ-3483: repetir el cobro (ya pagado) no duplica correos", async () => {
    const d = deps({ markCaptured: vi.fn(async () => false) });
    const r = await settleHold({ ref: held.request.ref, action: "capture", confirmation: same }, d);
    expect(r).toEqual({ ok: true, result: "captured", centavos: 150000, duplicate: true });
    expect(d.sendCustomer).not.toHaveBeenCalled();
    expect(d.setRequestStatus).not.toHaveBeenCalled();
  });
  it("REQ-3483: si Stripe falla no cambia nada", async () => {
    const d = deps({ capture: vi.fn(async () => { throw new Error("Stripe 400"); }) });
    expect(await settleHold({ ref: held.request.ref, action: "capture", confirmation: same }, d)).toEqual({ ok: false, code: "stripe_error" });
    expect(d.markCaptured).not.toHaveBeenCalled();
    expect(d.sendCustomer).not.toHaveBeenCalled();
  });
});

describe("settleHold: liberar", () => {
  it("REQ-3483: libera la retención sin cargo, cierra la solicitud y avisa al cliente", async () => {
    const d = deps();
    const r = await settleHold({ ref: held.request.ref, action: "release", reason: "sin lugar" }, d);
    expect(r).toEqual({ ok: true, result: "released", centavos: 150000 });
    expect(d.cancel).toHaveBeenCalledWith("pi_h1", "release_pay_h1");
    expect(d.markReleased).toHaveBeenCalledWith("pay_h1");
    expect(d.setRequestStatus).toHaveBeenCalledWith("req_1", "closed");
    const mail = (d.sendCustomer as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(mail.text).toContain("sin cargo");
    expect((d.sendTeam as ReturnType<typeof vi.fn>).mock.calls[0][0].text).toContain("sin lugar");
  });
  it("REQ-3483: liberar no necesita confirmación ni OK del PO (no se toma dinero)", async () => {
    const d = deps();
    expect((await settleHold({ ref: held.request.ref, action: "release" }, d)).ok).toBe(true);
  });
  it("REQ-3483: liberar dos veces no duplica correos", async () => {
    const d = deps({ markReleased: vi.fn(async () => false) });
    expect(await settleHold({ ref: held.request.ref, action: "release" }, d)).toEqual({ ok: true, result: "released", centavos: 150000, duplicate: true });
    expect(d.sendCustomer).not.toHaveBeenCalled();
  });
});

describe("settleHold: puertas", () => {
  it("REQ-3483: con la bandera apagada no hace nada", async () => {
    const d = deps({ enabled: false });
    expect(await settleHold({ ref: held.request.ref, action: "release" }, d)).toEqual({ ok: false, code: "disabled" });
    expect(d.findHeld).not.toHaveBeenCalled();
  });
  it("REQ-3483: sin una retención vigente para ese folio devuelve not_held", async () => {
    const d = deps({ findHeld: vi.fn(async () => null) });
    expect(await settleHold({ ref: "SOL-X", action: "capture", poApproved: true }, d)).toEqual({ ok: false, code: "not_held" });
  });
  it("REQ-3483: una retención sin PaymentIntent no se puede cobrar", async () => {
    const d = deps({ findHeld: vi.fn(async () => ({ ...held, payment: { ...held.payment, paymentIntent: null } })) });
    expect(await settleHold({ ref: held.request.ref, action: "capture", poApproved: true }, d)).toEqual({ ok: false, code: "invalid" });
  });
});
