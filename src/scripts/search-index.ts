/**
 * REQ-282: genera en el build el índice curado del buscador tolerante.
 * Lee data/search-aliases.json (alias y nombres cortos que chocan, revisados por PR), lo valida con Zod y escribe
 * src/search/data/search-index.generated.json con el índice SymSpell de los alias. Determinista: misma entrada,
 * mismo archivo (un test lo compara con el archivo versionado). Corre como `prebuild` y con `npm run search:index`.
 * Los nombres de destino del catálogo no están disponibles en el build (viven en D1): su índice se arma en el Worker
 * una vez por catálogo cargado (src/search/fuzzy.ts).
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildCuratedArtifact } from "../search/lib/aliases";

const root = process.cwd();
const src = path.join(root, "data", "search-aliases.json");
const out = path.join(root, "src", "search", "data", "search-index.generated.json");

const artifact = buildCuratedArtifact(JSON.parse(readFileSync(src, "utf8")));
if (artifact.rejected) {
  console.error(`❌ data/search-aliases.json tiene ${artifact.rejected} fila(s) inválida(s) o repetida(s).`);
  process.exit(1);
}
writeFileSync(out, JSON.stringify(artifact) + "\n");
console.log(`✅ índice curado: ${artifact.aliases.length} alias, ${artifact.noCorrect.length} sin corrección, ${Object.keys(artifact.index.deletes).length} borrados → ${path.relative(root, out)}`);
