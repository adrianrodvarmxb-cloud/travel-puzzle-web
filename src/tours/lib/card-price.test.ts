import { describe, it, expect } from "vitest";
import { cardPrice } from "./price-label";

const rates = { USD: 18.5, EUR: 20.37, date: "05/11/2026" };

describe("REQ-170: tarjetas de la lista de ciudad con EUR y MXN aproximado", () => {
  it("REQ-170: tour de pago: «Desde EUR €25» y «aprox. MXN $510»", () => {
    expect(cardPrice({ kind: "paid", isFreeTour: false, price: 25, currency: "EUR" }, rates)).toEqual({ main: "Desde EUR €25", approx: "aprox. MXN $510" });
  });
  it("REQ-170: sin tipo de cambio, solo EUR", () => {
    expect(cardPrice({ kind: "paid", isFreeTour: false, price: 25, currency: "EUR" }, null)).toEqual({ main: "Desde EUR €25", approx: null });
  });
  it("REQ-170: free tour y viaje propio quedan como hoy", () => {
    expect(cardPrice({ kind: "free", isFreeTour: true, price: 0, currency: "EUR" }, rates)).toEqual({ main: "Gratis", approx: null });
    expect(cardPrice({ kind: "own", isFreeTour: false, price: 0, currency: "MXN", priceLabel: "Desde MXN $9,900" }, rates)).toEqual({ main: "Desde MXN $9,900", approx: null });
    expect(cardPrice({ kind: "own", isFreeTour: false, price: 0, currency: "MXN" }, rates)).toEqual({ main: "A cotizar", approx: null });
  });
});
