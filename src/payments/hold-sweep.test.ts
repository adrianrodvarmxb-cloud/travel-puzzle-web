import { describe, it, expect, vi } from "vitest";
import { runHoldSweep, type SweepDeps, type HeldRow } from "./hold-sweep";

const DAY = 86_400_000;
const now = new Date("2026-11-15T12:00:00Z");
const row = (id: string, ageDays: number): HeldRow => ({
  payment: { id, paymentIntent: `pi_${id}`, amountCentavos: 150000, kind: "total" },
  request: { id: `r_${id}`, ref: `TP-${id}`, tripTitle: "Tour", email: `${id}@x.com`, firstName: "Ana" },
  heldAt: new Date(now.getTime() - ageDays * DAY),
});
function mk(rows: HeldRow[], over: Partial<SweepDeps> = {}) {
  const sent = new Set<string>();
  const d: SweepDeps = {
    enabled: true, now, siteUrl: "https://tp.test", logoUrl: "https://tp.test/l.png",
    listHeld: vi.fn(async () => rows),
    wasNoticed: vi.fn(async (id) => sent.has(id)),
    markNoticed: vi.fn(async (id) => { sent.add(id); }),
    cancel: vi.fn(async () => undefined),
    markReleased: vi.fn(async () => true),
    setRequestStatus: vi.fn(async () => undefined),
    sendCustomer: vi.fn(async () => undefined),
    sendTeam: vi.fn(async () => undefined),
    ...over,
  };
  return d;
}

describe("runHoldSweep", () => {
  it("REQ-3484: apagado no toca nada", async () => {
    const d = mk([row("a", 6)], { enabled: false });
    expect(await runHoldSweep(d)).toEqual({ skipped: "disabled" });
    expect(d.listHeld).not.toHaveBeenCalled();
  });
  it("REQ-3484: el día 5 avisa al equipo una sola vez y no cobra ni libera", async () => {
    const d = mk([row("a", 5.2)]);
    expect(await runHoldSweep(d)).toMatchObject({ noticed: 1, expired: 0 });
    expect(d.sendTeam).toHaveBeenCalledTimes(1);
    expect((d.sendTeam as any).mock.calls[0][0].subject).toContain("TP-a");
    expect(d.cancel).not.toHaveBeenCalled();
    expect(await runHoldSweep(d)).toMatchObject({ noticed: 0 });
    expect(d.sendTeam).toHaveBeenCalledTimes(1);
  });
  it("REQ-3484: antes del día 5 no avisa", async () => {
    const d = mk([row("a", 2)]);
    expect(await runHoldSweep(d)).toMatchObject({ noticed: 0, expired: 0 });
    expect(d.sendTeam).not.toHaveBeenCalled();
  });
  it("REQ-3484: al vencer libera, cierra la solicitud y avisa al cliente y al equipo", async () => {
    const d = mk([row("a", 7.1)]);
    expect(await runHoldSweep(d)).toMatchObject({ expired: 1 });
    expect(d.cancel).toHaveBeenCalledWith("pi_a", "release_a");
    expect(d.markReleased).toHaveBeenCalledWith("a");
    expect(d.setRequestStatus).toHaveBeenCalledWith("r_a", "closed");
    expect(d.sendCustomer).toHaveBeenCalledTimes(1);
    expect((d.sendTeam as any).mock.calls[0][0].text).toContain("venció");
  });
  it("REQ-3484: si Stripe ya la había liberado sola, igual la cierra en la base", async () => {
    const d = mk([row("a", 8)], { cancel: vi.fn(async () => { throw new Error("Stripe 400: ya cancelado"); }) });
    expect(await runHoldSweep(d)).toMatchObject({ expired: 1 });
    expect(d.markReleased).toHaveBeenCalled();
  });
  it("REQ-3484: si otra vía ya la liberó (mark devuelve false) no manda correos", async () => {
    const d = mk([row("a", 8)], { markReleased: vi.fn(async () => false) });
    expect(await runHoldSweep(d)).toMatchObject({ expired: 0 });
    expect(d.sendCustomer).not.toHaveBeenCalled();
  });
  it("REQ-3484: un fallo en una retención no detiene a las demás", async () => {
    const d = mk([row("a", 8), row("b", 8)], { setRequestStatus: vi.fn().mockRejectedValueOnce(new Error("db")).mockResolvedValue(undefined) });
    const r = await runHoldSweep(d);
    expect(r).toMatchObject({ expired: 1, failed: 1 });
  });
});
