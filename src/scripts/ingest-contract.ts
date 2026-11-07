/**
 * REQ-563: compuerta del contrato de ingesta para un archivo de carga (lo corre el workflow «Importar viajes» ANTES de
 * preparar nada). Sale con 1 si el archivo no cumple: sin adaptador, mapeo o volátiles; un item que no pasa el esquema,
 * no se normaliza o no tiene clave de archivo crudo; o un viaje sin denominación original que no está en la línea base.
 *   npx tsx src/scripts/ingest-contract.ts imports/<archivo>.json
 */
import { readFileSync } from "node:fs";
import { adapterFor, blockingIssues, checkContract, type GapBaseline } from "../ingest/lib/contract";
import { providerOfAgency } from "../ingest/lib/import-archive";

const file = process.argv[2];
if (!file) { console.log("Uso: ingest-contract.ts imports/<archivo>.json"); process.exit(1); }
const bundle = JSON.parse(readFileSync(file, "utf8")) as { agency?: { id?: string }; trips?: unknown[] };
const provider = providerOfAgency(bundle.agency?.id ?? "") ?? `sin-proveedor:${bundle.agency?.id ?? "?"}`;
const baseline = (JSON.parse(readFileSync("src/ingest/data/contrato-huecos.json", "utf8")) as { huecos: GapBaseline }).huecos;
const issues = checkContract(adapterFor(provider), provider, Array.isArray(bundle.trips) ? bundle.trips : []);
const blocking = blockingIssues(issues, baseline);
const tolerated = issues.length - blocking.length;
console.log(`contrato de ingesta · ${file} · proveedor ${provider} · ${bundle.trips?.length ?? 0} items · ${tolerated} huecos de linaje en la línea base · ${blocking.length} bloqueantes`);
for (const i of blocking) console.log(`BLOQUEA ${i.kind} ${i.externalId ?? "-"}: ${i.detail}`);
process.exit(blocking.length ? 1 : 0);
