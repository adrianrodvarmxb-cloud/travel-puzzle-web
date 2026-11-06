import { describe, expect, it } from "vitest";
import {
  addRateByCategory, duplicateSlugs, evaluateMetrics, hoursSinceLastSuccess, indexingChanges, METRIC_TARGETS,
  pctToursWithValidCity, syncSuccessRate,
} from "./metrics";
import { createCarouselEvent } from "@/companions/lib/events";

const NOW = Date.parse("2026-12-01T12:00:00Z");
const h = (hours: number) => new Date(NOW - hours * 3_600_000).toISOString();

describe("Métricas La Primera Pieza", () => {
  it("REQ-111: % de tours con ciudad válida", () => {
    const valid = new Set(["c1", "c2"]);
    expect(pctToursWithValidCity([{ cityId: "c1" }, { cityId: "c2" }, { cityId: null }, { cityId: "zz" }], valid)).toBe(50);
    expect(pctToursWithValidCity([], valid)).toBe(100);
  });

  it("REQ-111: slugs duplicados (ignora vacíos y mayúsculas)", () => {
    expect(duplicateSlugs(["a", "b", "A", null, "", "c", "b"])).toEqual(["a", "b"]);
    expect(duplicateSlugs(["a", "b"])).toEqual([]);
  });

  it("REQ-111: horas desde el último sync exitoso", () => {
    const runs = [{ status: "success" as const, finishedAt: h(30) }, { status: "success" as const, finishedAt: h(5) }, { status: "failed" as const, finishedAt: h(1) }];
    expect(hoursSinceLastSuccess(runs, NOW)).toBe(5);
    expect(hoursSinceLastSuccess([{ status: "failed", finishedAt: h(1) }], NOW)).toBeNull();
  });

  it("REQ-111: tasa de éxito del sync en 30 días", () => {
    const runs = [
      { status: "success" as const, finishedAt: h(24) }, { status: "success" as const, finishedAt: h(48) },
      { status: "failed" as const, finishedAt: h(72) }, { status: "aborted" as const, finishedAt: h(96) },
      { status: "failed" as const, finishedAt: h(24 * 40) },
    ];
    expect(syncSuccessRate(runs, NOW)).toBe(50);
    expect(syncSuccessRate([], NOW)).toBeNull();
  });

  it("REQ-111: ciudades que cambian de indexación en la semana", () => {
    expect(indexingChanges({ lima: true, cusco: false, quito: true }, { lima: true, cusco: true, quito: false, puno: true })).toEqual(["cusco", "puno", "quito"]);
  });

  it("REQ-111: tasa de agregado del carrusel por categoría", () => {
    const at = h(1);
    const evs = [
      ...Array.from({ length: 4 }, () => createCarouselEvent("card_viewed", { type: "esim", cityCode: "pe-cusco" }, at)),
      createCarouselEvent("card_added", { type: "esim", cityCode: "pe-cusco" }, at),
      createCarouselEvent("card_added", { type: "tour", cityCode: "pe-cusco" }, at),
    ];
    expect(addRateByCategory(evs)).toEqual({ esim: 25, tour: null });
  });

  it("REQ-111: compara contra las metas firmadas (gate 5)", () => {
    expect(METRIC_TARGETS).toEqual({ validCityPct: 98, duplicateSlugs: 0, hoursSinceSync: 26, syncSuccessPct: 95, indexingChangesPerWeek: 5 });
    expect(evaluateMetrics({ validCityPct: 98, duplicateSlugs: 0, hoursSinceSync: 25.9, syncSuccessPct: 95, indexingChangesPerWeek: 5 }))
      .toEqual({ validCityPct: true, duplicateSlugs: true, hoursSinceSync: true, syncSuccessPct: true, indexingChangesPerWeek: true });
    expect(evaluateMetrics({ validCityPct: 97.9, duplicateSlugs: 1, hoursSinceSync: 26, syncSuccessPct: 94, indexingChangesPerWeek: 6 }))
      .toEqual({ validCityPct: false, duplicateSlugs: false, hoursSinceSync: false, syncSuccessPct: false, indexingChangesPerWeek: false });
    expect(evaluateMetrics({ validCityPct: 99, duplicateSlugs: 0, hoursSinceSync: null, syncSuccessPct: null, indexingChangesPerWeek: 0 }).hoursSinceSync).toBe(false);
  });
});
