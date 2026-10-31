import { describe, it, expect } from "vitest";
import { buildIcs, icsAttachment } from "./ics";

const base = {
  method: "REQUEST" as const,
  refNumber: "6782-20261030162746-244",
  startUtc: "2026-11-02 16:00:00",
  durationMinutes: 150,
  title: "Free Tour Centro, Histórico",
  location: "Zócalo; frente a la Catedral",
  description: "Reserva 6782\nhttps://travelpuzzle.com.mx/reserva/abc",
  url: "https://travelpuzzle.com.mx/reserva/abc",
  organizerEmail: "reservas@travelpuzzle.com.mx",
  attendeeEmail: "ana@example.com",
  attendeeName: "Ana P",
  now: Date.UTC(2026, 9, 30, 21, 0, 0),
};

describe("invitación de calendario", () => {
  it("evento con UID fijo por reserva, horas UTC y aviso 2 h antes", () => {
    const ics = buildIcs(base)!;
    expect(ics).toContain("METHOD:REQUEST");
    expect(ics).toContain("UID:6782-20261030162746-244@travelpuzzle.com.mx");
    expect(ics).toContain("DTSTART:20261102T160000Z");
    expect(ics).toContain("DTEND:20261102T183000Z");
    expect(ics).toContain("SUMMARY:Free Tour Centro\\, Histórico");
    expect(ics).toContain("LOCATION:Zócalo\; frente a la Catedral");
    expect(ics).toContain("TRIGGER:-PT2H");
    expect(ics).toContain("ATTENDEE;CN=Ana P");
    expect(ics.split("\r\n").every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true);
  });
  it("una versión posterior lleva SEQUENCE mayor (así el evento se mueve)", () => {
    const seq = (s: string) => Number(/SEQUENCE:(\d+)/.exec(s)![1]);
    expect(seq(buildIcs({ ...base, now: base.now + 60_000 })!)).toBeGreaterThan(seq(buildIcs(base)!));
  });
  it("cancelación: mismo UID, METHOD:CANCEL y sin alarma", () => {
    const ics = buildIcs({ ...base, method: "CANCEL" })!;
    expect(ics).toContain("METHOD:CANCEL");
    expect(ics).toContain("STATUS:CANCELLED");
    expect(ics).toContain("UID:6782-20261030162746-244@travelpuzzle.com.mx");
    expect(ics).not.toContain("VALARM");
  });
  it("sin fecha UTC no hay invitación", () => {
    expect(buildIcs({ ...base, startUtc: "" })).toBeNull();
  });
  it("adjunto en base64 con el tipo correcto", () => {
    const a = icsAttachment("BEGIN:VCALENDAR\r\n", "REQUEST");
    expect(a.filename).toBe("invitacion.ics");
    expect(a.contentType).toBe("text/calendar; charset=utf-8; method=REQUEST");
    expect(atob(a.content)).toBe("BEGIN:VCALENDAR\r\n");
  });
});
