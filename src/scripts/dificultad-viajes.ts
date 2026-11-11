// REQ-1520: I/O del workflow «Dificultad de viajes» (lote REQ-1518, firma REQ-1519). No habla con D1: lee la salida de
// wrangler, arma el SQL y verifica.
//   npx tsx src/scripts/dificultad-viajes.ts ids                               → lista de ids entre comillas para el SELECT
//   npx tsx src/scripts/dificultad-viajes.ts preparar <filas.json> <dir>       → plan.json, dificultad.sql, regreso.sql
//   npx tsx src/scripts/dificultad-viajes.ts verificar <despues.json> <plan.json> → exit 1 si una fila no quedó con su valor
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { leerLote, planDificultad, verificarDificultad, type FilaD1, type PlanDificultad } from "../taxonomy/lib/dificultad-lote";

const LOTE = "src/taxonomy/data/dificultad-2026-11-11.json";
const [cmd, a, b] = process.argv.slice(2);
const results = (file: string) => (JSON.parse(readFileSync(file, "utf8")) as { results: Record<string, unknown>[] }[])[0]?.results ?? [];
const lote = leerLote(JSON.parse(readFileSync(LOTE, "utf8")));
const nivel = (v: unknown) => (v === null || v === undefined ? null : Number(v));

if (cmd === "ids") {
  console.log(lote.viajes.map((v) => `'${v.id}'`).join(","));
} else if (cmd === "preparar") {
  const filas: FilaD1[] = results(a).map((r) => ({ id: String(r.id), kind: String(r.kind), difficultyLevel: nivel(r.difficultyLevel) }));
  const plan = planDificultad(lote, filas);
  mkdirSync(b, { recursive: true });
  writeFileSync(join(b, "respaldo.json"), JSON.stringify(results(a), null, 1));
  writeFileSync(join(b, "plan.json"), JSON.stringify(plan, null, 1));
  writeFileSync(join(b, "dificultad.sql"), plan.sql);
  writeFileSync(join(b, "regreso.sql"), plan.regreso);
  const por = (n: number | null) => plan.cambios.filter((c) => c.despues === n).length;
  console.log(`## Dificultad de viajes (REQ-1520)\n\n- Viajes en el lote: ${lote.viajes.length}\n- Leídos en D1: ${filas.length}\n- Cambian: **${plan.cambios.length}** (1: ${por(1)} · 2: ${por(2)} · 3: ${por(3)} · 4: ${por(4)} · 5: ${por(5)} · sin dato: ${por(null)})\n- No están en D1 (no se tocan): ${plan.faltan.length}${plan.faltan.length ? ` — ${plan.faltan.join(", ")}` : ""}\n- Traslados en D1 que el lote traía con nivel (quedan sin dato): ${plan.omitidos.length}`);
} else if (cmd === "verificar") {
  const plan = JSON.parse(readFileSync(b, "utf8")) as PlanDificultad;
  const r = verificarDificultad(plan, results(a).map((x) => ({ id: String(x.id), difficultyLevel: nivel(x.difficultyLevel) })));
  console.log(r.ok ? `Verificado en D1: ${plan.cambios.length} de ${plan.cambios.length} con su valor.` : `NO quedaron con su valor: ${r.mal.join(", ")}`);
  if (!r.ok) process.exit(1);
} else {
  console.error("uso: ids | preparar <filas.json> <dir> | verificar <despues.json> <plan.json>");
  process.exit(2);
}
