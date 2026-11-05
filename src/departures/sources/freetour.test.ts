import { describe, it, expect, vi } from "vitest";
import { parseFreetourEvents, freetourSource } from "./freetour";

// Forma grabada de GET /tours/{id}/events (la misma que ya usan reservas y edición).
const body = { data: [
  { id: 10, date: "2026-11-10 10:00", utcDate: "2026-11-10 09:00:00", language: "es" },
  { id: 11, date: "2026-11-10 16:00", utcDate: "2026-11-10 15:00:00", language: "en" },
] };

describe("REQ-049 adaptador Freetour", () => {
  it("REQ-049: convierte eventos en salidas (fecha local + idioma)", () => {
    expect(parseFreetourEvents(body)).toEqual([{ date: "2026-11-10", language: "es" }, { date: "2026-11-10", language: "en" }]);
  });
  it("REQ-049: acepta data.events y descarta eventos sin fecha o idioma", () => {
    expect(parseFreetourEvents({ data: { events: [{ id: 1, date: "2026-11-11 09:00", language: "fr" }, { id: 2, date: "", language: "es" }, { id: 3, date: "2026-11-12 09:00" }] } }))
      .toEqual([{ date: "2026-11-11", language: "fr" }]);
    expect(parseFreetourEvents(null)).toEqual([]);
  });
  it("REQ-049: la fuente pide /tours/{externalId}/events", async () => {
    const api = { get: vi.fn(async () => body) };
    expect(await freetourSource(api).list(6782)).toHaveLength(2);
    expect(api.get).toHaveBeenCalledWith("/tours/6782/events");
  });
});
