import { describe, it, expect } from "vitest";
import { sign, verify, MAX_SKEW_MS } from "./signature.js";

const secret = "s3cr3t";
const now = 1_800_000_000_000;

describe("firma de la pasarela", () => {
  it("acepta una firma correcta y reciente", () => {
    const body = '{"op":"getBooking"}';
    const sig = sign(secret, String(now), body);
    expect(verify(secret, { timestamp: String(now), signature: sig, body, now })).toEqual({ ok: true });
  });

  it("rechaza si el cuerpo cambió", () => {
    const sig = sign(secret, String(now), "a");
    expect(verify(secret, { timestamp: String(now), signature: sig, body: "b", now }).ok).toBe(false);
  });

  it("rechaza firmas viejas (más de 5 minutos) para evitar repeticiones", () => {
    const ts = String(now - MAX_SKEW_MS - 1);
    const sig = sign(secret, ts, "a");
    expect(verify(secret, { timestamp: ts, signature: sig, body: "a", now })).toEqual({ ok: false, reason: "expired" });
  });

  it("rechaza si falta la firma o el secreto", () => {
    expect(verify(secret, { timestamp: String(now), signature: "", body: "a", now }).ok).toBe(false);
    expect(verify("", { timestamp: String(now), signature: "x", body: "a", now }).ok).toBe(false);
  });
});
