// Prueba de reservas contra Freetour, desde el servidor (IP registrada).
// Se corre en cPanel → Setup Node.js App → pasarela → "Run JS script":
//   prueba           consulta y cancela las 2 reservas de prueba (tour 6782 de Mpika, de Freetour)
//   prueba-completa  además crea una reserva nueva en Mpika, la consulta, la edita y la cancela
// No imprime el token ni la contraseña. Mpika (City ID 4755) es el destino de prueba que indicó Freetour.
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createFreetourClient } from "../lib/freetour.js";
import { diagnosticCalls, summarize } from "../lib/diagnostic.js";

const here = dirname(fileURLToPath(import.meta.url));
const envFile = join(here, "..", ".env");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const arg = (k) => (process.argv.find((x) => x.startsWith(`--${k}=`)) ?? "").split("=")[1];
const version = arg("version") || "2.0"; // --version=2.1 para probar la v2.1
const baseUrl = (process.env.FREETOUR_BASE_URL || "https://secure.freetour.com/partnersAPI/v.2.0").replace(/v\.2\.\d$/, `v.${version}`);
const localAddress = process.env.FREETOUR_LOCAL_ADDRESS || undefined;
const altUrl = (process.env.FREETOUR_ALT_BASE_URL || "https://www.freetour.com/partnersAPI/v.2.0").replace(/v\.2\.\d$/, `v.${version}`);
const completa = process.argv.includes("--completa");
const TEST_TOUR = 6782;
const RESERVAS_PRUEBA = [
  { refNumber: "6782-20261103000835-765", eventId: 631715584, adults: 1, children: 0 },
  { refNumber: "6782-20261030162746-244", eventId: 631716684, adults: 1, children: 0 },
];

const out = (titulo, res) => console.log(`\n== ${titulo}\nHTTP ${res.status}\n${JSON.stringify(res.json, null, 2).slice(0, 1500)}`);

// REQ-020 (INC-002): --diagnostico --ref=<refNumber> --event=<eventId> [--adults=1] [--children=0]
// Hace con la MISMA reserva: consulta, evento para editar, editar sin cambios y cancelar; en v2.0 y v2.2.
async function diagnostico() {
  const r = { refNumber: arg("ref"), eventId: Number(arg("event")), adults: Number(arg("adults") || 1), children: Number(arg("children") || 0) };
  if (!r.refNumber || !r.eventId) return console.log("Uso: --diagnostico --ref=<refNumber> --event=<eventId>");
  for (const v of ["2.0", "2.2"]) {
    const url = baseUrl.replace(/v\.2\.\d$/, `v.${v}`);
    console.log(`\n######## API ${url} · IP de salida: ${localAddress ?? "(la del servidor)"} · ${new Date().toISOString()}`);
    const ft = createFreetourClient({ baseUrl: url, email: process.env.FREETOUR_EMAIL, password: process.env.FREETOUR_PASSWORD, localAddress });
    const res = [];
    for (const c of diagnosticCalls(r)) {
      const x = await ft.call(c.method, c.path, c.body);
      res.push(x);
      console.log(`\n== ${c.label}\nPETICIÓN: ${c.method} ${c.path}${c.body ? ` ${JSON.stringify(c.body)}` : ""}\nRESPUESTA: HTTP ${x.status} ${JSON.stringify(x.json).slice(0, 800)}`);
      if (c.path === "/booking/cancel" && x.status === 200) break;
    }
    console.log(`\n>> CONCLUSIÓN v${v}: ${summarize(res)}`);
    if (res[3]?.status === 200) break; // ya se canceló; no repetir en la otra versión
  }
}

