// REQ-10746: puente entre el workflow «D1: aplicar una sola migración» y la regla pura de src/ops/lib/migracion-una.ts.
//   npx tsx src/scripts/migracion-una.ts elegir <listado.txt> <archivo>  → imprime "aplicar", "nada" o falla con el motivo
//   npx tsx src/scripts/migracion-una.ts marcar <archivo>                → imprime el INSERT en d1_migrations
import { readFileSync } from "node:fs";
import { elegirMigracion, sqlMarcarAplicada } from "../ops/lib/migracion-una";

const [modo, a, b] = process.argv.slice(2);
if (modo === "elegir" && a && b) {
  const r = elegirMigracion(readFileSync(a, "utf8"), b);
  if (r.ok) { console.log("aplicar"); process.exit(0); }
  console.error(r.motivo);
  if ("nada" in r && r.nada) { console.log("nada"); process.exit(0); }
  process.exit(1);
} else if (modo === "marcar" && a) {
  console.log(sqlMarcarAplicada(a));
} else {
  console.error("uso: migracion-una.ts elegir <listado.txt> <archivo> | marcar <archivo>");
  process.exit(2);
}
