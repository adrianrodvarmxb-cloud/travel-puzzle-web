/**
 * REQ-10521 (INC-017): decide si el commit del blog ya quedó publicado, a partir de las corridas de «Publicar en
 * Cloudflare» en main creadas después del merge. Función pura: quien llama dice, por corrida, si incluye el commit.
 *
 * La cola de concurrencia de deploy-cloudflare.yml deja una sola corrida pendiente: si llega un push a main, la
 * pendiente (p. ej. la que despachó blog-diario) queda «cancelled» y la nueva, que también trae el commit, publica.
 * Por eso un «cancelled» no es falla: se sigue esperando a la corrida que lo reemplazó.
 */
export type RunDeploy = { id: number; status: string; conclusion: string | null; incluye: boolean };
export type EstadoPublicacion =
  | { estado: "verde"; id: number }
  | { estado: "esperando" }
  | { estado: "fallo"; id: number; conclusion: string };

const NEUTRAS = new Set(["cancelled", "skipped"]);

// REQ-10521
export function estadoPublicacion(runs: RunDeploy[]): EstadoPublicacion {
  const conCommit = runs.filter((r) => r.incluye);
  const verde = conCommit.find((r) => r.status === "completed" && r.conclusion === "success");
  if (verde) return { estado: "verde", id: verde.id };
  if (conCommit.some((r) => r.status !== "completed")) return { estado: "esperando" };
  const fallo = conCommit.find((r) => r.status === "completed" && r.conclusion && !NEUTRAS.has(r.conclusion));
  if (fallo) return { estado: "fallo", id: fallo.id, conclusion: fallo.conclusion ?? "" };
  return { estado: "esperando" };
}
