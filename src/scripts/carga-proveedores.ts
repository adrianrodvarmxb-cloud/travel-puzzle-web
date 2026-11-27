/**
 * REQ-1656: arma la carga del directorio aprobado (src/proveedores/lib/directorio.ts) sin tocar la base.
 * Uso: npx tsx src/scripts/carga-proveedores.ts  → escribe tmp/carga-proveedores.sql e imprime el resumen.
 * Aplicarla en producción es candado (datos de producción): solo con OK del PO y con respaldo previo en tmp/.
 *   npx wrangler d1 execute travel-puzzle --remote --file tmp/carga-proveedores.sql
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DIRECTORIO_APROBADO, resumenCarga, sqlCarga } from "../proveedores/lib/directorio";

const ahora = new Date().toISOString();
const dir = join(process.cwd(), "tmp");
mkdirSync(dir, { recursive: true });
const file = join(dir, "carga-proveedores.sql");
writeFileSync(file, sqlCarga(DIRECTORIO_APROBADO, ahora) + "\n");
console.log(JSON.stringify(resumenCarga(DIRECTORIO_APROBADO)));
for (const p of DIRECTORIO_APROBADO) {
  console.log([p.publicado ? "PUB" : p.bloqueado ? "BLQ" : "   ", p.id, p.tipo, p.cobro, p.zonaHoraria, p.correos.join(" ") || "-", p.dominios.join(" ") || "-"].join(" | "));
}
console.log(`SQL: ${file}`);
