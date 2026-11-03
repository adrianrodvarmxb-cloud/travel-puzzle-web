import { describe, it, expect } from "vitest";
import { bookingMode, advisorText, bookingCopy, priceText } from "./booking-cta";

describe("llamado a reservar en la ficha del tour", () => {
  it("con reservas apagadas se aparta con un asesor; encendidas, calendario", () => {
    expect(bookingMode(false)).toBe("advisor");
    expect(bookingMode(true)).toBe("calendar");
  });

  it("mensaje de WhatsApp con el nombre del tour, en el idioma del visitante", () => {
    expect(advisorText("Free Tour de Budapest", "es")).toBe("Hola Travel Puzzle, quiero apartar el tour «Free Tour de Budapest».");
    expect(advisorText("Free Tour of Budapest", "en")).toBe("Hi Travel Puzzle, I'd like to book the tour «Free Tour of Budapest».");
    expect(advisorText("  ", "es")).toBe("Hola Travel Puzzle, quiero apartar un tour.");
  });

  it("textos en español por defecto e inglés para el resto", () => {
    expect(bookingCopy("es").advisorTitle).toBe("Apártalo con un asesor");
    expect(bookingCopy("es").advisorCta).toBe("Hablar con un asesor");
    expect(bookingCopy("es").barCta("advisor")).toBe("Apartar con un asesor");
    expect(bookingCopy("es").barCta("calendar")).toBe("Reservar");
    expect(bookingCopy("fr").advisorCta).toBe("Talk to an advisor");
  });

  it("precio: gratis o moneda y monto", () => {
    expect(priceText(0, "EUR", "Gratis")).toBe("Gratis");
    expect(priceText(16, "EUR", "Gratis")).toBe("EUR 16");
  });
});
