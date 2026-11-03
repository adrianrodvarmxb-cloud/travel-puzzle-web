import { describe, it, expect } from "vitest";
import { tripInputSchema } from "./trip";

const ok = {
  code: "fchtp", kind: "circuito", purchaseMode: "quote", titleEs: "China Maravillosa",
  countries: ["China"], cities: ["Pekín", "Shanghái"], durationDays: 12, priceFrom: 2490, currency: "USD",
  dates: [{ date: "2027-03-01", times: ["09:00"] }], meetingPoints: [{ name: "Aeropuerto", address: "PEK" }],
  hotelPickup: true, itinerary: [{ title: "Llegada", text: "Traslado al hotel" }], includes: ["Hoteles 4*"], excludes: ["Vuelos"],
  images: [{ key: "trips/1-a.jpg", alt: "" }],
};

describe("tripInputSchema", () => {
  it("acepta un viaje completo y pone el código en mayúsculas", () => {
    const r = tripInputSchema.parse(ok);
    expect(r.code).toBe("FCHTP");
    expect(r.agencyId).toBeNull();
  });
  it("rechaza tipo, moneda o precio inválidos", () => {
    expect(tripInputSchema.safeParse({ ...ok, kind: "crucero" }).success).toBe(false);
    expect(tripInputSchema.safeParse({ ...ok, currency: "JPY" }).success).toBe(false);
    expect(tripInputSchema.safeParse({ ...ok, priceFrom: -1 }).success).toBe(false);
  });
  it("máximo 4 puntos de encuentro y fotos solo de nuestro almacén", () => {
    const mp = { name: "x", address: "y" };
    expect(tripInputSchema.safeParse({ ...ok, meetingPoints: [mp, mp, mp, mp, mp] }).success).toBe(false);
    expect(tripInputSchema.safeParse({ ...ok, images: [{ key: "../etc/passwd", alt: "" }] }).success).toBe(false);
  });
  it("un borrador puede ir casi vacío", () => {
    expect(tripInputSchema.safeParse({ code: "X1", kind: "tour", purchaseMode: "quote", titleEs: "Borrador" }).success).toBe(true);
  });
});
