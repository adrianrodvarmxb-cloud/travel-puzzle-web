import { describe, expect, it } from "vitest";
import { loadFirstPiece, type FirstPieceDeps } from "./load";

const record = { tourExternalId: 5, eventDate: "2026-12-10T10:00", eventUtcDate: "2026-12-10T15:00:00Z", adults: 2, children: 1 };
const deps = (over: Partial<FirstPieceDeps> = {}): FirstPieceDeps => ({
  view: async () => ({ status: "active", record }),
  summary: async () => ({ title: "Free tour Lima", cityName: "Lima" }),
  ...over,
});

describe("Primera Pieza desde la reserva", () => {
  it("REQ-106: una reserva activa da la pieza con fecha UTC, ciudad y personas", async () => {
    expect(await loadFirstPiece("tok_12345678", deps())).toEqual({
      title: "Free tour Lima", date: "2026-12-10T15:00:00Z", cityName: "Lima", people: { adults: 2, children: 1 },
    });
  });

  it("REQ-106: sin token, token raro, reserva cancelada o error → sin pieza (la página no se rompe)", async () => {
    expect(await loadFirstPiece(undefined, deps())).toBeNull();
    expect(await loadFirstPiece("../x", deps())).toBeNull();
    expect(await loadFirstPiece("tok_12345678", deps({ view: async () => ({ status: "cancelled", record }) }))).toBeNull();
    expect(await loadFirstPiece("tok_12345678", deps({ view: async () => { throw new Error("D1"); } }))).toBeNull();
  });
});
