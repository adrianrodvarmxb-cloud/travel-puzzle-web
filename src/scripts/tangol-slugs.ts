/**
 * REQ-10509: slugs faltantes de los tours de Tangol. Solo GENERA <salida>/slugs.sql; aplicarlo es un paso del workflow.
 * Uso: npx tsx src/scripts/tangol-slugs.ts <carpeta-export> <carpeta-salida>
 *   <carpeta-export>/slugs-existentes.json: SELECT "id","providerId","externalId","slug" FROM "Tour" WHERE "slug" IS NOT NULL
 *   <carpeta-export>/tours-sin-slug.json:  tours de Tangol con "slug" IS NULL y sus títulos es/en
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readExportRows } from "@/tangol/repository";
import { slugsFaltantes, type TourSinSlug } from "@/tangol/lib/slugs";
import { renderSqlFile } from "@/lib/d1/sql-file";
import type { ExistingTour } from "@/destinations/lib/assign-slugs";

const [entrada, salida] = process.argv.slice(2);
if (!entrada || !salida) { console.error("Uso: tangol-slugs.ts <carpeta-export> <carpeta-salida>"); process.exit(2); }
const json = (f: string) => JSON.parse(readFileSync(join(entrada, f), "utf8"));
const existentes = readExportRows<ExistingTour>(json("slugs-existentes.json"));
const sinSlug = readExportRows<TourSinSlug>(json("tours-sin-slug.json")).map((t) => ({ ...t, externalId: Number(t.externalId) }));
const faltantes = slugsFaltantes(existentes, sinSlug);
mkdirSync(salida, { recursive: true });
writeFileSync(join(salida, "slugs.sql"), renderSqlFile(faltantes.map((f) => ({ sql: f.sql, params: f.params })), `Slugs de Tangol REQ-10509 · ${new Date().toISOString()}`));
console.log(`Slugs: ${sinSlug.length} tour(es) de Tangol sin slug → ${faltantes.length} sentencia(s) en ${join(salida, "slugs.sql")} (NO aplicado).`);
