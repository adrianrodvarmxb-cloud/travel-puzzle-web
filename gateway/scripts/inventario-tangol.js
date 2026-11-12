// Inventario de Tangol desde el servidor (IP registrada). Solo lectura (REQ-1558).
// Se corre en cPanel → Setup Node.js App → pasarela → "Run JS script" → inventario-tangol.
// Imprime países y ciudades con su número de tours. No imprime token, correo ni clave.
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createTangolClient } from "../lib/tangol.js";
import { summarizeInventory, formatInventory } from "../lib/tangol-inventory.js";

const here = dirname(fileURLToPath(import.meta.url));
const envFile = join(here, "..", ".env");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

if (!process.env.TANGOL_EMAIL || !process.env.TANGOL_CLAVE) {
  console.error("Faltan TANGOL_EMAIL y TANGOL_CLAVE en las variables de la app.");
  process.exit(1);
}

const tangol = createTangolClient({
  baseUrl: process.env.TANGOL_BASE_URL || "https://tangolapi.tangol.com",
  email: process.env.TANGOL_EMAIL,
  clave: process.env.TANGOL_CLAVE,
  localAddress: process.env.FREETOUR_LOCAL_ADDRESS || undefined,
});

try {
  const countries = await tangol.call("GET", "/Tour/GetTourCountries");
  if (countries.status !== 200) throw new Error(`GetTourCountries respondió HTTP ${countries.status}`);
  const destinations = {};
  for (const c of countries.json?.ListCountries ?? []) {
    if (!c?.IsoCode) continue;
    const res = await tangol.call("GET", "/Tour/GetTourDestinations", { query: { "params.countryCode": c.IsoCode } });
    if (res.status === 200) destinations[c.IsoCode] = res.json;
    else console.error(`${c.IsoCode}: GetTourDestinations respondió HTTP ${res.status}`);
  }
  console.log(formatInventory(summarizeInventory(countries.json, destinations)));
} catch (error) {
  console.error(`No se pudo leer el inventario: ${error.message}`);
  process.exit(1);
}
