// Revisión de variables al arrancar. La IP de salida es obligatoria:
// Freetour solo acepta la IP registrada y sin ella fallaría sin avisar claro.
import { isIP } from "node:net";

const REQUIRED = ["GATEWAY_SECRET", "FREETOUR_EMAIL", "FREETOUR_PASSWORD", "FREETOUR_LOCAL_ADDRESS"];

/** Lista de problemas (vacía si todo está bien). Nunca incluye valores. */
export function checkConfig(env) {
  const problems = REQUIRED.filter((k) => !env[k]).map((k) => `falta ${k}`);
  if (env.FREETOUR_LOCAL_ADDRESS && !isIP(env.FREETOUR_LOCAL_ADDRESS)) problems.push("FREETOUR_LOCAL_ADDRESS no es una IP");
  // REQ-1551: Tangol es opcional (sin sus variables la pasarela sigue igual), pero van las dos o ninguna.
  if (env.TANGOL_EMAIL && !env.TANGOL_CLAVE) problems.push("falta TANGOL_CLAVE");
  if (env.TANGOL_CLAVE && !env.TANGOL_EMAIL) problems.push("falta TANGOL_EMAIL");
  return problems;
}
