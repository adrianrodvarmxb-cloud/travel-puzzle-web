// REQ-470…472 (gate G4, firmado por el PO): escritura de los geonameid v2 en producción. Lógica pura; el I/O
// (wrangler) lo hace el workflow «Geo: escribir geonameid» con src/scripts/geo-escribir.ts.

export type Par = { id: number; geonameid: number };
export type Repetido = { g: number; ids: string; toca: number };

const LINEA = /^UPDATE "City" SET "geonameid" = ([1-9]\d{0,9}) WHERE "id" = ([1-9]\d{0,9}) AND "geonameid" IS NULL;$/;

/** REQ-470: solo comentarios, líneas vacías o UPDATE que llena un geonameid vacío; cualquier otra cosa detiene todo. */
export function leerSqlGeonameid(texto: string): Par[] {
  const pares: Par[] = [];
  const vistos = new Set<number>();
  texto.split("\n").forEach((cruda, i) => {
    const linea = cruda.replace(/\r$/, "");
    if (linea.trim() === "" || /^--[^\n]*$/.test(linea)) return;
    const m = LINEA.exec(linea);
    if (!m) throw new Error(`línea ${i + 1}: no es un UPDATE permitido: ${linea.slice(0, 120)}`);
    const p = { id: Number(m[2]), geonameid: Number(m[1]) };
    if (vistos.has(p.id)) throw new Error(`línea ${i + 1}: id ${p.id} repetido`);
    vistos.add(p.id);
    pares.push(p);
  });
  if (pares.length === 0) throw new Error("el SQL no trae ninguna fila");
  return pares;
}

const update = (p: Par) => `UPDATE "City" SET "geonameid" = ${p.geonameid} WHERE "id" = ${p.id} AND "geonameid" IS NULL;`;

/** REQ-471: lotes para `wrangler d1 execute --command`, con las mismas sentencias del archivo. */
export function lotes(pares: Par[], n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < pares.length; i += n) out.push(pares.slice(i, i + n).map(update).join("\n"));
  return out;
}

export const sqlValores = (pares: Par[]) => pares.map((p) => `(${p.id}, ${p.geonameid})`).join(", ");

/** REQ-471: SELECT equivalente al UPDATE (mismo WHERE): cuántas filas cambiarían y cuántas no. */
export function sqlEnsayo(pares: Par[]): string {
  return `WITH "v"("id", "g") AS (VALUES ${sqlValores(pares)}) SELECT COUNT(*) AS "propuestas", ` +
    `SUM(CASE WHEN "c"."id" IS NOT NULL AND "c"."geonameid" IS NULL THEN 1 ELSE 0 END) AS "se_actualizarian", ` +
    `SUM(CASE WHEN "c"."id" IS NULL THEN 1 ELSE 0 END) AS "no_existen", ` +
    `SUM(CASE WHEN "c"."geonameid" = "v"."g" THEN 1 ELSE 0 END) AS "ya_iguales", ` +
    `SUM(CASE WHEN "c"."geonameid" IS NOT NULL AND "c"."geonameid" <> "v"."g" THEN 1 ELSE 0 END) AS "ya_distintos", ` +
    `(SELECT COUNT(*) FROM "City" WHERE "geonameid" IS NOT NULL) AS "con_geonameid" ` +
    `FROM "v" LEFT JOIN "City" "c" ON "c"."id" = "v"."id"`;
}

/**
 * REQ-472: geonameid compartidos por más de una ciudad. Con `prever`, como quedarían si se aplica el SQL
 * (cada id solo toma el valor propuesto si hoy está vacío). `toca` = 1 si el grupo incluye una fila que el cambio llena.
 */
