import { describe, it, expect } from "vitest";
import { planEdit, type EditEvent } from "./edit-plan";

const ev: EditEvent = { id: 20, isAvailable: 1, minAdultsPerBooking: 1, availableAdultPlaces: 5, availableChildrenPlaces: 2 };
const current = { eventId: 10, adults: 2, children: 0 };
const tourEventIds = [10, 20, 30];

describe("modificar reserva: validación", () => {
  it("acepta otra fecha del mismo tour con lugares", () => {
    expect(planEdit({ current, target: { eventId: 20, adults: 3, children: 1 }, event: ev, tourEventIds })).toEqual({ ok: true });
  });
  it("mismas personas en otra fecha o más personas en la misma", () => {
    expect(planEdit({ current, target: { eventId: 20, adults: 2, children: 0 }, event: ev, tourEventIds }).ok).toBe(true);
    expect(planEdit({ current, target: { eventId: 10, adults: 4, children: 0 }, event: { ...ev, id: 10 }, tourEventIds }).ok).toBe(true);
  });
  it("sin cambios", () => {
    expect(planEdit({ current, target: { ...current }, event: { ...ev, id: 10 }, tourEventIds })).toEqual({ ok: false, code: "no_change" });
  });
  it("no se puede pasar a otro tour", () => {
    expect(planEdit({ current, target: { eventId: 99, adults: 2, children: 0 }, event: { ...ev, id: 99 }, tourEventIds })).toEqual({ ok: false, code: "other_tour" });
  });
  it("sin lugares o evento cerrado", () => {
    expect(planEdit({ current, target: { eventId: 20, adults: 6, children: 0 }, event: ev, tourEventIds })).toEqual({ ok: false, code: "no_availability" });
    expect(planEdit({ current, target: { eventId: 20, adults: 2, children: 3 }, event: ev, tourEventIds })).toEqual({ ok: false, code: "no_availability" });
    expect(planEdit({ current, target: { eventId: 20, adults: 2, children: 0 }, event: { ...ev, isAvailable: 0 }, tourEventIds })).toEqual({ ok: false, code: "no_availability" });
  });
  it("mínimo de adultos y números válidos", () => {
    expect(planEdit({ current, target: { eventId: 20, adults: 1, children: 0 }, event: { ...ev, minAdultsPerBooking: 2 }, tourEventIds })).toEqual({ ok: false, code: "min_adults" });
    expect(planEdit({ current, target: { eventId: 20, adults: 0, children: 1 }, event: ev, tourEventIds })).toEqual({ ok: false, code: "min_adults" });
    expect(planEdit({ current, target: { eventId: 20, adults: 1.5, children: 0 }, event: ev, tourEventIds })).toEqual({ ok: false, code: "invalid" });
  });
  it("el evento consultado debe ser el elegido", () => {
    expect(planEdit({ current, target: { eventId: 30, adults: 2, children: 0 }, event: ev, tourEventIds })).toEqual({ ok: false, code: "invalid" });
  });
});
