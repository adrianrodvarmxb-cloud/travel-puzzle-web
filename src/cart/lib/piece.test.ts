import { describe, expect, it } from "vitest";
import { pieceCost, pieceDay, pieceWhen, travelerCountryFromPhone } from "./piece";

describe("Primera Pieza: fecha, costo y viajero", () => {
  it("REQ-180: la fecha y la hora salen en la zona de la ciudad del tour (date de FREETOUR), no en UTC", () => {
    // Tour en CDMX el 20 nov a las 19:00 (01:00 UTC del 21 nov).
    expect(pieceWhen("2026-11-20 19:00:00", "2026-11-21 01:00:00")).toBe("20 nov 2026, 19:00");
    expect(pieceWhen("2026-11-20T19:00", "2026-11-21T01:00:00Z")).toBe("20 nov 2026, 19:00");
    expect(pieceDay("2026-11-20 19:00:00", "2026-11-21 01:00:00")).toBe("2026-11-20");
  });

  it("REQ-180: sin hora local se muestra solo el día UTC (sin inventar hora); sin fechas, nada", () => {
    expect(pieceWhen(null, "2026-11-21T01:00:00Z")).toBe("21 nov 2026");
    expect(pieceDay(null, "2026-11-21T01:00:00Z")).toBe("2026-11-21");
    expect(pieceWhen(null, null)).toBeNull();
    expect(pieceDay("basura", null)).toBeNull();
  });

  it("REQ-183: costo 0 solo si la reserva no quedó con tarifa fija (precio del grupo desde fullPricePerGroup)", () => {
    expect(pieceCost(0, null)).toBe("Costo 0");
    expect(pieceCost(40, { main: "€40.00", approx: "aprox. MXN $841" })).toBe("Tarifa fija del grupo: €40.00 (aprox. MXN $841)");
    expect(pieceCost(40, { main: "€40.00", approx: null })).toBe("Tarifa fija del grupo: €40.00");
    // Sin etiqueta calculada nunca dice «Costo 0» si hubo precio.
    expect(pieceCost(40, null)).toBe("Tarifa fija del grupo: EUR 40");
  });

  it("REQ-181: el país del viajero sale del prefijo internacional del teléfono de la reserva; si no es claro, se desconoce", () => {
    expect(travelerCountryFromPhone("+52 55 1234 5678")).toBe("MX");
    expect(travelerCountryFromPhone("0052 55 1234 5678")).toBe("MX");
    expect(travelerCountryFromPhone("+51 912 345 678")).toBe("PE");
    expect(travelerCountryFromPhone("+1 415 555 0101")).toBeNull(); // EE. UU. y Canadá comparten prefijo
    expect(travelerCountryFromPhone("55 1234 5678")).toBeNull(); // sin prefijo no se adivina
    expect(travelerCountryFromPhone(null)).toBeNull();
  });
});
