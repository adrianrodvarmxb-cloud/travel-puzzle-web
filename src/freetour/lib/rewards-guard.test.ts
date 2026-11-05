import { describe, it, expect } from "vitest";
import { isRewardEligible, filterRewardable, assertNoFreetourReward, FreetourRewardError, type RewardCandidate } from "./rewards-guard";

const triggers = ["booking", "attendance", "review"] as const;

describe("REQ-082 sin premios por FREETOUR", () => {
  it("REQ-082: ninguna reserva, asistencia ni reseña de FREETOUR genera premio, pieza ni descuento", () => {
    for (const trigger of triggers) {
      for (const reward of ["prize", "piece", "discount"] as const) {
        expect(isRewardEligible({ trigger, reward, source: "freetour" })).toBe(false);
      }
    }
  });

  it("REQ-082: sin origen declarado no hay premio (falla cerrada)", () => {
    expect(isRewardEligible({ trigger: "booking", reward: "piece" })).toBe(false);
  });

  it("REQ-082: un número de reserva con formato de FREETOUR nunca premia, aunque diga otro origen", () => {
    expect(isRewardEligible({ trigger: "attendance", reward: "piece", source: "own", refNumber: "6782-20261030162746-244" })).toBe(false);
  });

  it("REQ-082: los productos que no son de FREETOUR sí pueden premiar", () => {
    expect(isRewardEligible({ trigger: "booking", reward: "piece", source: "own" })).toBe(true);
    expect(isRewardEligible({ trigger: "review", reward: "discount", source: "affiliate" })).toBe(true);
  });

  it("REQ-082: filterRewardable descarta todo lo de FREETOUR", () => {
    const list: RewardCandidate[] = [
      { trigger: "booking", reward: "piece", source: "freetour" },
      { trigger: "booking", reward: "piece", source: "own" },
      { trigger: "review", reward: "discount" },
    ];
    expect(filterRewardable(list)).toEqual([{ trigger: "booking", reward: "piece", source: "own" }]);
  });

  it("REQ-082: assertNoFreetourReward detiene cualquier intento de premiar FREETOUR", () => {
    expect(() => assertNoFreetourReward({ trigger: "review", reward: "prize", source: "freetour" })).toThrow(FreetourRewardError);
    expect(() => assertNoFreetourReward({ trigger: "review", reward: "prize", source: "own" })).not.toThrow();
  });
});
