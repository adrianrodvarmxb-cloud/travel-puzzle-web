/**
 * Firma de las peticiones a la pasarela (HMAC-SHA256 de "timestamp.cuerpo").
 * Usa Web Crypto para correr en Cloudflare Workers. Debe coincidir con gateway/lib/signature.js.
 */
export async function signRequest(secret: string, timestamp: string, body: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode(`${timestamp}.${body}`));
  return Array.from(new Uint8Array(mac), (b) => b.toString(16).padStart(2, "0")).join("");
}
