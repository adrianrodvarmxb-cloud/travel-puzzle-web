/**
 * Enlace para que el equipo cree o cambie su contraseña del gestor. Puro (Web Crypto).
 * Firma "correo|huella|vence"; la huella es de la contraseña guardada, así que al
 * cambiarla el enlace deja de servir (un solo uso). Vence en 1 hora.
 */
export const PASSWORD_LINK_TTL_MS = 60 * 60 * 1000;
export const MIN_PASSWORD = 10;
export const MAX_PASSWORD = 128;

const enc = new TextEncoder();
const b64url = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/** Huella corta de la contraseña guardada (vacía si aún no tiene). */
export async function passwordFingerprint(storedHash: string | null): Promise<string> {
  return b64url(await crypto.subtle.digest("SHA-256", enc.encode(storedHash ?? ""))).slice(0, 16);
}

export async function signPasswordLink(secret: string, email: string, fingerprint: string, exp: number): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(`contrasena:${secret}`), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(`${email}|${fingerprint}|${exp}`)));
}

export async function verifyPasswordLink(secret: string, email: string, fingerprint: string, exp: number, sig: string, now: Date): Promise<boolean> {
  if (!secret || !sig || !Number.isFinite(exp) || exp < now.getTime()) return false;
  const expected = await signPasswordLink(secret, email, fingerprint, exp);
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}

/** null si la contraseña nueva sirve; si no, el motivo. */
export function checkNewPassword(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD) return `Usa al menos ${MIN_PASSWORD} caracteres.`;
  if (password.length > MAX_PASSWORD) return `Máximo ${MAX_PASSWORD} caracteres.`;
  if (password !== confirm) return "Las contraseñas no coinciden.";
  return null;
}
