import { describe, it, expect } from "vitest";
import { tripInputSchema } from "./trip";

const ok = {
  kind: "tour", purchaseMode: "quote", titleEs: "Tour por Oaxaca", countries: ["MX"], durationDays: 1, currency: "MXN",
  options: [{ id: "a", name: "Grupo", adult: 900, child: 600 }],
  availability: { weekdays: [1, 3, 5], slots: [{ time: "09:00", capacity: 12 }] },
  meetingPoints: [{ name: "Zócalo", lat: 17.06, lng: -96.72 }],
  images: [{ key: "trips/1-a.jpg" }],
};

describe("tripInputSchema v2", () => {
  it("acepta un viaje completo con defaults", () => {
    const r = tripInputSchema.parse(ok);
    expect(r.agencyId).toBeNull();
    expect(r.options[0]).toMatchObject({ mode: "group", childAgeMin: 3, childAgeMax: 11, infant: null });
    expect(r.cancellation).toEqual({ type: "standard", tiers: [] });
    expect(r.minNoticeHours).toBe(24);
  });
  it("países solo con código ISO", () => {
    expect(tripInputSchema.safeParse({ ...ok, countries: ["México"] }).success).toBe(false);
  });
  it("máximo 8 horarios, 8 puntos, 4 opciones y 5 destacados", () => {
    const slots = Array.from({ length: 9 }, (_, i) => ({ time: `1${i}:00` }));
    expect(tripInputSchema.safeParse({ ...ok, availability: { slots } }).success).toBe(false);
    const op = ok.options[0];
    expect(tripInputSchema.safeParse({ ...ok, options: [op, op, op, op, op] }).success).toBe(false);
    expect(tripInputSchema.safeParse({ ...ok, highlights: ["a", "b", "c", "d", "e", "f"] }).success).toBe(false);
  });
  it("reglas cruzadas: cupo, edades y temporadas", () => {
    expect(tripInputSchema.safeParse({ ...ok, minPax: 10, maxPax: 2 }).success).toBe(false);
    expect(tripInputSchema.safeParse({ ...ok, options: [{ ...ok.options[0], childAgeMin: 12, childAgeMax: 5 }] }).success).toBe(false);
    expect(tripInputSchema.safeParse({ ...ok, availability: { seasons: [{ name: "x", from: "2027-08-01", to: "2027-06-01", supplement: 1 }] } }).success).toBe(false);
  });
  it("video solo https y fotos solo de nuestro almacén", () => {
    expect(tripInputSchema.safeParse({ ...ok, videoUrl: "http://x.com/v" }).success).toBe(false);
    expect(tripInputSchema.safeParse({ ...ok, images: [{ key: "../x" }] }).success).toBe(false);
  });
});
