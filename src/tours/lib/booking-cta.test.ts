import { describe, it, expect } from "vitest";
import { bookingMode, advisorText, bookingCopy, priceText, crossSellSlot } from "./booking-cta";

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

describe("crossSellSlot", () => {
  it("REQ-009: la franja de transporte se muestra en los dos modos de reserva", () => {
    expect(crossSellSlot("advisor")).toBe("under-advisor");
    expect(crossSellSlot("calendar")).toBe("under-calendar");
  });
});

describe("REQ-10573: el panel de reserva no aplica reglas de FREETOUR a otros proveedores (INC-020)", () => {
  it("REQ-10573: FREETOUR sigue igual: calendario con reservas encendidas, política de pago de FREETOUR", async () => {
    const { sidebarPlan } = await import("./sidebar-plan");
    expect(sidebarPlan({ providerId: "freetour", bookingsEnabled: true, paidEnabled: true, price: 20 })).toEqual({ mode: "calendar", freetourPaidPolicy: true });
    expect(sidebarPlan({ providerId: "freetour", bookingsEnabled: false, paidEnabled: true, price: 20 })).toEqual({ mode: "advisor", freetourPaidPolicy: true });
    expect(sidebarPlan({ providerId: null, bookingsEnabled: true, paidEnabled: true, price: 20 })).toEqual({ mode: "calendar", freetourPaidPolicy: true });
  });
  it("REQ-10573: Tangol (o cualquier otro proveedor) se aparta con un asesor y sin el texto de euros y reembolso de FREETOUR, aunque las reservas estén encendidas", async () => {
    const { sidebarPlan } = await import("./sidebar-plan");
    expect(sidebarPlan({ providerId: "tangol", bookingsEnabled: true, paidEnabled: true, price: 450 })).toEqual({ mode: "advisor", freetourPaidPolicy: false });
    expect(sidebarPlan({ providerId: "otro", bookingsEnabled: true, paidEnabled: true, price: 10 })).toEqual({ mode: "advisor", freetourPaidPolicy: false });
  });
  it("REQ-10573: la ficha usa sidebarPlan y no pinta «No hay disponibilidad» a un proveedor sin calendario", async () => {
    const { readFileSync } = await import("node:fs");
    const client = readFileSync("src/components/tours/one/TourDetailClient.tsx", "utf8");
    expect(client).toContain("sidebarPlan(");
    expect(client).not.toMatch(/paidPolicy=\{paidEnabled \? paidPolicyConfirmed/);
    expect(client).not.toMatch(/mode=\{bookingMode\(bookingsEnabled\)\}/);
  });
});
