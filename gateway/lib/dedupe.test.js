import { describe, it, expect, vi } from "vitest";
import { createDedupe, bookingKey } from "./dedupe.js";

const ok = { status: 200, json: { data: { refNumber: "R1" } } };
const payload = { eventId: 5, adults: 2, children: 0, customer: { email: "Ana@Example.com" }, idempotencyKey: "k".repeat(20) };

describe("bookingKey", () => {
  it("usa el token del intento más los datos de la reserva (correo sin mayúsculas)", () => {
    expect(bookingKey(payload)).toBe(bookingKey({ ...payload, customer: { email: "ana@example.com" } }));
    expect(bookingKey(payload)).not.toBe(bookingKey({ ...payload, adults: 3 }));
  });
  it("sin token no hay llave (no se deduplica)", () => {
    expect(bookingKey({ ...payload, idempotencyKey: undefined })).toBeNull();
  });
});

describe("dedupe de reservas", () => {
  it("el mismo intento repetido devuelve la primera respuesta sin llamar otra vez", async () => {
    const d = createDedupe({ now: () => 0 });
    const fn = vi.fn(async () => ok);
    expect(await d.run("a", fn)).toEqual({ res: ok, replayed: false });
    expect(await d.run("a", fn)).toEqual({ res: ok, replayed: true });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("si llega mientras la primera sigue en curso, espera y no crea otra", async () => {
    const d = createDedupe({ now: () => 0 });
    let release;
    const fn = vi.fn(() => new Promise((r) => (release = r)));
    const a = d.run("a", fn);
    const b = d.run("a", fn);
    release(ok);
    expect((await a).res).toBe(ok);
    expect(await b).toEqual({ res: ok, replayed: true });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("los errores no se recuerdan: el reintento vuelve a intentar", async () => {
    const d = createDedupe({ now: () => 0 });
    const fn = vi.fn().mockResolvedValueOnce({ status: 500, json: {} }).mockResolvedValueOnce(ok);
    expect((await d.run("a", fn)).res.status).toBe(500);
    expect((await d.run("a", fn)).res).toBe(ok);
    const boom = vi.fn().mockRejectedValueOnce(new Error("red")).mockResolvedValueOnce(ok);
    await expect(d.run("b", boom)).rejects.toThrow("red");
    expect((await d.run("b", boom)).res).toBe(ok);
  });

  it("después de 24 h se olvida", async () => {
    let t = 0;
    const d = createDedupe({ now: () => t });
    const fn = vi.fn(async () => ok);
    await d.run("a", fn);
    t = 24 * 60 * 60 * 1000 + 1;
    expect((await d.run("a", fn)).replayed).toBe(false);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("sin llave siempre llama", async () => {
    const d = createDedupe({ now: () => 0 });
    const fn = vi.fn(async () => ok);
    await d.run(null, fn);
    await d.run(null, fn);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("no crece sin límite", async () => {
    const d = createDedupe({ now: () => 0, max: 2 });
    for (const k of ["a", "b", "c"]) await d.run(k, async () => ok);
    expect(d.size()).toBe(2);
  });
});
