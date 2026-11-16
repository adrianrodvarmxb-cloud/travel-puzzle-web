/**
 * Ficha única, ola 4 «Geografía», decisión 27 (REQ-10605): coordenadas de la ciudad desde GeoNames.
 * Puro: sin base, sin fetch, sin archivos. El script y el workflow le pasan lo que leyeron.
 *
 * - REQ-10740: plan de llenado de `City.lat/lng/coordsSource` (migración 0035, REQ-10734). Primero GeoNames por
 *   `City.geonameid` (cruce v2, REQ-085/REQ-470…472); si la ciudad no tiene geonameid, la mediana de los puntos de
 *   encuentro de sus tours (`coordsSource = mediana`, misma regla que el mapa de hoy); si no hay ni una cosa ni la otra,
 *   queda sin dato (nunca un punto inventado). Solo se tocan filas con `lat IS NULL`: lo manual (REQ-10734) no se pisa.
 * - REQ-10741: copia de `City` antes de escribir y SQL de restauración que devuelve cada fila a lo que tenía
 *   (incluido NULL). El script simula por defecto: escribe el SQL, nunca lo ejecuta.
 */
import { cityPoints } from "@/map/lib/cities";
import type { LatLng } from "@/map/lib/coords";

export type CoordsSource = "geonames" | "manual" | "mediana";

/** Fila de `City` tal como la exporta `wrangler d1 execute --json`. */
export interface CityExport {
  id: number;
  geonameid: number | null;
  lat: number | null;
  lng: number | null;
  coordsSource?: string | null;
}

export interface PlanFila {
  id: number;
  lat: number;
  lng: number;
  coordsSource: Exclude<CoordsSource, "manual">;
  geonameid: number | null;
  /** Cuántos puntos de encuentro respaldan la mediana (0 para GeoNames). */
  puntos: number;
}

export interface PlanCoordenadas {
  plan: PlanFila[];
  /** Ciudades que ya tenían coordenadas: no se tocan. */
  yaConCoordenadas: number[];
  /** Ciudades sin geonameid y sin ningún punto de encuentro: quedan en NULL. */
  sinDato: number[];
  /** Ciudades con geonameid que GeoNames (cities15000) no trae: se intenta la mediana; si tampoco, van a sinDato. */
  geonameidSinFila: number[];
}

const round5 = (n: number) => Math.round(n * 1e5) / 1e5;
const enRango = (p: LatLng) => Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180 && !(p.lat === 0 && p.lng === 0);

/** REQ-10740: plan puro. `geo` = geonameid → lat/lng (de cities15000.txt); `tours` = (cityId, «lat,lng»). */
export function planCoordenadasCiudad(
  cities: ReadonlyArray<CityExport>,
  geo: ReadonlyMap<number, LatLng>,
  tours: ReadonlyArray<{ cityId: number; coords: string | null }>,
): PlanCoordenadas {
  const medianas = new Map(cityPoints([...tours]).map((p) => [p.cityId, p]));
  const out: PlanCoordenadas = { plan: [], yaConCoordenadas: [], sinDato: [], geonameidSinFila: [] };
  for (const c of cities) {
    if (typeof c.lat === "number" && typeof c.lng === "number") {
      out.yaConCoordenadas.push(c.id);
      continue;
    }
    const g = c.geonameid !== null && c.geonameid !== undefined ? geo.get(c.geonameid) : undefined;
    if (g && enRango(g)) {
      out.plan.push({ id: c.id, lat: round5(g.lat), lng: round5(g.lng), coordsSource: "geonames", geonameid: c.geonameid, puntos: 0 });
      continue;
    }
    if (c.geonameid !== null && c.geonameid !== undefined) out.geonameidSinFila.push(c.id);
    const m = medianas.get(c.id);
    if (m && enRango(m)) {
      out.plan.push({ id: c.id, lat: m.lat, lng: m.lng, coordsSource: "mediana", geonameid: c.geonameid ?? null, puntos: m.tours });
      continue;
    }
    out.sinDato.push(c.id);
  }
  out.plan.sort((a, b) => a.id - b.id);
  return out;
}

const num = (n: number) => {
  if (!Number.isFinite(n)) throw new Error(`coordenada inválida: ${n}`);
  return String(n);
};

