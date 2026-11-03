import { describe, it, expect, vi } from "vitest";
import { editByToken, type EditDeps } from "./edit";
import type { BookingRecord } from "./lib/booking-record";

const now = new Date("2026-11-03T12:00:00Z");
const record: BookingRecord = {
  refNumber: "6782-1-1", tourExternalId: 6782, eventId: 10, adults: 2, children: 0, price: 0,
  email: "a@example.com", firstName: "Ana", lastName: "Gómez", phone: null,
  eventDate: "2026-11-10 10:00", eventUtcDate: "2026-11-10 09:00:00", language: "es", status: "active",
  manageToken: "t".repeat(24), createdAt: now, updatedAt: now,
};

function deps(over: Partial<EditDeps> = {}): EditDeps {
  return {
    enabled: true,
    findByToken: async (t) => (t === record.manageToken ? record : null),
    getRemote: async () => ({ status: "active", canBeCanceled: 1, canBeEdited: 1 }),
    setStatus: vi.fn(async () => {}),
    tourEvents: async () => [
      { id: 10, date: "2026-11-10 10:00", utcDate: "2026-11-10 09:00:00", language: "es" },
      { id: 20, date: "2026-11-12 16:00", utcDate: "2026-11-12 15:00:00", language: "es" },
    ],
    getEventForEdit: async (id) => ({ id, isAvailable: 1, minAdultsPerBooking: 1, availableAdultPlaces: 6, availableChildrenPlaces: 6 }),
    edit: vi.fn(async () => ({})),
    update: vi.fn(async () => {}),
    notify: vi.fn(async () => {}),
    ...over,
  };
}

const target = { eventId: 20, adults: 3, children: 0 };

describe("modificar reserva", () => {
  it("apagado: no hace nada", async () => {
    const d = deps({ enabled: false });
    expect(await editByToken(record.manageToken, target, d)).toBe("disabled");
    expect(d.edit).not.toHaveBeenCalled();
  });
  it("token desconocido o Freetour no permite editar", async () => {
    expect(await editByToken("x".repeat(24), target, deps())).toBe("not_found");
    expect(await editByToken(record.manageToken, target, deps({ getRemote: async () => ({ status: "active", canBeCanceled: 1, canBeEdited: 0 }) }))).toBe("not_allowed");
  });
  it("cambio válido: edita en Freetour, guarda la nueva fecha y avisa una vez", async () => {
    const d = deps();
    expect(await editByToken(record.manageToken, target, d)).toBe("modified");
    expect(d.edit).toHaveBeenCalledWith({ refNumber: record.refNumber, eventId: 20, adults: 3, children: 0 });
    expect(d.update).toHaveBeenCalledWith(record.refNumber, { eventId: 20, adults: 3, children: 0, eventDate: "2026-11-12 16:00", eventUtcDate: "2026-11-12 15:00:00", language: "es" });
    expect(d.notify).toHaveBeenCalledTimes(1);
  });
  it("regla rota: no llama a Freetour", async () => {
    const d = deps();
    expect(await editByToken(record.manageToken, { eventId: 99, adults: 2, children: 0 }, d)).toBe("other_tour");
    expect(d.edit).not.toHaveBeenCalled();
  });
  it("si Freetour falla, no toca nuestra base ni avisa", async () => {
    const d = deps({ edit: vi.fn(async () => { throw new Error("403"); }) });
    expect(await editByToken(record.manageToken, target, d)).toBe("error");
    expect(d.update).not.toHaveBeenCalled();
    expect(d.notify).not.toHaveBeenCalled();
  });
});
