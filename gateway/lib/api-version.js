// REQ-062: interruptor FREETOUR_API_VERSION de la pasarela (mismo nombre que en el Worker).
// Sin variable o con un valor desconocido: producción v.2.0 como hoy. Regresar = quitar la
// variable y reiniciar la app en cPanel. Solo cambia el sufijo /v.2.x de la URL base.
const DEFAULT_BASE = "https://secure.freetour.com/partnersAPI/v.2.0";
const VERSIONS = ["2.0", "2.1", "2.2"];

export function resolveBaseUrl(env) {
  const base = env.FREETOUR_BASE_URL || DEFAULT_BASE;
  const v = String(env.FREETOUR_API_VERSION ?? "").trim();
  if (!VERSIONS.includes(v)) return base;
  return base.replace(/\/v\.2\.\d+\/?$/, `/v.${v}`);
}
