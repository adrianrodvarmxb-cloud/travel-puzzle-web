/**
 * Acceso a BeMyGuest (REQ-021). Puro.
 * Token Bearer de 15 min por POST /v2/oauth/token con grant client_credentials.
 * Nunca se usa refresh_token: BMG bloquea la llave si un refresh se reusa (p. ej. dos isolates a la vez).
 */
export interface BmgToken { accessToken: string; expiresAt: number }

const SKEW_MS = 60_000;

export function needsNewToken(t: BmgToken | null, now: number): boolean {
  return !t || !t.accessToken || t.expiresAt - SKEW_MS <= now;
}

export function tokenRequestBody(apiKey: string): { grant_type: "client_credentials"; client_secret: string } {
  return { grant_type: "client_credentials", client_secret: apiKey };
}

export function tokenFromResponse(json: unknown, now: number): BmgToken | null {
  const r = json as { access_token?: unknown; expires_in?: unknown } | null;
  if (!r || typeof r.access_token !== "string" || !r.access_token) return null;
  const secs = typeof r.expires_in === "number" && r.expires_in > 0 ? r.expires_in : 900;
  return { accessToken: r.access_token, expiresAt: now + secs * 1000 };
}
