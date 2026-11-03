/** Reseñas de clientes de Travel Puzzle: reglas puras (nombre público, cuándo se puede reseñar, enlaces firmados). */

export const REVIEW_STATUSES = ["pending", "published", "hidden"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

const cap = (w: string) => (w ? w[0].toLocaleUpperCase("es") + w.slice(1).toLocaleLowerCase("es") : "");

/** "Ana", "Gómez" → "Ana G."; sin nombre → "Viajero". */
export function reviewerDisplayName(firstName: string, lastName: string): string {
  const first = firstName.trim().split(/\s+/).filter(Boolean).map(cap).join(" ");
  const initial = lastName.trim().charAt(0).toLocaleUpperCase("es");
  if (!first) return "Viajero";
  return initial ? `${first} ${initial}.` : first;
}

/** "YYYY-MM-DD HH:MM[:SS]" → fecha (UTC si es eventUtcDate; la local se toma como UTC, basta para "ya pasó"). */
function parseDate(value: string | null | undefined): Date | null {
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(?::\d{2})?/.exec(value ?? "");
  if (!m) return null;
  const d = new Date(`${m[1]}T${m[2]}:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Se puede reseñar cuando el tour ya pasó y la reserva no se canceló ni rechazó. */
export function canReview(
  record: { status: string; eventUtcDate: string | null; eventDate: string | null },
  now: Date
): boolean {
  if (record.status === "canceled" || record.status === "rejected") return false;
  const when = parseDate(record.eventUtcDate) ?? parseDate(record.eventDate);
  return !!when && when.getTime() <= now.getTime();
}

/** 1 a 3 estrellas: el aviso pide dar seguimiento por WhatsApp. */
export const needsFollowUp = (rate: number) => rate <= 3;

/** Estrellas que llegan en la URL (?rate=1..5). */
export function parseRate(value: string | string[] | undefined): number | null {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}

const enc = new TextEncoder();
const b64url = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(`resenas:${secret}`), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(message)));
}

/** Firma "payload|exp" (p. ej. "publish:<id>" o "admin"). */
export function signLink(secret: string, payload: string, exp: number): Promise<string> {
  return hmac(secret, `${payload}|${exp}`);
}

/** Verifica la firma y que no haya vencido. Sin secreto, nada es válido. */
export async function verifyLink(secret: string, payload: string, exp: number, sig: string, now: Date): Promise<boolean> {
  if (!secret || !sig || !Number.isFinite(exp) || exp < now.getTime()) return false;
  const expected = await signLink(secret, payload, exp);
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}

export const LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;
