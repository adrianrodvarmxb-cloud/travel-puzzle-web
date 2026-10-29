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

export interface FreetourConfig {
  environment: FreetourEnvironment;
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
  return { environment, baseUrl: FREETOUR_HOSTS[environment], email, password };
}
