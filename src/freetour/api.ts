import type { FreetourConfig } from "./lib/hosts";

/** Error con el status y el código reales que devuelve Freetour. */
export class FreetourError extends Error {
  constructor(message: string, readonly status: number, readonly errorCode: number | null) {
    super(message);
    this.name = "FreetourError";
  }
}

interface Deps {
  config: FreetourConfig;
  fetch: typeof fetch;
  /** Reloj inyectable para las pruebas. */
  now?: () => number;
}

// El token dura 1 hora; se renueva a los 50 minutos.
const TOKEN_TTL_MS = 50 * 60 * 1000;

/**
 * Cliente mínimo de la API de Freetour. Recibe config y fetch por parámetro
 * (inyección), así se prueba sin red y el login siempre va al mismo host.
 */
export function createFreetourApi({ config, fetch: fetchImpl, now = Date.now }: Deps) {
  let token: string | null = null;
  let expiresAt = 0;

  async function parse(res: Response) {
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const data = body?.data ?? {};
      throw new FreetourError(data.errorMessage ?? `Freetour respondió ${res.status}`, res.status, data.errorCode ?? null);
    }
    return body;
  }

  async function login(): Promise<string> {
    if (token && now() < expiresAt) return token;
    const res = await fetchImpl(`${config.baseUrl}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: config.email, password: config.password }),
    });
    const body = await parse(res);
    token = body.data.token.accessToken as string;
    expiresAt = now() + TOKEN_TTL_MS;
    return token;
  }

  async function request(method: "GET" | "POST", path: string, payload?: unknown) {
    const accessToken = await login();
    const res = await fetchImpl(`${config.baseUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: payload === undefined ? undefined : JSON.stringify(payload),
    });
    return parse(res);
  }

  return {
    environment: config.environment,
    get: (path: string) => request("GET", path),
    post: (path: string, payload: unknown) => request("POST", path, payload),
  };
}

export type FreetourApi = ReturnType<typeof createFreetourApi>;
