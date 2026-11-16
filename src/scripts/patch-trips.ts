/**
 * REQ-10726: prepara la corrección puntual de campos de viajes ya cargados (lo corre el workflow «Actualizar campos de viajes»).
 *   npx tsx src/scripts/patch-trips.ts <imports/archivo.json> <carpeta-salida> <campo,campo>
 * Escribe patch.sql (un UPDATE por viaje, solo esos campos) e ids.txt. No toca producción.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildFieldPatchSql } from "../trips/lib/field-patch";

const [input, out, campos = ""] = process.argv.slice(2);
if (!input || !out || !campos) { console.log("Uso: patch-trips.ts <archivo.json> <salida> <campo,campo>"); process.exit(1); }
const b = JSON.parse(readFileSync(input, "utf8")) as { agency: { id: string; name: string; initials: string }; trips: { ref: string; trip: Record<string, unknown> }[] };
const r = buildFieldPatchSql(b.trips, b.agency.initials, campos.split(",").map((s) => s.trim()).filter(Boolean), b.agency.id);
mkdirSync(out, { recursive: true });
writeFileSync(join(out, "patch.sql"), r.sql.join("\n") + "\n");
writeFileSync(join(out, "ids.txt"), r.ids.join("\n") + "\n");
writeFileSync(join(out, "agencia.txt"), b.agency.id + "\n");
console.log(`${b.agency.name}: ${r.sql.length} viajes, campos ${campos}`);
