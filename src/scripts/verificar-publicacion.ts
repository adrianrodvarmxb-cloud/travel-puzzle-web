/**
 * REQ-1610: CLI del verificador de publicación. Solo I/O: lee el estado que reunió el workflow y escribe la decisión.
 *   npx tsx src/scripts/verificar-publicacion.ts <estado.json>
 * Imprime «accion=…» y «motivo=…» para que el workflow los lea con GITHUB_OUTPUT.
 */
import { readFileSync } from "node:fs";
import { decidirPublicacion, type EstadoPublicacion } from "../ops/lib/publicacion";

const file = process.argv[2];
if (!file) { console.error("Uso: npx tsx src/scripts/verificar-publicacion.ts <estado.json>"); process.exit(2); }
const estado = JSON.parse(readFileSync(file, "utf8")) as EstadoPublicacion;
const d = decidirPublicacion(estado);
console.log(`accion=${d.accion}`);
console.log(`motivo=${d.motivo}`);
