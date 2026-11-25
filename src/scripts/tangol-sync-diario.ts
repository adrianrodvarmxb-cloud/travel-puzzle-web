/**
 * REQ-10878: entrada del job diario del workflow «Tangol sync de tours» (etapa D2). Solo arma las dependencias reales
 * (procesos, archivos, reloj) y llama a `correrCicloDiario`; la decisión de seguir o parar vive en
 * `src/tangol/lib/diario-plan.ts` y el ciclo en `src/tangol/diario.ts`. Escribe el resumen en GITHUB_STEP_SUMMARY si existe.
 * Sale con código 1 si el ciclo terminó por un fallo (el workflow entonces no corre slugs ni humo y queda rojo).
 */
import { spawn } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { correrCicloDiario, type DiarioDeps } from "../tangol/diario";

const exec: DiarioDeps["exec"] = (cmd, args) =>
  new Promise((resolve) => {
    const p = spawn(cmd, args, { env: process.env, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    p.stdout.on("data", (d) => { out += String(d); });
    p.stderr.on("data", (d) => { out += String(d); });
    p.on("error", (e) => resolve({ code: 1, out: `${out}\n${e.message}` }));
    p.on("close", (code) => resolve({ code: code ?? 1, out }));
  });

const log = (linea: string) => {
  console.log(linea);
  if (process.env.GITHUB_STEP_SUMMARY && !linea.startsWith("::")) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${linea}\n`);
};

(async () => {
  const r = await correrCicloDiario({
    exec,
    leerTexto: (ruta) => (existsSync(ruta) ? readFileSync(ruta, "utf8") : null),
    escribirTexto: (ruta, contenido) => { mkdirSync(dirname(ruta), { recursive: true }); writeFileSync(ruta, contenido); },
    existe: existsSync,
    ahora: () => new Date(),
    log,
  });
  log(`Ciclo diario de Tangol: ${r.pasos.length} paso(s) · ${r.pasos.filter((p) => p.sqlAplicado).length} con SQL aplicado · fin: ${r.motivoFin}`);
  if (!r.ok) { console.log(`::error::El ciclo diario terminó por un fallo: ${r.motivoFin}`); process.exit(1); }
})();