/** REQ-10740: una línea de UPDATE por ciudad; solo escribe donde `lat IS NULL` (no pisa lo manual ni lo ya llenado). */
export function lineaSqlCoordenadas(f: PlanFila): string {
  return `UPDATE "City" SET "lat" = ${num(f.lat)}, "lng" = ${num(f.lng)}, "coordsSource" = '${f.coordsSource}' WHERE "id" = ${f.id} AND "lat" IS NULL;`;
}

/** Lo único que el workflow deja pasar (misma defensa que `geo-escribir-geonameid.yml`). */
export const SQL_COORDENADAS_PERMITIDO =
  /^(--.*|UPDATE "City" SET "lat" = -?\d+(\.\d+)?, "lng" = -?\d+(\.\d+)?, "coordsSource" = '(geonames|mediana)' WHERE "id" = \d+ AND "lat" IS NULL;|)$/;

/** REQ-10740: valida el SQL línea por línea; devuelve las líneas que no pasan (vacío = todo bien). */
export function lineasSqlNoPermitidas(sql: string, permitido: RegExp = SQL_COORDENADAS_PERMITIDO): string[] {
  return sql.split("\n").filter((l) => !permitido.test(l.trimEnd()));
}

/** REQ-10740: SQL completo del plan, con cabecera comentada y lotes para `--command` (D1 acepta varias sentencias). */
export function buildCoordenadasSql(plan: ReadonlyArray<PlanFila>, encabezado: string[] = []): string {
  return [...encabezado.map((l) => `-- ${l}`), ...plan.map(lineaSqlCoordenadas)].join("\n") + "\n";
}

export function lotes<T>(xs: ReadonlyArray<T>, n = 25): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n));
  return out;
}

/** Ensayo (solo lectura): cuántas filas del plan se escribirían hoy y cuántas ya tienen coordenadas. */
export function sqlEnsayoCoordenadas(plan: ReadonlyArray<PlanFila>): string {
  const ids = plan.map((f) => f.id).join(", ") || "-1";
  return (
    `SELECT ` +
    `(SELECT COUNT(*) FROM "City" WHERE "id" IN (${ids}) AND "lat" IS NULL) AS se_actualizarian, ` +
    `(SELECT COUNT(*) FROM "City" WHERE "id" IN (${ids}) AND "lat" IS NOT NULL) AS ya_con_coordenadas, ` +
    `(SELECT COUNT(*) FROM "City" WHERE "lat" IS NOT NULL) AS con_coordenadas, ` +
    `(SELECT COUNT(*) FROM "City") AS ciudades;`
  );
}

/** REQ-10741: SQL de restauración desde la copia de `City` (id, lat, lng, coordsSource) tomada antes de escribir. */
export function lineaSqlRestaurar(c: CityExport): string {
  const v = (x: number | null | undefined) => (typeof x === "number" ? num(x) : "NULL");
  const s = c.coordsSource ? `'${String(c.coordsSource).replace(/'/g, "''")}'` : "NULL";
  return `UPDATE "City" SET "lat" = ${v(c.lat)}, "lng" = ${v(c.lng)}, "coordsSource" = ${s} WHERE "id" = ${c.id};`;
}

export const SQL_RESTAURAR_PERMITIDO = /^(--.*|UPDATE "City" SET "lat" = (-?\d+(\.\d+)?|NULL), "lng" = (-?\d+(\.\d+)?|NULL), "coordsSource" = ('[^']*'|NULL) WHERE "id" = \d+;|)$/;

export function buildRestaurarSql(copia: ReadonlyArray<CityExport>, encabezado: string[] = []): string {
  return [...encabezado.map((l) => `-- ${l}`), ...copia.map(lineaSqlRestaurar)].join("\n") + "\n";
}

/** Resumen legible del plan para el PR y el resumen del workflow. */
export function resumenPlan(p: PlanCoordenadas): string {
  const geonames = p.plan.filter((f) => f.coordsSource === "geonames").length;
  const mediana = p.plan.length - geonames;
  return [
    `Ciudades a llenar: ${p.plan.length} (GeoNames ${geonames}, mediana de puntos de encuentro ${mediana}).`,
    `Ya con coordenadas (no se tocan): ${p.yaConCoordenadas.length}.`,
    `Con geonameid que cities15000 no trae: ${p.geonameidSinFila.length}.`,
    `Sin dato (quedan en NULL): ${p.sinDato.length}.`,
  ].join("\n");
}
