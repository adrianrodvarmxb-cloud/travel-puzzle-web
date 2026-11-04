// REQ-020 — INC-002: diagnóstico en cPanel que compara consulta, cancelación y edición con la misma reserva.
import { describe, expect, it } from "vitest";
import { diagnosticCalls, summarize } from "./diagnostic.js";

const r = { refNumber: "6782-20261104140813-761", eventId: 631715588, adults: 1, children: 0 };

describe("diagnosticCalls", () => {
  it("REQ-020: consulta, cancelación y edición con exactamente los 4 campos del Swagger", () => {
    const calls = diagnosticCalls(r);
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      "GET /booking/6782-20261104140813-761",
      "GET /event/631715588/6782-20261104140813-761",
      "POST /booking/edit",
      "POST /booking/cancel",
    ]);
    expect(calls[2].body).toEqual(r);
    expect(calls[3].body).toEqual(r);
  });
});

describe("summarize", () => {
  it("REQ-020: concluye 'bloqueo de modo 2 en Freetour' si lectura pasa y edición+cancelación dan 403", () => {
    const res = [{ status: 200 }, { status: 200 }, { status: 403 }, { status: 403 }];
    expect(summarize(res)).toBe("EXTERNO: Freetour bloquea las operaciones de modo 2 (editar y cancelar) para esta cuenta");
  });
  it("REQ-020: si solo cancelar da 403, lo dice tal cual", () => {
    expect(summarize([{ status: 200 }, { status: 200 }, { status: 200 }, { status: 403 }])).toBe("EXTERNO: Freetour bloquea solo la cancelación para esta cuenta");
  });
  it("REQ-020: si la lectura falla, el problema es de acceso (token/IP/host)", () => {
    expect(summarize([{ status: 403 }, { status: 403 }, { status: 403 }, { status: 403 }])).toBe("ACCESO: la consulta falla; revisar host, token o IP");
  });
  it("REQ-020: si cancelar responde 200, ya funciona", () => {
    expect(summarize([{ status: 200 }, { status: 200 }, { status: 200 }, { status: 200 }])).toBe("OK: Freetour aceptó la cancelación");
  });
});
