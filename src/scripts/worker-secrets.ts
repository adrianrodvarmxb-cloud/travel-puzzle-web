// REQ-155 (INC-006): arma el archivo JSON de secretos para `opennextjs-cloudflare upload --secrets-file`.
// Uso (en el workflow): npx tsx src/scripts/worker-secrets.ts <ruta-del-archivo>
// Nunca imprime valores: solo nombres. Los valores generados se enmascaran en el log de GitHub.
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { armarSecretos, nombresDeSecretos } from "../ops/lib/worker-secrets";

const ruta = process.argv[2];
if (!ruta) {
  console.error("Uso: worker-secrets.ts <ruta-del-archivo>");
  process.exit(1);
}

const lista = execFileSync("npx", ["wrangler", "secret", "list", "--format", "json"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "inherit"],
});
const existentes = nombresDeSecretos(lista);

const { secretos, generados } = armarSecretos({
  env: process.env,
  existentes,
  generar: () => randomBytes(32).toString("base64"),
});
for (const n of generados) console.log(`::add-mask::${secretos[n]}`);

writeFileSync(ruta, JSON.stringify(secretos), { mode: 0o600 });
console.log(`Secretos existentes en el Worker: ${existentes.join(", ") || "(ninguno)"}`);
console.log(`Secretos que viajan con la versión: ${Object.keys(secretos).join(", ")}`);
if (generados.length) console.log(`Generados por primera vez: ${generados.join(", ")}`);
