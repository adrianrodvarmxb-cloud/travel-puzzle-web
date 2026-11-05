/**
 * REQ-027: Travelpayouts Drive (enlaces y widgets de afiliado). Puro.
 * Apagado con AFFILIATES_ENABLED; aun encendido, solo carga en las rutas de AFFILIATE_PATHS
 * para no meter otras marcas en las fichas de tours (regla: todo es Travel Puzzle).
 */
export const DRIVE_SRC = "https://emrld.ltd/NTk1Nzkx.js?t=595791";
const DEFAULT_PATHS = ["/trenes", "/traslados"];

export interface DriveConfig { enabled: boolean; paths: string[] }

export function driveConfig(env: { AFFILIATES_ENABLED?: string; AFFILIATE_PATHS?: string }): DriveConfig {
  const paths = env.AFFILIATE_PATHS
    ? env.AFFILIATE_PATHS.split(",").map((p) => p.trim()).filter((p) => p.startsWith("/"))
    : DEFAULT_PATHS;
  return { enabled: env.AFFILIATES_ENABLED === "true", paths };
}

export function shouldLoadDrive(pathname: string, cfg: DriveConfig): boolean {
  if (!cfg.enabled) return false;
  return cfg.paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
