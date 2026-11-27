import { describe, it, expect } from "vitest";
import { classifyHold, HOLD_NOTICE_DAYS, HOLD_EXPIRY_DAYS } from "./hold-notices";

const DAY = 86_400_000;
const heldAt = new Date("2026-11-10T12:00:00Z");
const at = (d: number) => new Date(heldAt.getTime() + d * DAY);

describe("classifyHold", () => {
  it("REQ-3484: antes del día 5 no hay nada que avisar", () => {
    expect(classifyHold(heldAt, at(0))).toEqual({ stage: "ok" });
    expect(classifyHold(heldAt, at(4.99))).toEqual({ stage: "ok" });
  });
  it("REQ-3484: del día 5 al 7 toca avisar y dice cuántos días quedan", () => {
    expect(HOLD_NOTICE_DAYS).toBe(5);
    expect(classifyHold(heldAt, at(5))).toEqual({ stage: "notice", daysLeft: 2 });
    expect(classifyHold(heldAt, at(6.5))).toEqual({ stage: "notice", daysLeft: 1 });
  });
  it("REQ-3484: desde el día 7 la retención venció", () => {
    expect(HOLD_EXPIRY_DAYS).toBe(7);
    expect(classifyHold(heldAt, at(7))).toEqual({ stage: "expired" });
    expect(classifyHold(heldAt, at(30))).toEqual({ stage: "expired" });
  });
  it("REQ-3484: una fecha inválida no avisa ni libera", () => {
    expect(classifyHold(new Date("x"), at(9))).toEqual({ stage: "ok" });
  });
});
