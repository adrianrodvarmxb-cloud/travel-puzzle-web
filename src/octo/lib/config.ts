/**
 * Configuración de Big Bus por la API Ventrata OCTO (docs.ventrata.com). A diferencia de Freetour y Tangol,
 * Ventrata no pide IP registrada: el Worker llama directo con la llave como secreto de Cloudflare.
 * La llave nunca va en el repo ni en `vars`: secreto BIGBUS_OCTO_API_KEY.
 */
export const VENTRATA_OCTO_BASE_URL = "https://api.ventrata.com/octo";

export type OctoEnv = "test" | "live";

export interface OctoConfig {
  baseUrl: string;
  apiKey: string;
  /** "test" no consume lugares, el código de barras no sirve y no se factura. */
  env: OctoEnv;
}

interface BigBusOctoEnv {
  BIGBUS_OCTO_ENABLED?: string;
  BIGBUS_OCTO_API_KEY?: string;
  BIGBUS_OCTO_ENV?: string;
  BIGBUS_OCTO_BASE_URL?: string;
}

/**
 * Configuración o null si la bandera está apagada o falta la llave. Con null no se llama a Ventrata.
 * Modo prueba por omisión: solo "live" exacto vende de verdad.
 */
// REQ-3324
export function bigBusOctoConfig(env: BigBusOctoEnv): OctoConfig | null {
  if (env.BIGBUS_OCTO_ENABLED !== "true") return null;
  const apiKey = env.BIGBUS_OCTO_API_KEY?.trim();
  if (!apiKey) return null;
  const baseUrl = (env.BIGBUS_OCTO_BASE_URL?.trim() || VENTRATA_OCTO_BASE_URL).replace(/\/+$/, "");
  if (!baseUrl.startsWith("https://")) return null;
  return { baseUrl, apiKey, env: env.BIGBUS_OCTO_ENV === "live" ? "live" : "test" };
}

/** Capacidades que pedimos. Precios es obligatorio para revendedores (certificación de Ventrata). */
export const OCTO_CAPABILITIES = ["octo/pricing"] as const;

/** Cabeceras de cada llamada OCTO: Bearer, capacidades (obligatoria, aunque vaya vacía) y entorno. */
// REQ-3324
export function octoHeaders(config: OctoConfig, opts: { json?: boolean; language?: string } = {}): Record<string, string> {
  const h: Record<string, string> = {
    Authorization: `Bearer ${config.apiKey}`,
    Accept: "application/json",
    "Octo-Capabilities": OCTO_CAPABILITIES.join(", "),
    "Octo-Env": config.env,
  };
  if (opts.json) h["Content-Type"] = "application/json";
  if (opts.language) h["Accept-Language"] = opts.language;
  return h;
}
