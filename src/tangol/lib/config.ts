/** Host oficial de la API de Tangol (swagger: https://tangolapi.tangol.com/swagger/ui/index). */
export const TANGOL_BASE_URL = "https://tangolapi.tangol.com";

export interface TangolConfig {
  baseUrl: string;
  email: string;
  /** Código de cliente de Travel Puzzle en Tangol. Secreto de Cloudflare, nunca en el repo. */
  clave: string;
}

interface TangolEnv {
  TANGOL_ENABLED?: string;
  TANGOL_EMAIL?: string;
  TANGOL_CLAVE?: string;
}

/**
 * Configuración de Tangol, o null si la bandera está apagada o faltan los secretos.
 * Con null no se llama a Tangol (todo lo de Tangol queda apagado).
 */
// REQ-1544
export function tangolConfig(env: TangolEnv): TangolConfig | null {
  if (env.TANGOL_ENABLED !== "true") return null;
  if (!env.TANGOL_EMAIL || !env.TANGOL_CLAVE) return null;
  return { baseUrl: TANGOL_BASE_URL, email: env.TANGOL_EMAIL, clave: env.TANGOL_CLAVE };
}
