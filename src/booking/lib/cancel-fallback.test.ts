import { describe, expect, it } from "vitest";
import { cancelFailureAction } from "./cancel-fallback";

describe("cancelFailureAction", () => {
  it("REQ-017: si Freetour no nos deja cancelar por permiso (403), se registra la solicitud para el equipo", () => {
    expect(cancelFailureAction({ status: 403, errorCode: 0 })).toBe("manual_request");
  });
  it("REQ-017: si ya es tarde para cancelar (37) o ya estaba cancelada/rechazada, no se pide a mano", () => {
    expect(cancelFailureAction({ status: 400, errorCode: 37 })).toBe("too_late");
    expect(cancelFailureAction({ status: 400, errorCode: 38 })).toBe("already");
    expect(cancelFailureAction({ status: 400, errorCode: 39 })).toBe("already");
  });
  it("REQ-017: caída o error desconocido: también queda en manos del equipo (el cliente nunca se queda sin cancelar)", () => {
    expect(cancelFailureAction({ status: 502, errorCode: null })).toBe("manual_request");
    expect(cancelFailureAction({})).toBe("manual_request");
  });
});
