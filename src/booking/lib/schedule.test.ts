import { describe, it, expect } from "vitest";
import { dueEmails, durationMinutes } from "./schedule";

// Tour en CDMX (UTC-6): 2 nov 2026 10:00 local = 16:00 UTC
const b = { eventDate: "2026-11-02 10:00:00", eventUtcDate: "2026-11-02 16:00:00" };
const at = (iso: string) => new Date(iso);

describe("cuándo toca cada correo", () => {
  it("recordatorio entre 48 y 24 h antes", () => {
    expect(dueEmails(b, at("2026-10-31T15:59:00Z"))).toEqual([]);
    expect(dueEmails(b, at("2026-10-31T16:00:00Z"))).toEqual(["reminder48"]);
    expect(dueEmails(b, at("2026-11-01T16:00:00Z"))).toEqual([]);
  });
  it("el día del tour a las 7:00 hora local", () => {
    expect(dueEmails(b, at("2026-11-02T12:59:00Z"))).toEqual([]); // 6:59 local
    expect(dueEmails(b, at("2026-11-02T13:00:00Z"))).toEqual(["dayOf"]); // 7:00 local
    expect(dueEmails(b, at("2026-11-02T16:00:00Z"))).toEqual([]); // ya empezó
  });
  it("tour temprano: la noche anterior a las 19:00 local", () => {
    const early = { eventDate: "2026-11-02 08:00:00", eventUtcDate: "2026-11-02 14:00:00" };
    expect(dueEmails(early, at("2026-11-02T00:59:00Z"))).toEqual([]); // 18:59 del 1 nov
    expect(dueEmails(early, at("2026-11-02T01:00:00Z"))).toEqual(["dayOf"]); // 19:00 del 1 nov
  });
  it("reseña 1 h después de terminar, durante 2 días", () => {
    expect(dueEmails(b, at("2026-11-02T18:59:00Z"), "2:00")).toEqual([]);
    expect(dueEmails(b, at("2026-11-02T19:00:00Z"), "2:00")).toEqual(["review"]);
    expect(dueEmails(b, at("2026-11-04T18:00:00Z"), "2:00")).toEqual([]);
  });
  it("sin fechas no programa nada; duración por defecto 2 h", () => {
    expect(dueEmails({ eventDate: null, eventUtcDate: null }, at("2026-11-02T13:00:00Z"))).toEqual([]);
    expect(durationMinutes("1:30")).toBe(90);
    expect(durationMinutes("x")).toBe(120);
  });
});
