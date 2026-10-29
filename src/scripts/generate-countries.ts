/**
 * Genera data/countries.json desde GET /countries de Freetour.
 *
 * Uso: FREETOUR_EMAIL=... FREETOUR_PASSWORD=... [FREETOUR_ENV=production] npm run countries:generate
 * En GitHub lo corre el workflow "Generar países" con los secretos del repo.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createFreetourApi } from "../freetour/api";
import { resolveFreetourConfig } from "../freetour/lib/hosts";
import { toCountriesFile } from "../freetour/lib/countries";

async function main() {
  const config = resolveFreetourConfig(process.env);
  const api = createFreetourApi({ config, fetch });
  const countries = toCountriesFile(await api.get("/countries"));

  const file = path.join(process.cwd(), "data", "countries.json");
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(countries, null, 2) + "\n");
  console.log(`✅ ${countries.length} países (${config.environment}) → ${path.relative(process.cwd(), file)}`);
}

main().catch((error) => {
  console.error("❌ No se generó data/countries.json:", error.message);
  process.exit(1);
});
