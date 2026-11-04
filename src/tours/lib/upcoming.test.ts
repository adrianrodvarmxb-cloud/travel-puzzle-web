import { describe, expect, it } from "vitest";
import { upcomingEvents } from "./upcoming";

const ev = (id: number, utcDate: string) => ({ id, utcDate, date: utcDate, language: "Spanish", tourId: 1 });
const now = Date.parse("2026-11-04T12:00:00Z");

describe("upcomingEvents", () => {
  it("REQ-016: el calendario no ofrece horarios que ya pasaron", () => {
    const list = [ev(1, "2026-10-27 06:00:00"), ev(2, "2026-11-04 11:59:00"), ev(3, "2026-11-04 12:30:00"), ev(4, "2026-11-07 09:30:00")];
    expect(upcomingEvents(list, now).map((e) => e.id)).toEqual([3, 4]);
  });
  it("REQ-016: sin utcDate usa la fecha local; sin ninguna fecha válida no se ofrece", () => {
    expect(upcomingEvents([{ id: 8, utcDate: "", date: "2026-11-09 10:00:00", language: "x", tourId: 1 }], now).map((e) => e.id)).toEqual([8]);
    expect(upcomingEvents([{ id: 9, utcDate: "", date: "", language: "x", tourId: 1 }], now)).toEqual([]);
  });
});
