import { describe, expect, it } from "vitest";
import { rawHash, hashView, VOLATILE_FIELDS } from "./raw-hash";

// Muestras inventadas (nunca datos reales de proveedor en el repo, REQ-548).
const item = { id: 7, updatedAt: "2026-11-01T00:00:00Z", rating: 4.5, reviewsNumber: 10, title: { es: "Tour 7" }, price: { value: 0, currency: "EUR" } };

describe("REQ-540 huella del crudo: JSON canónico sin los campos volátiles del proveedor", () => {
  it("REQ-540 el orden de las llaves no cambia la huella", async () => {
    const reordered = { title: { es: "Tour 7" }, price: { currency: "EUR", value: 0 }, reviewsNumber: 10, rating: 4.5, updatedAt: "2026-11-01T00:00:00Z", id: 7 };
    expect(await rawHash("freetour", reordered)).toBe(await rawHash("freetour", item));
  });
  it("REQ-540 un campo volátil declarado (updatedAt de FREETOUR) no cambia la huella", async () => {
    expect(await rawHash("freetour", { ...item, updatedAt: "2026-11-06T09:00:00Z", rating: 4.9, reviewsNumber: 11 })).toBe(await rawHash("freetour", item));
  });
  it("REQ-540 cualquier otro cambio sí cambia la huella", async () => {
    expect(await rawHash("freetour", { ...item, title: { es: "Tour 7 nuevo" } })).not.toBe(await rawHash("freetour", item));
    expect(await rawHash("freetour", { ...item, extra: null })).not.toBe(await rawHash("freetour", item));
  });
  it("REQ-540 los volátiles salen solo del cálculo: la vista de la huella no muta el item (la copia se guarda íntegra)", () => {
    const copy = structuredClone(item);
    const view = hashView("freetour", item) as Record<string, unknown>;
    expect(view.updatedAt).toBeUndefined();
    expect(item).toEqual(copy);
  });
  it("REQ-540 cada proveedor declara su lista (aunque esté vacía) y es sha-256 hex", async () => {
    for (const p of ["freetour", "extime", "exoticescapes", "bigbus", "incaworld", "destinocolombia", "fantasticachina", "turismoasiatico"]) {
      expect(Array.isArray(VOLATILE_FIELDS[p])).toBe(true);
    }
    expect(await rawHash("extime", { ref: "X" })).toMatch(/^[0-9a-f]{64}$/);
  });
  it("REQ-540 un proveedor sin lista declarada no se puede archivar", async () => {
    await expect(rawHash("nuevo", { a: 1 })).rejects.toThrow(/volátiles/);
  });
});
