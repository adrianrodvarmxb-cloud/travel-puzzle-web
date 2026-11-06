import { describe, it, expect } from "vitest";
import { fixedRateFrom, eventNotice, BASE_FREE_NOTICE } from "./notice";

const rates = { USD: 18.2, EUR: 20.5, date: "2026-11-05" };
const free = { "1": 0, "2": 0, "3": 0, "4": 0 };
const fixedFrom7 = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 70, "8": 80 };
const fixedFrom3 = { "1": 0, "2": 0, "3": 45.5, "4": 50 };
const paid = { "1": 25, "2": 50, "3": 75 };

describe("REQ-096: aviso por evento con umbral calculado", () => {
  it("REQ-096: aviso base en free tours sin tarifa fija", () => {
    const n = eventNotice({ fullPricePerGroup: free, currency: "EUR", rates, lang: "es" });
    expect(BASE_FREE_NOTICE.es).toBe("Reservar es gratis; al final le das al guía lo que consideres justo. Cancelación gratis en cualquier momento.");
    expect(n.lines).toEqual([BASE_FREE_NOTICE.es]);
    expect(n.cancellationHours).toBeNull();
    expect(n.fixedFrom).toBeNull();
  });
  it("REQ-096: el umbral se calcula desde fullPricePerGroup por evento, nunca fijo en 5", () => {
    expect(fixedRateFrom(fixedFrom7)).toEqual({ n: 7, price: 70 });
    expect(fixedRateFrom(fixedFrom3)).toEqual({ n: 3, price: 45.5 });
    expect(fixedRateFrom(free)).toBeNull();
    expect(fixedRateFrom({ "10": 90, "2": 0, "9": 0 })).toEqual({ n: 10, price: 90 }); // llaves desordenadas
  });
  it("REQ-096: «Desde {n} adultos aplica tarifa fija de {precio} EUR (aprox. {MXN})» y cancelación 24 h", () => {
    const n = eventNotice({ fullPricePerGroup: fixedFrom7, currency: "EUR", rates, lang: "es" });
    expect(n.lines).toContain("Desde 7 adultos aplica tarifa fija de 70 EUR (aprox. MXN $1,435).");
    expect(n.lines).toContain("Cancelación con reembolso hasta 24 h antes.");
    expect(n.lines.join(" ")).not.toContain("en cualquier momento");
    expect(n.cancellationHours).toBe(24);
    const n3 = eventNotice({ fullPricePerGroup: fixedFrom3, currency: "EUR", rates, lang: "es" });
    expect(n3.lines).toContain("Desde 3 adultos aplica tarifa fija de 45.50 EUR (aprox. MXN $933).");
  });
  it("REQ-096: precio en EUR con la conversión a MXN marcada como aproximada; sin tipo de cambio, solo EUR", () => {
    const n = eventNotice({ fullPricePerGroup: fixedFrom7, currency: "EUR", rates: null, lang: "es" });
    expect(n.lines).toContain("Desde 7 adultos aplica tarifa fija de 70 EUR.");
    expect(n.lines.join(" ")).not.toContain("MXN");
  });
});

describe("REQ-097: tours de pago", () => {
  it("REQ-097: cancelación con reembolso hasta 24 h, sin texto de propina", () => {
    const n = eventNotice({ fullPricePerGroup: paid, payableNowPricePerGroup: paid, currency: "EUR", rates, lang: "es" });
    expect(n.lines).toEqual(["Cancelación con reembolso hasta 24 h antes."]);
    expect(n.cancellationHours).toBe(24);
    expect(n.payOnArrival).toBe(false);
    expect(n.lines.join(" ")).not.toMatch(/justo|propina|gratis/);
  });
  it("REQ-097: pago a la llegada cuando el evento no cobra nada al reservar", () => {
    const n = eventNotice({ fullPricePerGroup: paid, payableNowPricePerGroup: { "1": 0, "2": 0, "3": 0 }, currency: "EUR", rates, lang: "es" });
    expect(n.payOnArrival).toBe(true);
    expect(n.lines).toContain("Se paga en el punto de encuentro.");
  });
  it("REQ-097: en inglés", () => {
    const n = eventNotice({ fullPricePerGroup: paid, payableNowPricePerGroup: { "1": 0 }, currency: "EUR", rates, lang: "en" });
    expect(n.lines).toEqual(["Refundable cancellation up to 24 h before.", "You pay at the meeting point."]);
  });
});