async function main() {
  if (process.argv.includes("--diagnostico")) return diagnostico();
  if (!process.env.FREETOUR_EMAIL || !process.env.FREETOUR_PASSWORD) {
    console.log("Faltan FREETOUR_EMAIL o FREETOUR_PASSWORD en las variables de la app.");
    process.exit(1);
  }
  console.log(`Prueba de reservas · ${new Date().toISOString()}`);
  console.log(`API: ${baseUrl} · IP de salida: ${localAddress ?? "(la del servidor)"}`);
  const ft = createFreetourClient({ baseUrl, email: process.env.FREETOUR_EMAIL, password: process.env.FREETOUR_PASSWORD, localAddress });

  for (const r of RESERVAS_PRUEBA) {
    const antes = await ft.call("GET", `/booking/${encodeURIComponent(r.refNumber)}`);
    out(`Consultar ${r.refNumber}`, antes);
    const d = antes.json?.data;
    if (antes.status === 200 && d?.status === "active" && Number(d.canBeCanceled) === 1) {
      const cancel = await ft.call("POST", "/booking/cancel", r);
      out(`Cancelar ${r.refNumber}`, cancel);
      // Diagnóstico: si el host principal responde 403, se prueba una vez en el otro host de producción.
      if (cancel.status === 403 && altUrl !== baseUrl) {
        console.log(`\n(403 en ${baseUrl}; se intenta en ${altUrl})`);
        const alt = createFreetourClient({ baseUrl: altUrl, email: process.env.FREETOUR_EMAIL, password: process.env.FREETOUR_PASSWORD, localAddress });
        out(`Cancelar ${r.refNumber} en el otro host`, await alt.call("POST", "/booking/cancel", r));
      }
      out(`Consultar de nuevo ${r.refNumber}`, await ft.call("GET", `/booking/${encodeURIComponent(r.refNumber)}`));
    } else {
      console.log(`(No se intenta cancelar: status=${d?.status ?? "?"}, canBeCanceled=${d?.canBeCanceled ?? "?"})`);
    }
  }

  if (completa) {
    const ev = await ft.call("GET", `/tours/${TEST_TOUR}/events`);
    const ahora = Date.now() + 26 * 3600 * 1000; // al menos 26 h de anticipación
    const evento = (ev.json?.data ?? []).find((e) => Date.parse(`${e.utcDate.replace(" ", "T")}Z`) > ahora);
    if (!evento) return console.log("\nNo hay eventos futuros en el tour de prueba; se omite la reserva nueva.");
    console.log(`\nEvento elegido: ${evento.id} · ${evento.date} · ${evento.language}`);
    const nueva = await ft.call("POST", "/booking", {
      eventId: Number(evento.id), adults: 1, children: 0, price: 0,
      customer: { email: process.env.PRUEBA_EMAIL || "travelpuzzlemexico@gmail.com", firstName: "Prueba", lastName: "Travel Puzzle" },
    });
    out("Crear reserva de prueba", nueva);
    const ref = nueva.json?.data?.refNumber;
    if (!ref) return;
    out(`Consultar ${ref}`, await ft.call("GET", `/booking/${encodeURIComponent(ref)}`));
    // Modo 2: editar (sin cambios y luego a 2 adultos) antes de cancelar.
    out(`Evento para editar ${ref}`, await ft.call("GET", `/event/${evento.id}/${encodeURIComponent(ref)}`));
    out(`Editar ${ref} (2 adultos)`, await ft.call("POST", "/booking/edit", { refNumber: ref, eventId: Number(evento.id), adults: 2, children: 0 }));
    out(`Consultar tras editar ${ref}`, await ft.call("GET", `/booking/${encodeURIComponent(ref)}`));
    out(`Cancelar ${ref}`, await ft.call("POST", "/booking/cancel", { refNumber: ref, eventId: Number(evento.id), adults: 2, children: 0 }));
    out(`Consultar de nuevo ${ref}`, await ft.call("GET", `/booking/${encodeURIComponent(ref)}`));
  }
  console.log("\nFin de la prueba.");
}

main().catch((e) => { console.log(`\nError: ${e.message}`); process.exit(1); });
