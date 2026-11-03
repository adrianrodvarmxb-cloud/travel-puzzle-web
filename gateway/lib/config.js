// Revisión de variables al arrancar. La IP de salida es obligatoria:
// Freetour solo acepta la IP registrada y sin ella fallaría sin avisar claro.
import { isIP } from "node:net";

const REQUIRED = ["GATEWAY_SECRET", "FREETOUR_EMAIL", "FREETOUR_PASSWORD", "FREETOUR_LOCAL_ADDRESS"];

/** Lista de problemas (vacía si todo está bien). Nunca incluye valores. */
export function checkConfig(env) {
  const problems = REQUIRED.filter((k) => !env[k]).map((k) => `falta ${k}`);
  if (env.FREETOUR_LOCAL_ADDRESS && !isIP(env.FREETOUR_LOCAL_ADDRESS)) problems.push("FREETOUR_LOCAL_ADDRESS no es una IP");
  return problems;
}
