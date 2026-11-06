// REQ-470…472: I/O del workflow «Geo: escribir geonameid». No habla con D1: arma el SQL y revisa respuestas de wrangler.
//   npx tsx src/scripts/geo-escribir.ts preparar <sql> <dir>        → valida el SQL; escribe ensayo.sql, repetidos-*.sql, lote-NN.sql
//   npx tsx src/scripts/geo-escribir.ts repetidos <wrangler.json> [permitidos] [antes.json]  → exit 1 si hay repetidos no permitidos
//     (con antes.json: compara los repetidos de hoy contra los de antes de escribir)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { leerSqlGeonameid, lotes, sqlEnsayo, sqlRepetidos, gruposAlias, repetidosNoPermitidos, marcarNuevos, type Repetido } from "../geo/lib/escritura";

const [cmd, a, b, c] = process.argv.slice(2);

if (cmd === "preparar") {
  const pares = leerSqlGeonameid(readFileSync(a, "utf8"));
  mkdirSync(b, { recursive: true });
  writeFileSync(join(b, "pares.json"), JSON.stringify(pares));
  writeFileSync(join(b, "ensayo.sql"), sqlEnsayo(pares));
  writeFileSync(join(b, "repetidos-previstos.sql"), sqlRepetidos(pares, true));
  writeFileSync(join(b, "repetidos-hoy.sql"), sqlRepetidos(pares, false));
  lotes(pares, 25).forEach((l, i) => writeFileSync(join(b, `lote-${String(i + 1).padStart(2, "0")}.sql`), l));
  console.log(`SQL válido: ${pares.length} filas, ${Math.ceil(pares.length / 25)} lotes de hasta 25.`);
} else if (cmd === "repetidos") {
  const leer = (f: string) => (JSON.parse(readFileSync(f, "utf8"))[0]?.results ?? []) as Repetido[];
  const rs = c ? marcarNuevos(leer(c), leer(a)) : leer(a);
  const permitidos = (b ?? "").split(/[\s,]+/).filter(Boolean).map(Number);
  const alias = gruposAlias(readFileSync("src/geo/data/city-aliases.csv", "utf8"));
  const malos = repetidosNoPermitidos(rs, alias, permitidos);
  for (const r of rs) {
    const tipo = malos.includes(r) ? "NO PERMITIDO" : Number(r.toca) === 1 ? "permitido (alias o PO)" : "ya existía (no lo toca este cambio)";
    console.log(`geonameid ${r.g}: ciudades ${r.ids} — ${tipo}`);
  }
  if (malos.length) {
    console.log(`::error::${malos.length} geonameid repetido(s) que nadie firmó: ${malos.map((r) => `${r.g} (${r.ids})`).join("; ")}`);
    process.exit(1);
  }
  console.log(`Repetidos: ${rs.length}; no permitidos: 0.`);
} else {
  console.error("uso: preparar <sql> <dir> | repetidos <wrangler.json> [permitidos] [antes.json]");
  process.exit(2);
}
