import { describe, it, expect, vi } from "vitest";
import { handleRequest } from "./handler.js";
import { sign } from "./signature.js";

const secret = "s3cr3t";
const now = 1_800_000_000_000;
const signed = (obj) => {
  const body = JSON.stringify(obj);
  return { method: "POST", path: "/freetour", body, headers: { "x-tp-timestamp": String(now), "x-tp-signature": sign(secret, String(now), body) } };
};

function deps(res = { status: 200, json: { data: { refNumber: "R1" }, status: 200 } }) {
  return { secret, now: () => now, freetour: { call: vi.fn(async () => res) }, log: vi.fn() };
}

describe("handleRequest", () => {
  it("GET /health responde ok sin firma", async () => {
    expect(await handleRequest({ method: "GET", path: "/health", headers: {}, body: "" }, deps())).toEqual({ status: 200, json: { ok: true } });
  });

  it("con firma válida, llama a Freetour y devuelve su respuesta", async () => {
    const d = deps();
    const out = await handleRequest(signed({ op: "getBooking", payload: { refNumber: "R1" } }), d);
    expect(d.freetour.call).toHaveBeenCalledWith("GET", "/booking/R1", undefined);
    expect(out).toEqual({ status: 200, json: { status: 200, data: { refNumber: "R1" } } });
  });

  it("sin firma o con firma mala: 401 y no toca Freetour", async () => {
    const d = deps();
    const req = signed({ op: "getBooking", payload: { refNumber: "R1" } });
    req.headers["x-tp-signature"] = "00";
    expect((await handleRequest(req, d)).status).toBe(401);
    expect(d.freetour.call).not.toHaveBeenCalled();
  });

  it("operación no permitida o datos inválidos: 400", async () => {
    const d = deps();
    expect((await handleRequest(signed({ op: "login", payload: {} }), d)).status).toBe(400);
    expect((await handleRequest(signed({ op: "getBooking", payload: {} }), d)).status).toBe(400);
    expect(d.freetour.call).not.toHaveBeenCalled();
  });

  it("si Freetour falla por red: 502 sin detalles internos", async () => {
    const d = deps();
    d.freetour.call.mockRejectedValue(new Error("ECONNRESET 10.0.0.1"));
    const out = await handleRequest(signed({ op: "getBooking", payload: { refNumber: "R1" } }), d);
    expect(out.status).toBe(502);
    expect(JSON.stringify(out.json)).not.toContain("10.0.0.1");
  });

  it("el registro no incluye datos personales del cliente", async () => {
    const d = deps();
    const customer = { email: "ana@example.com", firstName: "Ana", lastName: "Pérez" };
    await handleRequest(signed({ op: "createBooking", payload: { eventId: 1, adults: 1, children: 0, price: 0, customer } }), d);
    expect(JSON.stringify(d.log.mock.calls)).not.toMatch(/ana@example|Pérez/);
  });

  it("ruta desconocida: 404", async () => {
    expect((await handleRequest({ method: "GET", path: "/x", headers: {}, body: "" }, deps())).status).toBe(404);
  });
});
