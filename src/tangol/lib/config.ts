/**
 * Configuración de Tangol en el sitio. El sitio nunca llama a Tangol directo: va por la pasarela de
 * Namecheap, que sale por la IP registrada (decisión del PO, REQ-1545). Las claves de Tangol viven en cPanel.
 */
export interface TangolConfig {
  gatewayUrl: string;
  secret: string;
}

interface TangolEnv {
  TANGOL_ENABLED?: string;
  GATEWAY_URL?: string;
  GATEWAY_SECRET?: string;
}

/** Configuración o null si la bandera está apagada o falta la pasarela. Con null no se llama a Tangol. */
// REQ-1552
export function tangolConfig(env: TangolEnv): TangolConfig | null {
  if (env.TANGOL_ENABLED !== "true") return null;
  if (!env.GATEWAY_URL || !env.GATEWAY_SECRET) return null;
  return { gatewayUrl: env.GATEWAY_URL, secret: env.GATEWAY_SECRET };
}
