import { describe, it, expect } from "vitest";
import { nextPresence, presenceTransitions, REMOVE_AFTER_RUNS, type Presence } from "./presence";

describe("nextPresence", () => {
  it("REQ-074: se elimina tras 3 corridas exitosas sin el tour", () => {
    expect(REMOVE_AFTER_RUNS).toBe(3);
    let s: Presence = { syncStatus: "active", missingRuns: 0 };
    s = nextPresence(s, false);
    expect(s).toEqual({ syncStatus: "missing", missingRuns: 1 });
    s = nextPresence(s, false);
    expect(s).toEqual({ syncStatus: "missing", missingRuns: 2 });
    s = nextPresence(s, false);
    expect(s).toEqual({ syncStatus: "removed", missingRuns: 3 });
    expect(nextPresence(s, false)).toEqual({ syncStatus: "removed", missingRuns: 3 });
  });

  it("REQ-074: si reaparece vuelve a active desde missing o removed", () => {
    expect(nextPresence({ syncStatus: "missing", missingRuns: 2 }, true)).toEqual({ syncStatus: "active", missingRuns: 0 });
    expect(nextPresence({ syncStatus: "removed", missingRuns: 3 }, true)).toEqual({ syncStatus: "active", missingRuns: 0 });
    expect(nextPresence({ syncStatus: "active", missingRuns: 0 }, true)).toEqual({ syncStatus: "active", missingRuns: 0 });
  });
});

describe("presenceTransitions", () => {
  it("REQ-074: solo devuelve las filas que cambian y cuenta missing, removed y reactivated", () => {
    const { updates, counts } = presenceTransitions([
      { externalId: 1, syncStatus: "active", missingRuns: 0, isActive: true, seen: true },
      { externalId: 2, syncStatus: "active", missingRuns: 0, isActive: true, seen: false },
      { externalId: 3, syncStatus: "missing", missingRuns: 2, isActive: true, seen: false },
      { externalId: 4, syncStatus: "missing", missingRuns: 1, isActive: true, seen: true },
      { externalId: 5, syncStatus: "removed", missingRuns: 3, isActive: false, seen: false },
    ]);
    expect(updates).toEqual([
      { externalId: 2, syncStatus: "missing", missingRuns: 1, isActive: true },
      { externalId: 3, syncStatus: "removed", missingRuns: 3, isActive: false },
      { externalId: 4, syncStatus: "active", missingRuns: 0, isActive: true },
    ]);
    expect(counts).toEqual({ missing: 1, removed: 1, reactivated: 1 });
  });

  it("REQ-074: un tour desactivado por el sync anterior (isActive = false) cuenta como removed; si reaparece se reactiva", () => {
    const { updates, counts } = presenceTransitions([
      { externalId: 7, syncStatus: "active", missingRuns: 0, isActive: false, seen: false },
      { externalId: 8, syncStatus: "active", missingRuns: 0, isActive: false, seen: true },
    ]);
    expect(updates).toEqual([{ externalId: 8, syncStatus: "active", missingRuns: 0, isActive: true }]);
    expect(counts).toEqual({ missing: 0, removed: 0, reactivated: 1 });
  });

  it("REQ-074: con todo estable no hay escrituras", () => {
    const { updates } = presenceTransitions([
      { externalId: 1, syncStatus: "active", missingRuns: 0, isActive: true, seen: true },
      { externalId: 5, syncStatus: "removed", missingRuns: 3, isActive: false, seen: false },
    ]);
    expect(updates).toEqual([]);
  });
});
