import { describe, it, expect, vi } from "vitest";
import { runAutoEmails, toUtcText, type AutoEmailDeps } from "./auto-emails";

const record = {
  refNumber: "6782-20261030162746-244", tourExternalId: 6782, eventId: 1, adults: 2, children: 0, price: 0,
  email: "ana@example.com", firstName: "Ana", lastName: "P", phone: null,
  eventDate: "2026-11-02 10:00:00", eventUtcDate: "2026-11-02 16:00:00", language: "Spanish",
  status: "active", manageToken: "tok", createdAt: new Date(), updatedAt: new Date(),
};

function deps(now: string, over: Partial<AutoEmailDeps> = {}): AutoEmailDeps {
  return {
    now: new Date(now),
    reviewsEnabled: true,
    listCandidates: vi.fn(async () => [record]),
    sentKinds: vi.fn(async () => new Set<string>()),
    markSent: vi.fn(async () => {}),
    freetourStatus: vi.fn(async () => "active"),
    setStatus: vi.fn(async () => {}),
    getDuration: vi.fn(async () => "2:00"),
    send: vi.fn(async () => "sent" as const),
    ...over,
  };
}

describe("correos automáticos", () => {
  it("manda el recordatorio de 48 h una vez y lo registra", async () => {
    const d = deps("2026-10-31T17:00:00Z");
    expect(await runAutoEmails(d)).toMatchObject({ sent: 1 });
    expect(d.send).toHaveBeenCalledWith("reminder48", record);
    expect(d.markSent).toHaveBeenCalledWith(record.refNumber, "reminder48");
    expect(d.listCandidates).toHaveBeenCalledWith("2026-10-28 17:00:00", "2026-11-02 18:00:00");
  });
  it("no repite lo ya enviado", async () => {
    const d = deps("2026-10-31T17:00:00Z", { sentKinds: vi.fn(async () => new Set([`${record.refNumber}|reminder48`])) });
    await runAutoEmails(d);
    expect(d.send).not.toHaveBeenCalled();
  });
  it("si Freetour la tiene cancelada o rechazada, actualiza el estado y no manda nada", async () => {
    const d = deps("2026-11-02T13:00:00Z", { freetourStatus: vi.fn(async () => "rejected") });
    expect(await runAutoEmails(d)).toMatchObject({ sent: 0, closed: 1 });
    expect(d.setStatus).toHaveBeenCalledWith(record.refNumber, "rejected");
    expect(d.send).not.toHaveBeenCalled();
  });
  it("si no se pudo consultar Freetour, espera a la siguiente vuelta", async () => {
    const d = deps("2026-11-02T13:00:00Z", { freetourStatus: vi.fn(async () => null) });
    await runAutoEmails(d);
    expect(d.send).not.toHaveBeenCalled();
    expect(d.markSent).not.toHaveBeenCalled();
  });
  it("reseña solo con su interruptor encendido", async () => {
    const off = deps("2026-11-02T19:30:00Z", { reviewsEnabled: false });
    await runAutoEmails(off);
    expect(off.send).not.toHaveBeenCalled();
    const on = deps("2026-11-02T19:30:00Z");
    await runAutoEmails(on);
    expect(on.send).toHaveBeenCalledWith("review", record);
    expect(on.freetourStatus).not.toHaveBeenCalled();
  });
  it("con el correo apagado no registra nada como enviado", async () => {
    const d = deps("2026-10-31T17:00:00Z", { send: vi.fn(async () => "disabled" as const) });
    await runAutoEmails(d);
    expect(d.markSent).not.toHaveBeenCalled();
  });
  it("formato de fecha igual al guardado", () => {
    expect(toUtcText(new Date("2026-11-02T16:00:00.000Z"))).toBe("2026-11-02 16:00:00");
  });
});
