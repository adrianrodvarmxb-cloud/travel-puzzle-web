// REQ-1514: lo usa el workflow redes-diario.yml. Lee redes-salida/resultado.json e imprime «cerrar» o «actualizar».
import { readFileSync } from "node:fs";
import { decidirIssue } from "../redes/lib/cierre";

const r = JSON.parse(readFileSync("redes-salida/resultado.json", "utf8")) as { resultados: Parameters<typeof decidirIssue>[0] };
console.log(decidirIssue(r.resultados));
