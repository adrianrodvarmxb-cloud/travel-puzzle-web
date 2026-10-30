// Pasarela de reservas de Travel Puzzle.
// Corre en el servidor de Namecheap (cPanel → Setup Node.js App) para que las
// llamadas a Freetour salgan desde la IP registrada. Sin dependencias externas.
//
// Variables (en cPanel o en gateway/.env):
//   GATEWAY_SECRET           secreto compartido con el sitio (obligatorio)
//   FREETOUR_EMAIL           usuario de la API de Freetour (obligatorio)
//   FREETOUR_PASSWORD        contraseña de la API de Freetour (obligatorio)
//   FREETOUR_BASE_URL        por defecto producción v.2.0
//   FREETOUR_LOCAL_ADDRESS   IP de salida (opcional; p. ej. 66.29.153.81)
//   PORT                     lo pone cPanel
import http from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { handleRequest } from "./lib/handler.js";
import { createFreetourClient } from "./lib/freetour.js";

const MAX_BODY = 32 * 1024;
const here = dirname(fileURLToPath(import.meta.url));

// .env opcional junto a este archivo (no sobreescribe variables ya definidas)
const envFile = join(here, ".env");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const required = ["GATEWAY_SECRET", "FREETOUR_EMAIL", "FREETOUR_PASSWORD"];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`[pasarela] faltan variables: ${missing.join(", ")}`);
  process.exit(1);
}

const freetour = createFreetourClient({
  baseUrl: process.env.FREETOUR_BASE_URL || "https://secure.freetour.com/partnersAPI/v.2.0",
  email: process.env.FREETOUR_EMAIL,
  password: process.env.FREETOUR_PASSWORD,
  localAddress: process.env.FREETOUR_LOCAL_ADDRESS || undefined,
});

const log = (event, data) => console.log(JSON.stringify({ t: new Date().toISOString(), event, ...data }));

const server = http.createServer((req, res) => {
  let body = "";
  let tooBig = false;
  req.setEncoding("utf8");
  req.on("data", (chunk) => {
    body += chunk;
    if (body.length > MAX_BODY) { tooBig = true; req.destroy(); }
  });
  req.on("end", async () => {
    if (tooBig) return;
    // cPanel puede montar la app bajo una ruta (p. ej. /pasarela); solo cuenta el final.
    const path = new URL(req.url, "http://x").pathname.replace(/\/+$/, "").replace(/^.*(\/health|\/freetour)$/, "$1");
    const out = await handleRequest(
      { method: req.method, path, headers: req.headers, body },
      { secret: process.env.GATEWAY_SECRET, now: Date.now, freetour, log }
    );
    res.writeHead(out.status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    res.end(JSON.stringify(out.json));
  });
});

server.listen(process.env.PORT || 3000, () => log("inicio", { port: process.env.PORT || 3000 }));
