import type { TangolConfig } from "./lib/config";
import { countrySchema, destinationSchema, infoTourSchema, parseEach, parseTourRates } from "./lib/schemas";

/** Error con el status real que devuelve Tangol. `auth` = falló la autenticación (no se reintenta en bucle). */
export class TangolError extends Error {
  constructor(message: string, readonly status: number, readonly auth = false) {
    super(message);
    this.name = "TangolError";
  }
}

interface Deps {
  config: TangolConfig;
  fetch: typeof fetch;
  /** Reloj inyectable para las pruebas. */
  now?: () => number;
}

// Tangol no documenta la duración del token (pregunta en REQ-1546); se renueva a los 50 min y ante 401.
const TOKEN_TTL_MS = 50 * 60 * 1000;

/**
 * Cliente de solo lectura de la API de Tangol (ola 1). Recibe config y fetch por parámetro,
 * así se prueba sin red. Reservas y cancelaciones van en la ola 4 (REQ-1548).
 */
// REQ-1540, REQ-1541, REQ-1542
export function createTangolApi({ config, fetch: fetchImpl, now = Date.now }: Deps) {
  let token: string | null = null;
  let expiresAt = 0;

  // REQ-1540
  async function authenticate(): Promise<string> {
    if (token && now() < expiresAt) return token;
    const res = await fetchImpl(`${config.baseUrl}/Tour/Autenticacion`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email: config.email, clave: config.clave }),
    });
    const text = await res.text().catch(() => "");
    if (!res.ok) throw new TangolError(`Tangol rechazó la autenticación (${res.status})`, res.status, true);
    let value: unknown = text;
    try {
      value = JSON.parse(text);
    } catch {
      /* el token puede venir como texto plano */
    }
    const tok = typeof value === "string" ? value.trim() : "";
    if (!tok) throw new TangolError("Tangol no devolvió token", res.status, true);
    token = tok;
    expiresAt = now() + TOKEN_TTL_MS;
    return tok;
  }

  // REQ-1540
  async function call(path: string, init: { method: "GET" | "POST"; query?: Record<string, string>; body?: unknown }, retried = false): Promise<unknown> {
    const tok = await authenticate();
    const url = new URL(`${config.baseUrl}${path}`);
    for (const [k, v] of Object.entries(init.query ?? {})) url.searchParams.set(k, v);
    const res = await fetchImpl(url.toString(), {
      method: init.method,
      headers: { Authorization: `Bearer ${tok}`, Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}) },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
    if (res.status === 401 && !retried) {
      token = null;
      return call(path, init, true);
    }
    if (!res.ok) throw new TangolError(`Tangol respondió ${res.status} en ${path}`, res.status);
    return res.json();
  }

  return {
    // REQ-1541
    async getCountries() {
      const body = (await call("/Tour/GetTourCountries", { method: "GET" })) as { ListCountries?: unknown };
      return parseEach(countrySchema, body?.ListCountries);
    },
    // REQ-1541
    async getDestinations(countryCode: string) {
      const body = (await call("/Tour/GetTourDestinations", { method: "GET", query: { "params.countryCode": countryCode } })) as { ListDestinations?: unknown };
      return parseEach(destinationSchema, body?.ListDestinations);
    },
    // REQ-1541
    async getTourList(p: { destinationId: number; languageCode: number; currency: number; includeDetails?: boolean }) {
      const query: Record<string, string> = {
        "params.destinationId": String(p.destinationId),
        "params.languageCode": String(p.languageCode),
        "params.currency": String(p.currency),
      };
      if (p.includeDetails) query["params.includeDetails"] = "true";
      const body = (await call("/Tour/GetTourListByDestination", { method: "GET", query })) as { ListTours?: unknown };
      return parseEach(infoTourSchema, body?.ListTours);
    },
    // REQ-1542
    async getTourRates(p: { tourId: number; languageCode: string; currency: string }) {
      const body = await call("/Tour/GetTourRates", { method: "POST", body: { TourId: p.tourId, LanguageCode: p.languageCode, Currency: p.currency } });
      return parseTourRates(body);
    },
  };
}