export function sqlRepetidos(pares: Par[], prever: boolean): string {
  const con = prever && pares.length > 0;
  const v = con ? `WITH "v"("id", "g") AS (VALUES ${sqlValores(pares)}) ` : "";
  const g = con ? `COALESCE("c"."geonameid", "v"."g")` : `"c"."geonameid"`;
  const toca = con ? `MAX(CASE WHEN "c"."geonameid" IS NULL AND "v"."g" IS NOT NULL THEN 1 ELSE 0 END)` : "0";
  const join = con ? ` LEFT JOIN "v" ON "v"."id" = "c"."id"` : "";
  return `${v}SELECT ${g} AS "g", GROUP_CONCAT("c"."id") AS "ids", GROUP_CONCAT("c"."countryId") AS "paises", ` +
    `${toca} AS "toca" FROM "City" "c"${join} WHERE ${g} IS NOT NULL GROUP BY ${g} HAVING COUNT(*) > 1 ORDER BY 1`;
}

/** REQ-472: grupos de ids de FREETOUR que son la misma ciudad (src/geo/data/city-aliases.csv, firmados por PR). */
export function gruposAlias(csv: string): number[][] {
  const grupos = new Map<string, number[]>();
  for (const l of csv.split("\n")) {
    const f = l.trim().split(",");
    if (f[0] !== "freetour" || f.length < 4) continue;
    grupos.set(f[2], [...(grupos.get(f[2]) ?? []), Number(f[1])]);
  }
  return [...grupos.values()].filter((g) => g.length > 1);
}

/**
 * REQ-472: repetidos que el cambio crea o amplía (toca = 1) y que no son alias firmados ni tienen permiso
 * explícito del PO (input `permitir_repetidos`). Los que ya existían y el cambio no toca se reportan aparte.
 */
export function repetidosNoPermitidos(rs: Repetido[], alias: number[][], permitidos: number[]): Repetido[] {
  return rs.filter((r) => {
    if (Number(r.toca) !== 1 || permitidos.includes(Number(r.g))) return false;
    const ids = String(r.ids).split(",").map(Number);
    return !alias.some((a) => ids.every((id) => a.includes(id)));
  });
}

/** REQ-472: después de escribir, un grupo de repetidos es nuevo (toca = 1) si antes no existía con esas mismas ciudades. */
export function marcarNuevos(antes: Repetido[], despues: Repetido[]): Repetido[] {
  const clave = (r: Repetido) => `${r.g}:${String(r.ids).split(",").map(Number).sort((x, y) => x - y).join(",")}`;
  const previos = new Set(antes.map(clave));
  return despues.map((r) => ({ ...r, toca: previos.has(clave(r)) ? 0 : 1 }));
}

// ---- REQ-473: país y región propios de la ciudad y alias (geo-v2-0016.sql), corrida aparte con escribir_pais=true ----

export type CambioPais = { id: number; col: "countryCode" | "regionCode"; val: string };
export type Alias = { providerCityId: number; cityId: number };
export type FilaPais = CambioPais & { crudo: string | null };

const PAIS = /^UPDATE "City" SET "(countryCode|regionCode)" = '([A-Z]{2}(?:-[A-Z]{3})?)' WHERE "id" = ([1-9]\d{0,9}) AND "(countryCode|regionCode)" IS NULL;$/;
const ALIAS = /^INSERT OR IGNORE INTO "CityAlias" \("provider", "providerCityId", "cityId"\) VALUES \('freetour', ([1-9]\d{0,9}), ([1-9]\d{0,9})\);$/;

