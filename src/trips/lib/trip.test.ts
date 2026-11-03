import { describe, it, expect } from "vitest";
import { slugify, normalizeDates, missingToPublish, MAX_TIMES_PER_DAY, type TripDraft } from "./trip";

const base: TripDraft = {
  code: "FCHTP", kind: "circuito", purchaseMode: "quote", titleEs: "China Maravillosa",
  countries: ["China"], priceFrom: 2490, currency: "USD",
  images: [{ key: "trips/a.jpg", alt: "Muralla" }],
};

describe("slugify", () => {
  it("título + código, sin acentos ni signos", () => {
    expect(slugify("Ruta Australia ¡Cosmopolita!", "PATP")).toBe("ruta-australia-cosmopolita-patp");
    expect(slugify("Japón Esencial", "JP-01")).toBe("japon-esencial-jp-01");
  });
});

describe("normalizeDates", () => {
  it("ordena fechas y horarios, quita repetidos", () => {
    expect(normalizeDates([{ date: "2027-03-02", times: ["18:00", "09:00", "09:00"] }, { date: "2027-03-01", times: [] }])).toEqual({
      ok: true,
      dates: [{ date: "2027-03-01", times: [] }, { date: "2027-03-02", times: ["09:00", "18:00"] }],
    });
  });
  it(`máximo ${MAX_TIMES_PER_DAY} horarios por día`, () => {
    const r = normalizeDates([{ date: "2027-03-01", times: ["08:00", "10:00", "12:00", "14:00", "16:00"] }]);
    expect(r).toEqual({ ok: false, error: "Máximo 4 horarios el 2027-03-01" });
  });
  it("fecha u hora inválida", () => {
    expect(normalizeDates([{ date: "2027-13-01", times: [] }]).ok).toBe(false);
    expect(normalizeDates([{ date: "2027-03-01", times: ["25:00"] }]).ok).toBe(false);
  });
  it("la misma fecha dos veces se junta", () => {
    expect(normalizeDates([{ date: "2027-03-01", times: ["09:00"] }, { date: "2027-03-01", times: ["12:00"] }])).toEqual({
      ok: true, dates: [{ date: "2027-03-01", times: ["09:00", "12:00"] }],
    });
  });
});

describe("missingToPublish", () => {
  it("completo: nada falta", () => {
    expect(missingToPublish(base)).toEqual([]);
  });
  it("dice qué falta", () => {
    expect(missingToPublish({ ...base, titleEs: " ", countries: [], images: [], priceFrom: null })).toEqual(["título", "al menos un país", "al menos una foto", "precio desde"]);
  });
  it("personalizado no necesita precio", () => {
    expect(missingToPublish({ ...base, kind: "personalizado", priceFrom: null })).toEqual([]);
  });
});
