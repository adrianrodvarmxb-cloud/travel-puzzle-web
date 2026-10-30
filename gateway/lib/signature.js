// Firma entre el sitio (Cloudflare) y la pasarela (Namecheap).
// HMAC-SHA256 de "timestamp.cuerpo" con un secreto compartido; vence en 5 minutos.
import { createHmac, timingSafeEqual } from "node:crypto";

export const MAX_SKEW_MS = 5 * 60 * 1000;

export function sign(secret, timestamp, body) {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

export function verify(secret, { timestamp, signature, body, now = Date.now() }) {
  if (!secret || !timestamp || !signature) return { ok: false, reason: "missing" };
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > MAX_SKEW_MS) return { ok: false, reason: "expired" };
  const expected = Buffer.from(sign(secret, timestamp, body), "hex");
  const given = Buffer.from(String(signature), "hex");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return { ok: false, reason: "bad-signature" };
  return { ok: true };
}
