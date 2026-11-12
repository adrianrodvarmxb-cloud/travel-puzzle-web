import { describe, it, expect } from "vitest";
import { cityIndexInputsSql, overlayRepoGuides, planCityIndexing, type CityIndexRow } from "./indexing";

const base: CityIndexRow & { key: string | null } = { id: 7, key: "fr/paris", activeTours: 1, indexableTours: 0, guide: null, indexableSince: null, failingSince: null };

describe("REQ-1355: el sync blindado ve las guías de ciudad del repo", () => {
  it("REQ-1355: la consulta trae la llave país/ciudad de cada ciudad", () => {
    const q = cityIndexInputsSql([]);
    expect(q.sql).toContain('c."slug"');
    expect(q.sql).toContain('"iso2"');
  });
  it("REQ-1355: una ciudad sin guía en D1 pero con guía en el repo cumple la regla y no empieza failingSince", () => {
    const texto = "palabra ".repeat(400).trim();
    const rows = overlayRepoGuides([base], new Map([["fr/paris", texto]]));
    expect(rows[0].guide).toBe(texto);
    const now = new Date("2026-11-11T00:00:00Z");
    expect(planCityIndexing(rows, now)).toEqual([{ id: 7, indexableSince: now.toISOString(), failingSince: null }]);
    // sin la guía del repo, la ciudad no cumple y se marcaría failingSince
    expect(planCityIndexing([base], now)[0]?.failingSince).toBe(now.toISOString());
  });
  it("REQ-1355: sin guía en el repo, la fila queda igual (D1 manda)", () => {
    const withD1 = { ...base, guide: "guía de D1" };
    expect(overlayRepoGuides([withD1, { ...base, id: 8, key: null }], new Map())).toEqual([withD1, { ...base, id: 8, key: null }]);
  });
});
