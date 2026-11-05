import { describe, it, expect } from "vitest";
import { planGuardedStep, isSyncGuardEnabled, syncHealth, ALERT_AFTER_HOURS, type RunState } from "./guard-plan";

// 9:00 UTC = 3:00 CDMX
const now = new Date("2026-11-05T10:00:00Z");
const run = (over: Partial<RunState> = {}): RunState => ({
  id: "r1", status: "staging", startedAt: new Date("2026-11-05T09:01:00Z"), nextPage: 1, totalPages: 0,
  failures: 0, notBefore: null, publishCursor: 0, baseline: 0, abortReason: null, ...over,
});

describe("isSyncGuardEnabled", () => {
  it("REQ-071: solo se enciende con el texto exacto \"true\"", () => {
    expect(isSyncGuardEnabled("true")).toBe(true);
    expect(isSyncGuardEnabled("false")).toBe(false);
    expect(isSyncGuardEnabled(undefined)).toBe(false);
    expect(isSyncGuardEnabled("TRUE")).toBe(false);
  });
});

describe("planGuardedStep", () => {
  it("REQ-072: sin corridas arranca", () => {
    expect(planGuardedStep(null, now)).toEqual({ action: "start" });
  });

  it("REQ-072: en staging lee la siguiente página y al pasar la última cierra", () => {
    expect(planGuardedStep(run({ nextPage: 4, totalPages: 81 }), now)).toEqual({ action: "page", page: 4 });
    expect(planGuardedStep(run({ nextPage: 82, totalPages: 81 }), now)).toEqual({ action: "close" });
  });

  it("REQ-077: respeta notBefore (429 / espera tras error)", () => {
    const until = new Date(now.getTime() + 60_000);
    expect(planGuardedStep(run({ nextPage: 4, totalPages: 81, notBefore: until }), now)).toEqual({ action: "wait", until });
    expect(planGuardedStep(run({ nextPage: 4, totalPages: 81, notBefore: now }), now)).toEqual({ action: "page", page: 4 });
  });

  it("REQ-072: publicando sigue publicando aunque cambie el día", () => {
    expect(planGuardedStep(run({ status: "publishing", startedAt: new Date("2026-11-04T09:01:00Z") }), now)).toEqual({ action: "publish" });
  });

  it("REQ-072: terminada o abortada hoy no hace nada; al día siguiente desde las 3:00 arranca otra", () => {
    expect(planGuardedStep(run({ status: "succeeded" }), now)).toEqual({ action: "idle" });
    expect(planGuardedStep(run({ status: "aborted" }), now)).toEqual({ action: "idle" });
    const yesterday = new Date("2026-11-04T09:01:00Z");
    expect(planGuardedStep(run({ status: "succeeded", startedAt: yesterday }), now)).toEqual({ action: "start" });
    expect(planGuardedStep(run({ status: "aborted", startedAt: yesterday }), now)).toEqual({ action: "start" });
    // 2:59 CDMX del día siguiente: todavía no
    expect(planGuardedStep(run({ status: "succeeded", startedAt: yesterday }), new Date("2026-11-05T08:59:00Z"))).toEqual({ action: "idle" });
  });

  it("REQ-072: una corrida en staging de ayer se reemplaza por la del día después de las 3:00", () => {
    const old = run({ nextPage: 30, totalPages: 81, startedAt: new Date("2026-11-04T09:01:00Z") });
    expect(planGuardedStep(old, now)).toEqual({ action: "start" });
    expect(planGuardedStep(old, new Date("2026-11-05T08:00:00Z"))).toEqual({ action: "page", page: 30 });
  });
});

describe("syncHealth", () => {
  it("REQ-078: horas desde el último sync exitoso y alerta después de 26 h", () => {
    expect(ALERT_AFTER_HOURS).toBe(26);
    const ok = syncHealth(new Date("2026-11-04T10:00:00Z"), now);
    expect(ok).toEqual({ lastSuccessAt: "2026-11-04T10:00:00.000Z", hoursSinceLastSuccess: 24, alert: false });
    expect(syncHealth(new Date("2026-11-04T07:59:00Z"), now)).toMatchObject({ alert: true });
    expect(syncHealth(new Date("2026-11-04T08:00:00Z"), now)).toMatchObject({ hoursSinceLastSuccess: 26, alert: false });
  });

  it("REQ-078: sin ningún sync exitoso registrado, alerta", () => {
    expect(syncHealth(null, now)).toEqual({ lastSuccessAt: null, hoursSinceLastSuccess: null, alert: true });
  });
});
