/**
 * REQ-1610 (gates A1 y B1, PO 12 nov 2026; de INC-010): decide si producción quedó atrás de `main` porque un deploy
 * se revirtió o se canceló, y si toca relanzarlo.
 *
 * Puro: todo el estado entra por parámetro. No lee la red ni Cloudflare. El sha que sirve producción se deduce del
 * `head_sha` del último deploy de `main` que terminó en verde, porque el sitio no expone su versión y leerla de
 * Cloudflare pediría credenciales.
 */
export interface EstadoPublicacion {
  /** HEAD de `main`. */
  shaMain: string;
  /** `head_sha` del último deploy de `main` que terminó en verde; null si no hay ninguno. */
  shaUltimoExitoso: string | null;
  /** Último deploy de `main`, en cualquier estado; null si no hay ninguno. */
  ultimoDeploy: { status: string; conclusion: string | null } | null;
  /** Relanzamientos que el verificador ya hizo hoy. */
  reintentosHoy: number;
}

export type AccionPublicacion = "esperar" | "reintentar" | "avisar";
export interface DecisionPublicacion {
  accion: AccionPublicacion;
  motivo: string;
}

/** Gate B1 (PO, 12 nov 2026): un relanzamiento al día; si vuelve a fallar, avisa y se detiene. */
export const MAX_REINTENTOS_DIA = 1;

export function decidirPublicacion(e: EstadoPublicacion, max = MAX_REINTENTOS_DIA): DecisionPublicacion {
  if (!e.ultimoDeploy) return { accion: "esperar", motivo: "no hay ningún deploy de main todavía" };
  if (e.ultimoDeploy.status !== "completed") return { accion: "esperar", motivo: "hay un deploy de main en curso" };
  // Nunca se relanza a ciegas: sin un deploy en verde no se sabe qué sirve producción.
  if (e.shaUltimoExitoso === null) return { accion: "avisar", motivo: "ningún deploy de main terminó en verde: no se relanza a ciegas" };
  if (e.shaUltimoExitoso === e.shaMain) return { accion: "esperar", motivo: "producción sirve el HEAD de main" };
  // main va adelante de lo último publicado con éxito.
  if (e.ultimoDeploy.conclusion === "success") {
    return { accion: "esperar", motivo: "el último deploy fue en verde; main avanzó después y su agente lanzará el suyo" };
  }
  if (e.reintentosHoy >= max) {
    return { accion: "avisar", motivo: `ya se relanzó ${e.reintentosHoy} vez(ces) hoy y main sigue sin publicar` };
  }
  return { accion: "reintentar", motivo: `el último deploy terminó en «${e.ultimoDeploy.conclusion ?? "sin conclusión"}» y main sigue sin publicar` };
}
