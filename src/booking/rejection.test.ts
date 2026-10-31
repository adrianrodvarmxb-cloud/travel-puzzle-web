import { describe, it, expect, vi } from "vitest";
import { handleRejection } from "./rejection";

const record = {
  refNumber: "6782-20261030162746-244", tourExternalId: 6782, eventId: 1, adults: 2, children: 0, price: 0,
  email: "ana@example.com", firstName: "Ana", lastName: "P", phone: null,
  eventDate: "2026-10-31 08:00:00", eventUtcDate: null, language: "Spanish",
  status: "active", manageToken: "tok", createdAt: new Date(), updatedAt: new Date(),
};

function deps(over: Partial<Parameters<typeof handleRejection>[1]> = {}) {
  return {
    findByRef: vi.fn(async () => record),
    freetourStatus: vi.fn(async () => "rejected"),
    setStatus: vi.fn(async () => {}),
    notify: vi.fn(async () => "sent"),
    ...over,
  };
}

describe("aviso de reserva rechazada", () => {
  it("confirma con Freetour, marca la reserva y avisa al cliente con el motivo", async () => {
    const d = deps();
    expect(await handleRejection({ refNumber: record.refNumber, reason: " Grupo completo " }, d)).toBe("processed");
    expect(d.freetourStatus).toHaveBeenCalledWith(record.refNumber);
    expect(d.setStatus).toHaveBeenCalledWith(record.refNumber, "rejected");
    expect(d.notify).toHaveBeenCalledWith(expect.objectContaining({ status: "rejected", email: "ana@example.com" }), "Grupo completo");
  });
  it("ignora formatos inválidos sin consultar nada", async () => {
    const d = deps();
    expect(await handleRejection({ refNumber: "x; DROP" }, d)).toBe("invalid");
    expect(await handleRejection(null, d)).toBe("invalid");
    expect(d.findByRef).not.toHaveBeenCalled();
  });
  it("reservas que no son nuestras", async () => {
    expect(await handleRejection({ refNumber: record.refNumber }, deps({ findByRef: vi.fn(async () => null) }))).toBe("unknown");
  });
  it("aviso falso: si Freetour no la tiene rechazada, no hace nada", async () => {
    const d = deps({ freetourStatus: vi.fn(async () => "active") });
    expect(await handleRejection({ refNumber: record.refNumber }, d)).toBe("not_rejected");
    expect(d.setStatus).not.toHaveBeenCalled();
    expect(d.notify).not.toHaveBeenCalled();
  });
  it("aviso repetido: no manda el correo dos veces", async () => {
    const d = deps({ findByRef: vi.fn(async () => ({ ...record, status: "rejected" })) });
    expect(await handleRejection({ refNumber: record.refNumber }, d)).toBe("already");
    expect(d.notify).not.toHaveBeenCalled();
  });
});
