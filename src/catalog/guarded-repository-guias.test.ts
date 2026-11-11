import { describe, it, expect } from "vitest";
import { createCityIndexRepo } from "./guarded-repository";

const fakeDb = (rows: Record<string, unknown>[]) => ({
  prepare: () => ({ bind: () => ({ all: async () => ({ results: rows }) }) }),
}) as never;

describe("REQ-1355: cityIndexInputs del sync blindado suma las guías del repo", () => {
  it("REQ-1355: la ciudad con guía en el repo llega con esa guía y sin la llave interna", async () => {
    const repo = createCityIndexRepo(fakeDb([
      { id: 1, slug: "paris", iso2: "fr", guide: null, activeTours: 2, indexableTours: 0, indexableSince: null, failingSince: null },
      { id: 2, slug: "lyon", iso2: "fr", guide: "de D1", activeTours: 1, indexableTours: 1, indexableSince: null, failingSince: null },
    ]), () => new Map([["fr/paris", "guía del repo"]]));
    const out = await repo.cityIndexInputs();
    expect(out).toEqual([
      { id: 1, guide: "guía del repo", activeTours: 2, indexableTours: 0, indexableSince: null, failingSince: null },
      { id: 2, guide: "de D1", activeTours: 1, indexableTours: 1, indexableSince: null, failingSince: null },
    ]);
  });
});
