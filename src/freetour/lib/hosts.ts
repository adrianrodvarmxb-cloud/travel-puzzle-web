/**
 * Hosts de la API de Freetour y configuración por ambiente.
 *
 * Login y todas las llamadas usan SIEMPRE el mismo host: un token emitido por
 * producción no sirve en stage (esa mezcla causó el 403 histórico).
 *
 * FREETOUR_ENV=production activa producción; cualquier otro valor usa stage.
 */
export const FREETOUR_HOSTS = {
  stage: "https://stage.freetour.dev/partnersAPI/v.2.0",
  production: "https://secure.freetour.com/partnersAPI/v.2.0",
} as const;

export type FreetourEnvironment = keyof typeof FREETOUR_HOSTS;

/**
 * REQ-113: interruptor FREETOUR_API_VERSION. Sin variable (o con un valor desconocido) se usa
 * "2.0" como hoy; regresar = quitar la variable. Solo cambia el sufijo /v.2.x del host.
 */
export const FREETOUR_API_VERSIONS = ["2.0", "2.1", "2.2"] as const;
export type FreetourApiVersion = (typeof FREETOUR_API_VERSIONS)[number];

export function resolveApiVersion(value: string | undefined): FreetourApiVersion {
  const v = (value ?? "").trim();
  return (FREETOUR_API_VERSIONS as readonly string[]).includes(v) ? (v as FreetourApiVersion) : "2.0";
}

export interface FreetourConfig {
  environment: FreetourEnvironment;
  apiVersion: FreetourApiVersion;
  baseUrl: string;
  email: string;
  password: string;
}

type EnvLike = Record<string, string | undefined>;

export function resolveFreetourConfig(env: EnvLike): FreetourConfig {
  const email = env.FREETOUR_EMAIL;
  const password = env.FREETOUR_PASSWORD;
  if (!email) throw new Error("Falta FREETOUR_EMAIL");
  if (!password) throw new Error("Falta FREETOUR_PASSWORD");
  const environment: FreetourEnvironment = env.FREETOUR_ENV === "production" ? "production" : "stage";
  const apiVersion = resolveApiVersion(env.FREETOUR_API_VERSION);
  const baseUrl = FREETOUR_HOSTS[environment].replace(/\/v\.2\.\d+$/, `/v.${apiVersion}`);
  return { environment, apiVersion, baseUrl, email, password };
}
