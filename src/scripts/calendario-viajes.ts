// REQ-10866: I/O del workflow «Calendario de viajes» (plan REQ-3454 G5, un proveedor por corrida). No habla con D1:
// lee la salida de wrangler, arma el SQL y verifica.
//   npx tsx src/scripts/calendario-viajes.ts ids <archivo.json>                        → ids entre comillas para el SELECT
//   npx tsx src/scripts/calendario-viajes.ts agencia <archivo.json>                    → id de la agencia
//   npx tsx src/scripts/calendario-viajes.ts preparar <archivo.json> <filas.json> <dir> → plan.json, calendario.sql, regreso.sql
//   npx tsx src/scripts/calendario-viajes.ts verificar <despues.json> <plan.json>       → exit 1 si una fila no quedó con su valor
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { leerArchivoCalendario, planCalendario, verificarCalendario, type FilaViaje, type PlanCalendario } from "../trips/lib/calendario-carga";

const [cmd, a, b, c] = process.argv.slice(2);
const results = (file: string) => (JSON.parse(readFileSync(file, "utf8")) as { results: Record<string, unknown>[] }[])[0]?.results ?? [];
const archivo = (file: string) => leerArchivoCalendario(JSON.parse(readFileSync(file, "utf8")));
const idDe = (initials: string, ref: string) => `${initials}-${ref}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");

if (cmd === "ids" && a) {
  const ar = archivo(a);
  console.log(ar.trips.map((t) => `'${idDe(ar.agency.initials, t.ref)}'`).join(","));
} else if (cmd === "agencia" && a) {
  console.log(archivo(a).agency.id);
} else if (cmd === "preparar" && a && b && c) {
  const ar = archivo(a);
  const filas: FilaViaje[] = results(b).map((r) => ({ id: String(r.id), status: String(r.status), options: r.options, availability: r.availability }));
  const plan = planCalendario(ar, filas);
  mkdirSync(c, { recursive: true });
  writeFileSync(join(c, "respaldo.json"), JSON.stringify(results(b), null, 1));
  writeFileSync(join(c, "plan.json"), JSON.stringify(plan, null, 1));
  writeFileSync(join(c, "calendario.sql"), plan.sql);
  writeFileSync(join(c, "regreso.sql"), plan.regreso);
  const filasResumen = plan.resumen
    .map((r) => `| ${r.ref} | ${r.diasOfrecidos} | ${r.porConfirmar} | ${r.precioMin ?? "—"} | ${r.precioMax ?? "—"} | ${plan.cambios.some((x) => x.id === r.id) ? "sí" : "igual"} |`)
    .join("\n");
  console.log(
    `## Calendario de viajes (REQ-10866) · ${ar.agency.id}\n\n- Viajes en el archivo: ${ar.trips.length}\n- Leídos en D1: ${filas.length}\n- Cambian: **${plan.cambios.length}**\n- No están en D1 (no se tocan): ${plan.faltan.length}${plan.faltan.length ? ` — ${plan.faltan.join(", ")}` : ""}\n\n| Viaje | Días ofrecidos | Por confirmar | Precio público mín. | máx. | Cambia |\n|---|---|---|---|---|---|\n${filasResumen}`,
  );
} else if (cmd === "verificar" && a && b) {
  const plan = JSON.parse(readFileSync(b, "utf8")) as PlanCalendario;
  const r = verificarCalendario(plan, results(a).map((x) => ({ id: String(x.id), availability: x.availability })));
  console.log(r.ok ? `Verificado en D1: ${plan.cambios.length} de ${plan.cambios.length} con su calendario.` : `NO quedaron con su valor: ${r.mal.join(", ")}`);
  if (!r.ok) process.exit(1);
} else {
  console.error("uso: ids <archivo> | agencia <archivo> | preparar <archivo> <filas.json> <dir> | verificar <despues.json> <plan.json>");
  process.exit(2);
}
