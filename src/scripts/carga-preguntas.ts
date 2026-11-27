/**
 * REQ-10813: carga inicial de las preguntas abiertas de los 7 proveedores publicados (plan REQ-3457 §3 y §8, G5-A)
 * en la columna `preguntas` de "Proveedor" (0033, REQ-10649). SIMULA POR DEFECTO: escribe en tmp/ el SQL de carga,
 * el SELECT de respaldo y el SQL de regreso, e imprime el resumen. No toca la base.
 *
 *   npx tsx src/scripts/carga-preguntas.ts                 → simula (tmp/carga-preguntas.sql, tmp/respaldo-preguntas.sql, tmp/regreso-preguntas.sql)
 *   npx tsx src/scripts/carga-preguntas.ts --solo destino-colombia,extime-travel
 *
 * Aplicar en producción (datos de un plan firmado; autorización global REQ-10743 con aviso al PO):
 *   1. Punto de regreso: respaldo de D1 (bookmark) y `npx wrangler d1 execute travel-puzzle --remote --file tmp/respaldo-preguntas.sql --json > tmp/preguntas-antes.json`
 *   2. `npx wrangler d1 execute travel-puzzle --remote --file tmp/carga-preguntas.sql`
 *   3. Regreso si hace falta: `npx wrangler d1 execute travel-puzzle --remote --file tmp/regreso-preguntas.sql` (la columna vuelve a '[]').
 * Antes de aplicar, `validarCarga` con la columna actual de cada proveedor (SELECT del paso 1): no se pisa lo ya cargado.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DIRECTORIO_APROBADO } from "../proveedores/lib/directorio";
import { PREGUNTAS_INICIALES, PUBLICADOS_G5, preguntasPorCargar, resumenPreguntas, sqlCargaPreguntas, sqlRegresoPreguntas, validarCarga } from "../proveedores/lib/preguntas-carga";

const args = process.argv.slice(2);
const soloArg = args[args.indexOf("--solo") + 1];
const ids = args.includes("--solo") && soloArg ? soloArg.split(",").map((s) => s.trim()).filter(Boolean) : [...PUBLICADOS_G5];
const carga = Object.fromEntries(ids.filter((id): id is (typeof PUBLICADOS_G5)[number] => (PUBLICADOS_G5 as readonly string[]).includes(id)).map((id) => [id, preguntasPorCargar(id)])); // REQ-10850: sin lo ya contestado

const motivos = validarCarga(carga, DIRECTORIO_APROBADO, {});
if (motivos.length) {
  console.error("NO CARGAR:\n" + motivos.map((m) => ` - ${m}`).join("\n"));
  process.exit(1);
}

const hoy = new Date().toISOString().slice(0, 10);
const dir = join(process.cwd(), "tmp");
mkdirSync(dir, { recursive: true });
const { respaldo, regreso } = sqlRegresoPreguntas(Object.keys(carga));
writeFileSync(join(dir, "carga-preguntas.sql"), sqlCargaPreguntas(carga, hoy) + "\n");
writeFileSync(join(dir, "respaldo-preguntas.sql"), respaldo + "\n");
writeFileSync(join(dir, "regreso-preguntas.sql"), regreso + "\n");

console.log(JSON.stringify(resumenPreguntas(carga)));
for (const [id, lista] of Object.entries(carga)) console.log(`${id}: ${lista.length} preguntas (${lista.filter((p) => p.tema !== "alta").length} de venta, ${lista.filter((p) => p.tema === "alta").length} de alta)`);
console.log("SIMULADO. SQL en tmp/carga-preguntas.sql · respaldo en tmp/respaldo-preguntas.sql · regreso en tmp/regreso-preguntas.sql");