/** REQ-473: solo UPDATE que llena countryCode/regionCode vacíos e INSERT OR IGNORE de alias de freetour. */
export function leerSqlPais(texto: string): { cambios: CambioPais[]; alias: Alias[] } {
  const cambios: CambioPais[] = [];
  const alias: Alias[] = [];
  const vistos = new Set<string>();
  texto.split("\n").forEach((cruda, i) => {
    const linea = cruda.replace(/\r$/, "");
    if (linea.trim() === "" || /^--[^\n]*$/.test(linea)) return;
    const m = PAIS.exec(linea);
    const a = ALIAS.exec(linea);
    if (m && m[1] === m[4]) {
      const c = { id: Number(m[3]), col: m[1] as CambioPais["col"], val: m[2] };
      if ((c.col === "countryCode") !== /^[A-Z]{2}$/.test(c.val)) throw new Error(`línea ${i + 1}: valor ${c.val} no va en ${c.col}`);
      const k = `${c.col}:${c.id}`;
      if (vistos.has(k)) throw new Error(`línea ${i + 1}: ${k} repetido`);
      vistos.add(k);
      cambios.push(c);
    } else if (a) {
      alias.push({ providerCityId: Number(a[1]), cityId: Number(a[2]) });
    } else throw new Error(`línea ${i + 1}: no es una sentencia permitida: ${linea.slice(0, 120)}`);
  });
  if (cambios.length + alias.length === 0) throw new Error("el SQL no trae ninguna fila");
  return { cambios, alias };
}

/** REQ-473: SELECT equivalente: valor de hoy y país crudo de FREETOUR de cada ciudad que se tocaría. */
export function sqlEnsayoPais(cambios: CambioPais[]): string {
  const v = cambios.map((c) => `(${c.id}, '${c.col}', '${c.val}')`).join(", ");
  return `WITH "v"("id", "col", "val") AS (VALUES ${v}) SELECT "v"."id", "v"."col", "v"."val", "k"."code" AS "crudo", ` +
    `CASE "v"."col" WHEN 'countryCode' THEN "c"."countryCode" ELSE "c"."regionCode" END AS "hoy", ` +
    `"c"."id" IS NOT NULL AS "existe" FROM "v" LEFT JOIN "City" "c" ON "c"."id" = "v"."id" ` +
    `LEFT JOIN "Country" "k" ON "k"."id" = "c"."countryId" ORDER BY "v"."id", "v"."col"`;
}

/** REQ-473: alias que ya existen y si su ciudad canónica existe. */
export function sqlEnsayoAlias(alias: Alias[]): string {
  const v = alias.map((a) => `(${a.providerCityId}, ${a.cityId})`).join(", ");
  return `WITH "v"("p", "c") AS (VALUES ${v}) SELECT "v"."p" AS "providerCityId", "v"."c" AS "cityId", ` +
    `"a"."cityId" AS "hoy", (SELECT COUNT(*) FROM "City" WHERE "id" = "v"."c") AS "canonica_existe" ` +
    `FROM "v" LEFT JOIN "CityAlias" "a" ON "a"."provider" = 'freetour' AND "a"."providerCityId" = "v"."p" ORDER BY 1`;
}

/**
 * REQ-473 (REQ-134, REQ-142): el país crudo de FREETOUR debe seguir siendo el firmado; si no, nada se escribe.
 * countryOv = country-overrides.csv (crudo → país y región); cityOv = city-country-overrides.csv (ciudad → crudo y país).
 */
export function revisarPais(filas: FilaPais[], countryOv: string, cityOv: string): string[] {
  const filasCsv = (t: string) => t.split("\n").filter((l) => l.startsWith("freetour,")).map((l) => l.split(","));
  const porCrudo = new Map(filasCsv(countryOv).map((f) => [f[2], { pais: f[3], region: f[4] }]));
  const porCiudad = new Map(filasCsv(cityOv).map((f) => [Number(f[1]), { crudo: f[2], pais: f[3] }]));
  const errores: string[] = [];
  for (const f of filas) {
    const ciudad = porCiudad.get(Number(f.id));
    const pais = porCrudo.get(String(f.crudo));
    const esperado = f.col === "countryCode"
      ? (ciudad && ciudad.crudo === f.crudo ? ciudad.pais : pais?.pais)
      : pais?.region;
    if (!esperado || esperado !== f.val) errores.push(`ciudad ${f.id}: ${f.col} = ${f.val} no cuadra con el país crudo ${f.crudo ?? "(sin ciudad)"}`);
  }
  return errores;
}
