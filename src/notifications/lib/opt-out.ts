/**
 * REQ-267: negativa «No publicidad» del aviso de privacidad (LFPDPPP). Lista de SHA-256 (hex) de correos en minúsculas,
 * separados por coma, en la variable EMAIL_NO_PUBLICIDAD (nunca correos en claro). Sin la variable no hay forma de saber
 * quién se negó y el bloque no se muestra (falla cerrada); con la variable vacía, nadie se ha negado.
 * Puro (sin I/O); usa Web Crypto, que existe en Workers y en Node 20.
 */
const HEX64 = /^[0-9a-f]{64}$/;

export async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** undefined = sin lista (no se puede consultar). */
export function optOutChecker(raw: string | undefined): ((email: string) => Promise<boolean>) | undefined {
  if (raw === undefined) return undefined;
  const set = new Set(raw.split(",").map((x) => x.trim().toLowerCase()).filter((x) => HEX64.test(x)));
  return async (email: string) => set.has(await sha256Hex(normalizeEmail(email)));
}
