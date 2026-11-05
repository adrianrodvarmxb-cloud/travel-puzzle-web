import { describe, it, expect } from "vitest";
import { readPage, checkRun, MAX_DROP } from "./sanity";

const tour = (id: number) => ({ id, cityId: 1, countryId: 1 });

describe("readPage (barrera por página)", () => {
  it("REQ-071: una página válida devuelve sus tours y el total de páginas", () => {
    const res = readPage({ data: { tours: [tour(1), tour(2)], totalPages: 3 } });
    expect(res).toEqual({ ok: true, tours: [tour(1), tour(2)], totalPages: 3, dropped: 0 });
  });

  it("REQ-071: feed vacío (sin tours o totalPages = 0) aborta", () => {
    expect(readPage({ data: { tours: [], totalPages: 3 } })).toMatchObject({ ok: false, reason: "empty" });
    expect(readPage({ data: { tours: [tour(1)], totalPages: 0 } })).toMatchObject({ ok: false, reason: "empty" });
  });

  it("REQ-071: respuesta con forma inválida aborta", () => {
    expect(readPage(null)).toMatchObject({ ok: false, reason: "malformed" });
    expect(readPage({ data: { tours: "x", totalPages: 1 } })).toMatchObject({ ok: false, reason: "malformed" });
    expect(readPage({ data: { tours: [tour(1)] } })).toMatchObject({ ok: false, reason: "malformed" });
  });

  it("REQ-071: un registro sin id numérico se descarta y se cuenta, no tumba la página", () => {
    const res = readPage({ data: { tours: [tour(1), { id: "x" }, null], totalPages: 1 } });
    expect(res).toEqual({ ok: true, tours: [tour(1)], totalPages: 1, dropped: 2 });
  });
});

describe("checkRun (barrera al cierre)", () => {
  it("REQ-071: el umbral es 20 %", () => {
    expect(MAX_DROP).toBe(0.2);
  });

  it("REQ-071: cero tours vistos aborta", () => {
    expect(checkRun({ seen: 0, baseline: 0 })).toMatchObject({ ok: false, reason: "empty" });
  });

  it("REQ-071: más de 20 % menos que la última corrida exitosa aborta", () => {
    expect(checkRun({ seen: 7999, baseline: 10000 })).toMatchObject({ ok: false, reason: "drop" });
  });

  it("REQ-071: exactamente 20 % menos, o más tours, pasa", () => {
    expect(checkRun({ seen: 8000, baseline: 10000 })).toEqual({ ok: true });
    expect(checkRun({ seen: 12000, baseline: 10000 })).toEqual({ ok: true });
  });

  it("REQ-071: sin línea base (primera corrida) basta con que haya tours", () => {
    expect(checkRun({ seen: 5, baseline: 0 })).toEqual({ ok: true });
  });
});
