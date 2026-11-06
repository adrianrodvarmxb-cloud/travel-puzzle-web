// REQ-470…472: I/O del workflow «Geo: escribir geonameid». No habla con D1: arma el SQL y revisa respuestas de wrangler.
//   npx tsx src/scripts/geo-escribir.ts preparar <sql> <dir>        → valida el SQL; escribe ensayo.sql, repetidos-*.sql, lote-NN.sql
//   npx tsx src/scripts/geo-escribir.ts repetidos <wrangler.json> [permitidos] [antes.json]  → exit 1 si hay repetidos no permitidos
//     (con antes.json: compara los repetidos de hoy contra los de antes de escribir)
//   npx tsx src/scripts/geo-escribir.ts preparar-pais <sql> <dir>   → REQ-473: valida geo-v2-0016; escribe ensayo-pais.sql, ensayo-alias.sql, pais.sql
//   npx tsx src/scripts/geo-escribir.ts revisar-pais <pais.json> <alias.json> [despues]  → exit 1 si algo no cuadra; imprime pendientes=N
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { leerSqlGeonameid, lotes, sqlEnsayo, sqlRepetidos, gruposAlias, repetidosNoPermitidos, marcarNuevos, leerSqlPais, sqlEnsayoPais, sqlEnsayoAlias, revisarPais, type Repetido, type FilaPais } from "../geo/lib/escritura";

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
} else if (cmd === "preparar-pais") {
  const texto = readFileSync(a, "utf8");
  const { cambios, alias } = leerSqlPais(texto);
  mkdirSync(b, { recursive: true });
  writeFileSync(join(b, "ensayo-pais.sql"), sqlEnsayoPais(cambios));
  writeFileSync(join(b, "ensayo-alias.sql"), sqlEnsayoAlias(alias));
  writeFileSync(join(b, "pais.sql"), texto.split("\n").filter((l) => l.trim() && !l.startsWith("--")).join("\n"));
  console.log(`SQL de país válido: ${cambios.length} cambios de país/región y ${alias.length} alias.`);
} else if (cmd === "revisar-pais") {
  type FilaHoy = FilaPais & { hoy: string | null; existe: number };
  type AliasHoy = { providerCityId: number; cityId: number; hoy: number | null; canonica_existe: number };
  const filas = (JSON.parse(readFileSync(a, "utf8"))[0]?.results ?? []) as FilaHoy[];
  const alias = (JSON.parse(readFileSync(b, "utf8"))[0]?.results ?? []) as AliasHoy[];
  const despues = c === "despues";
  const errores: string[] = [];
  for (const f of filas) console.log(`ciudad ${f.id} ${f.col}: hoy ${f.hoy ?? "vacío"} → ${f.val} (país crudo ${f.crudo ?? "?"})`);
  for (const x of alias) console.log(`alias freetour ${x.providerCityId} → ${x.cityId}: hoy ${x.hoy ?? "no existe"}`);
  const pendientes = filas.filter((f) => f.hoy === null);
  const aliasPend = alias.filter((x) => x.hoy === null);
  errores.push(...revisarPais(pendientes, readFileSync("src/geo/data/country-overrides.csv", "utf8"), readFileSync("src/geo/data/city-country-overrides.csv", "utf8")));
  for (const f of filas) if (!Number(f.existe)) errores.push(`ciudad ${f.id} no existe`);
  for (const f of filas) if (f.hoy !== null && f.hoy !== f.val) console.log(`::warning::ciudad ${f.id} ya tiene ${f.col} = ${f.hoy} (no se toca)`);
  for (const x of alias) if (!Number(x.canonica_existe)) errores.push(`alias ${x.providerCityId}: la ciudad ${x.cityId} no existe`);
  for (const x of alias) if (x.hoy !== null && Number(x.hoy) !== Number(x.cityId)) errores.push(`alias ${x.providerCityId} ya apunta a ${x.hoy}`);
  if (despues) {
    for (const f of filas) if (f.hoy !== f.val) errores.push(`ciudad ${f.id}: ${f.col} quedó en ${f.hoy ?? "vacío"}`);
    for (const x of alias) if (Number(x.hoy) !== Number(x.cityId)) errores.push(`alias ${x.providerCityId} no quedó en ${x.cityId}`);
  }
  for (const e of errores) console.log(`::error::${e}`);
  console.log(`pendientes=${pendientes.length + aliasPend.length}`);
  if (errores.length) process.exit(1);
} else {
  console.error("uso: preparar <sql> <dir> | repetidos <wrangler.json> [permitidos] [antes.json]");
  process.exit(2);
}
