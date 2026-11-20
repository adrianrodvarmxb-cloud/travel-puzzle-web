/**
 * REQ-3521: arma la carga de condiciones de proveedores (docs/proveedores/condiciones.json) sin tocar la base.
 * Cada renglón: { id, cancelacion, cambios, pagos, operacion, fuente, fecha } (src/proveedores/lib/condiciones.ts).
 * Uso: npx tsx src/scripts/carga-condiciones.ts → escribe tmp/carga-condiciones.sql e imprime cargados y rechazados.
 * Requiere la 0030 aplicada (REQ-3522). Aplicarla en producción es candado del PO, con respaldo previo en tmp/:
 *   npx wrangler d1 execute travel-puzzle --remote --file tmp/carga-condiciones.sql
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { sqlCondiciones } from "../proveedores/lib/condiciones";

const lista = JSON.parse(readFileSync(join(process.cwd(), "docs/proveedores/condiciones.json"), "utf8")) as unknown[];
const { sql, cargados, rechazados } = sqlCondiciones(lista, new Date().toISOString());
const dir = join(process.cwd(), "tmp");
mkdirSync(dir, { recursive: true });
const file = join(dir, "carga-condiciones.sql");
writeFileSync(file, sql + "\n");
console.log(JSON.stringify({ cargados, rechazados }, null, 2));
console.log(`SQL: ${file}`);
