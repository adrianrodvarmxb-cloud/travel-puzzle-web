import { describe, it, expect } from "vitest";
import { signRequest } from "./signature";
// Módulo JS de la pasarela: se prueba que ambos lados firman igual.
import { sign, verify } from "../../../gateway/lib/signature.js";

describe("firma del sitio", () => {
  it("es idéntica a la de la pasarela y la pasarela la acepta", async () => {
    const body = JSON.stringify({ op: "getBooking", payload: { refNumber: "R1" } });
    const ts = "1800000000000";
    const sig = await signRequest("s3cr3t", ts, body);
    expect(sig).toBe(sign("s3cr3t", ts, body));
    expect(verify("s3cr3t", { timestamp: ts, signature: sig, body, now: 1800000000000 })).toEqual({ ok: true });
  });
});
