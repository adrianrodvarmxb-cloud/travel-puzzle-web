import { describe, it, expect } from "vitest";
import { planSyncStep, mexicoDay } from "./sync-plan";

// 2026-10-30 09:00 UTC = 3:00 a. m. en Ciudad de México
const at = (iso: string) => new Date(iso);

describe("mexicoDay", () => {
  it("usa el día de Ciudad de México (UTC-6)", () => {
    expect(mexicoDay(at("2026-10-30T05:59:00Z"))).toBe("2026-10-29");
    expect(mexicoDay(at("2026-10-30T06:00:00Z"))).toBe("2026-10-30");
  });
});

describe("planSyncStep", () => {
  const now = at("2026-10-30T09:00:00Z");

  it("sin corrida previa: arranca en la página 1", () => {
    expect(planSyncStep(null, now)).toEqual({ action: "start", page: 1 });
  });

  it("si la última corrida es de otro día: arranca de nuevo", () => {
    const state = { status: "completed", nextPage: 82, totalPages: 81, runStartedAt: at("2026-10-29T09:00:00Z") };
    expect(planSyncStep(state, now)).toEqual({ action: "start", page: 1 });
  });

  it("corrida del día en curso: sigue con la siguiente página", () => {
    const state = { status: "in_progress", nextPage: 7, totalPages: 81, runStartedAt: at("2026-10-30T09:00:00Z") };
    expect(planSyncStep(state, at("2026-10-30T09:06:00Z"))).toEqual({ action: "page", page: 7 });
  });

  it("ya pasó la última página: cierra la corrida", () => {
    const state = { status: "in_progress", nextPage: 82, totalPages: 81, runStartedAt: at("2026-10-30T09:00:00Z") };
    expect(planSyncStep(state, at("2026-10-30T10:30:00Z"))).toEqual({ action: "finish" });
  });

  it("corrida del día ya completada: no hace nada", () => {
    const state = { status: "completed", nextPage: 82, totalPages: 81, runStartedAt: at("2026-10-30T09:00:00Z") };
    expect(planSyncStep(state, at("2026-10-30T10:40:00Z"))).toEqual({ action: "idle" });
  });

  it("una página que falló se reintenta en la siguiente ejecución", () => {
    const state = { status: "failed", nextPage: 12, totalPages: 81, runStartedAt: at("2026-10-30T09:00:00Z") };
    expect(planSyncStep(state, at("2026-10-30T09:20:00Z"))).toEqual({ action: "page", page: 12 });
  });
});
