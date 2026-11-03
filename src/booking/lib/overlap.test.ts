import { describe, it, expect } from "vitest";
import { isOverlap, parseIdempotencyKey } from "./overlap";

describe("isOverlap", () => {
  const rows = [
    { eventId: 5, email: "Ana@Example.com ", status: "active" },
    { eventId: 6, email: "luis@example.com", status: "canceled" },
  ];
  it("mismo horario y mismo correo activo (sin importar mayúsculas)", () => {
    expect(isOverlap(rows, { eventId: 5, email: "ana@example.com" })).toBe(true);
  });
  it("otro horario, otro correo o reserva cancelada: no", () => {
    expect(isOverlap(rows, { eventId: 7, email: "ana@example.com" })).toBe(false);
    expect(isOverlap(rows, { eventId: 5, email: "otra@example.com" })).toBe(false);
    expect(isOverlap(rows, { eventId: 6, email: "luis@example.com" })).toBe(false);
  });
});

describe("parseIdempotencyKey", () => {
  it("acepta un UUID del navegador", () => {
    expect(parseIdempotencyKey("3f2b8c1e-9a4d-4e2f-8b7a-1c2d3e4f5a6b")).toBe("3f2b8c1e-9a4d-4e2f-8b7a-1c2d3e4f5a6b");
  });
  it("cualquier otra cosa se ignora", () => {
    expect(parseIdempotencyKey("corto")).toBeUndefined();
    expect(parseIdempotencyKey("x".repeat(20) + ";")).toBeUndefined();
    expect(parseIdempotencyKey(123)).toBeUndefined();
  });
});
