import { describe, expect, it } from "vitest";
import { loadFirstPiece, type FirstPieceDeps } from "./load";

const record = { tourExternalId: 5, eventDate: "2026-12-10T10:00", eventUtcDate: "2026-12-10T15:00:00Z", adults: 2, children: 1, price: 0, phone: "+52 55 1234 5678" };
const deps = (over: Partial<FirstPieceDeps> = {}): FirstPieceDeps => ({
  view: async () => ({ status: "active", record }),
  summary: async () => ({ title: "Free tour Lima", cityName: "Lima", country: "PE", citySlug: "lima" }),
  ...over,
});

describe("Primera Pieza desde la reserva", () => {
  it("REQ-106 / REQ-180 / REQ-181 / REQ-183: una reserva activa da la pieza con fecha UTC y local, ciudad, país, viajero, precio y personas", async () => {
    expect(await loadFirstPiece("tok_12345678", deps())).toEqual({
      title: "Free tour Lima", date: "2026-12-10T15:00:00Z", cityName: "Lima", people: { adults: 2, children: 1 },
      localDate: "2026-12-10T10:00", country: "PE", cityCode: "lima", travelerCountry: "MX", price: 0,
    });
  });

  it("REQ-106: sin token, token raro, reserva cancelada o error → sin pieza (la página no se rompe)", async () => {
    expect(await loadFirstPiece(undefined, deps())).toBeNull();
    expect(await loadFirstPiece("../x", deps())).toBeNull();
    expect(await loadFirstPiece("tok_12345678", deps({ view: async () => ({ status: "cancelled", record }) }))).toBeNull();
    expect(await loadFirstPiece("tok_12345678", deps({ view: async () => { throw new Error("D1"); } }))).toBeNull();
  });
  it("REQ-181: sin país en el catálogo la pieza sigue (las reglas por país no aplican); el teléfono nunca sale de la pieza", async () => {
    const p = await loadFirstPiece("tok_12345678", deps({ summary: async () => ({ title: "T", cityName: "Lima" }) }));
    expect(p).toMatchObject({ country: null, cityCode: null });
    expect(JSON.stringify(p)).not.toContain("1234");
  });
});
