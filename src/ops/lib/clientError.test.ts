// REQ-221 (INC-001, acción correctiva): errores del navegador → /api/client-error → logs del Worker.
import { describe, expect, it } from "vitest";
import { clientErrorPayload, handleClientErrorReport, parseClientError } from "./clientError";

describe("parseClientError", () => {
  it("REQ-221: acepta un error del navegador y lo recorta para el registro", () => {
    const r = parseClientError({ message: "x".repeat(2000), stack: "s".repeat(9000), path: "/tours?q=1", source: "window" });
    expect(r).not.toBeNull();
    expect(r!.message).toHaveLength(500);
    expect(r!.stack).toHaveLength(4000);
    expect(r!.path).toBe("/tours?q=1");
    expect(r!.source).toBe("window");
  });

  it("REQ-221: rechaza basura (sin mensaje, tipos raros, ruta externa)", () => {
    expect(parseClientError(null)).toBeNull();
    expect(parseClientError({})).toBeNull();
    expect(parseClientError({ message: 123 })).toBeNull();
    expect(parseClientError({ message: "a", path: "https://evil.com" })).toBeNull();
    expect(parseClientError({ message: "a", path: "//evil.com/x" })).toBeNull();
  });

  it("REQ-221: campos opcionales con valor por defecto", () => {
    expect(parseClientError({ message: "boom" })).toEqual({ message: "boom", stack: "", path: "/", source: "unknown", digest: "" });
  });
});

describe("handleClientErrorReport", () => {
  const run = (raw: string, ua: string | null = "Mozilla/5.0") => {
    const logs: string[] = [];
    const status = handleClientErrorReport(raw, ua, (line) => logs.push(line));
    return { status, logs };
  };

  it("REQ-221: un reporte válido queda en el log como `client-error` (JSON con ruta, stack, origen y navegador) y responde 204", () => {
    const { status, logs } = run(JSON.stringify({ message: "boom", stack: "at x", path: "/tours", source: "window" }));
    expect(status).toBe(204);
    expect(logs).toHaveLength(1);
    expect(JSON.parse(logs[0])).toEqual({ type: "client-error", message: "boom", stack: "at x", path: "/tours", source: "window", digest: "", ua: "Mozilla/5.0" });
  });

  it("REQ-221: JSON inválido o que no pasa zod → 400 y no se registra nada", () => {
    expect(run("no-json")).toEqual({ status: 400, logs: [] });
    expect(run(JSON.stringify({ message: "" }))).toEqual({ status: 400, logs: [] });
  });

  it("REQ-221: cuerpo demasiado grande → 413 sin registrar (nadie llena los logs)", () => {
    expect(run("x".repeat(16_001))).toEqual({ status: 413, logs: [] });
  });

  it("REQ-221: el user-agent se recorta y su ausencia no rompe", () => {
    const body = JSON.stringify({ message: "boom" });
    expect(JSON.parse(run(body, "u".repeat(900)).logs[0]).ua).toHaveLength(200);
    expect(JSON.parse(run(body, null).logs[0]).ua).toBe("");
  });
});

describe("clientErrorPayload", () => {
  it("REQ-221: convierte un Error en el cuerpo que valida el endpoint", () => {
    const e = new Error("falló");
    const body = clientErrorPayload(e, "section:viajes", "/tours?x=1", "abc");
    expect(parseClientError(JSON.parse(body))).toMatchObject({ message: "falló", path: "/tours?x=1", source: "section:viajes", digest: "abc" });
  });

  it("REQ-221: acepta lo que sea que se lance (texto, objeto, undefined) sin lanzar", () => {
    expect(parseClientError(JSON.parse(clientErrorPayload("texto", "promise", "/")))!.message).toBe("texto");
    expect(parseClientError(JSON.parse(clientErrorPayload(undefined, "promise", "/")))!.message).toBe("undefined");
    expect(parseClientError(JSON.parse(clientErrorPayload(new Error(""), "window", "/")))!.message).toBe("sin mensaje");
  });
});
