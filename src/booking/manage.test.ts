import { describe, it, expect, vi } from "vitest";
import { loadManageView, cancelByToken } from "./manage";

const TOKEN = "tok_abcdefghijklmnopqrstuv";
const record = {
  refNumber: "6782-20261030162746-244", tourExternalId: 6782, eventId: 631716684, adults: 2, children: 1, price: 0,
  email: "ana@example.com", firstName: "Ana", lastName: "P", phone: null,
  eventDate: "2026-11-02 10:00:00", eventUtcDate: "2026-11-02 16:00:00", language: "Spanish",
  status: "active", manageToken: TOKEN, createdAt: new Date(), updatedAt: new Date(),
};

function deps(over = {}) {
  return {
    findByToken: vi.fn(async (t: string) => (t === TOKEN ? record : null)),
    getRemote: vi.fn(async () => ({ status: "active", canBeCanceled: 1, canBeEdited: 1 })),
    setStatus: vi.fn(async () => {}),
    cancel: vi.fn(async () => ({ refNumber: record.refNumber })),
    notify: vi.fn(async () => "sent"),
    ...over,
  };
}

describe("página de la reserva", () => {
  it("token inválido o desconocido: no existe", async () => {
    expect(await loadManageView("x", deps())).toBeNull();
    expect(await loadManageView("tok_desconocido_123456789", deps())).toBeNull();
  });
  it("consulta a Freetour si se puede cancelar", async () => {
    const v = await loadManageView(TOKEN, deps());
    expect(v).toMatchObject({ status: "active", canCancel: true, offline: false });
  });
  it("si Freetour no permite cancelar, no ofrece el botón", async () => {
    const v = await loadManageView(TOKEN, deps({ getRemote: vi.fn(async () => ({ status: "active", canBeCanceled: 0, canBeEdited: 0 })) }));
    expect(v?.canCancel).toBe(false);
  });
  it("sincroniza el estado si Freetour dice otra cosa", async () => {
    const d = deps({ getRemote: vi.fn(async () => ({ status: "rejected", canBeCanceled: 0, canBeEdited: 0 })) });
    const v = await loadManageView(TOKEN, d);
    expect(v?.status).toBe("rejected");
    expect(d.setStatus).toHaveBeenCalledWith(record.refNumber, "rejected");
  });
  it("sin respuesta de Freetour muestra la reserva sin acciones", async () => {
    const v = await loadManageView(TOKEN, deps({ getRemote: vi.fn(async () => null) }));
    expect(v).toMatchObject({ offline: true, canCancel: false });
  });
});

describe("cancelar", () => {
  it("cancela en Freetour, marca la reserva y avisa al cliente", async () => {
    const d = deps();
    expect(await cancelByToken(TOKEN, d)).toBe("canceled");
    expect(d.cancel).toHaveBeenCalledWith({ refNumber: record.refNumber, eventId: 631716684, adults: 2, children: 1 });
    expect(d.setStatus).toHaveBeenCalledWith(record.refNumber, "canceled");
    expect(d.notify).toHaveBeenCalledWith(expect.objectContaining({ status: "canceled" }));
  });
  it("no cancela si no está permitido o ya estaba cancelada", async () => {
    const no = deps({ getRemote: vi.fn(async () => ({ status: "active", canBeCanceled: 0, canBeEdited: 0 })) });
    expect(await cancelByToken(TOKEN, no)).toBe("not_allowed");
    expect(no.cancel).not.toHaveBeenCalled();
    const ya = deps({ getRemote: vi.fn(async () => ({ status: "canceled", canBeCanceled: 0, canBeEdited: 0 })) });
    expect(await cancelByToken(TOKEN, ya)).toBe("already");
  });
  it("si Freetour falla, no marca nada ni avisa", async () => {
    const d = deps({ cancel: vi.fn(async () => { throw new Error("403"); }) });
    expect(await cancelByToken(TOKEN, d)).toBe("error");
    expect(d.setStatus).not.toHaveBeenCalled();
    expect(d.notify).not.toHaveBeenCalled();
  });
  it("token desconocido", async () => {
    expect(await cancelByToken("tok_desconocido_123456789", deps())).toBe("not_found");
  });
});
