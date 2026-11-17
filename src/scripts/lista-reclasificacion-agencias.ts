// REQ-10748 (decisión 13, REQ-10592): lista antes/después de la reclasificación de cada agencia, para firma del PO.
// Solo lectura: lee imports/*.json y los mapeos del repo; escribe docs/taxonomia/reclasificacion-agencias-<fecha>/README.md.
//   npx tsx src/scripts/lista-reclasificacion-agencias.ts [carpeta de salida]
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { AGENCY_PROVIDER } from "../ingest/lib/import-archive";
import { reclasificarAgencia, resumenReclasificacion, type EntradaAgencia, type FilaReclasificacion } from "../taxonomy/lib/reclasificacion-agencia";

const hoy = new Date().toISOString().slice(0, 10);
const out = process.argv[2] ?? join("docs", "taxonomia", `reclasificacion-agencias-${hoy}`);
mkdirSync(out, { recursive: true });

const porProveedor = new Map<string, { nombre: string; entradas: EntradaAgencia[] }>();
for (const f of readdirSync("imports").filter((n) => n.endsWith(".json")).sort()) {
  const d = JSON.parse(readFileSync(join("imports", f), "utf8")) as { agency: { id: string; name: string }; trips: EntradaAgencia[] };
  const prov = AGENCY_PROVIDER[d.agency.id];
  if (!prov) { console.error(`${f}: agencia ${d.agency.id} sin proveedor conocido; se omite`); continue; }
  const acc = porProveedor.get(prov) ?? { nombre: d.agency.name, entradas: [] };
  acc.entradas.push(...(d.trips ?? []));
  porProveedor.set(prov, acc);
}

const esc = (s: string) => s.replace(/\|/g, "\\|");
const md: string[] = [
  `# Reclasificación por agencia: lista antes/después para firma del PO (REQ-10748)`,
  ``,
  `Decisión 13 (REQ-10592, firmada el 14-11-2026): «Antes de aplicar cada una se le muestra la lista de cambios y de dudas». **Antes** = cómo clasifica hoy el sitio un viaje de agencia (mapeo \`propios\` por \`kind\`). **Después** = con el mapeo firmado de la agencia (\`src/taxonomy/data/mapping/<agencia>.json\`) desde su denominación original (\`originalOf\`). Sin denominación original o con categoría \`por-revisar\`, el viaje se queda como hoy y se anota como duda. Generado con \`npx tsx src/scripts/lista-reclasificacion-agencias.ts\` el ${hoy}; **no está aplicado**.`,
  ``,
  `## Resumen`,
  ``,
  `| Agencia | Viajes | Cambian de formato | Igual | Dudas (se quedan como hoy) | Movimientos |`,
  `|---|---|---|---|---|---|`,
];
const detalle: string[] = [];
const resumenJson: Record<string, unknown> = {};
for (const [prov, { nombre, entradas }] of [...porProveedor.entries()].sort()) {
  let filas: FilaReclasificacion[];
  try { filas = reclasificarAgencia(prov, entradas); } catch (e) { md.push(`| ${nombre} (${prov}) | ${entradas.length} | — | — | — | ${(e as Error).message} |`); continue; }
  const r = resumenReclasificacion(filas);
  resumenJson[prov] = r;
  md.push(`| ${nombre} (\`${prov}\`) | ${r.viajes} | ${r.cambian} | ${r.igual} | ${r.dudas} | ${Object.entries(r.movimientos).map(([k, v]) => `${k}: ${v}`).join("; ") || "—"} |`);
  detalle.push(``, `## ${nombre} (\`${prov}\`)`, ``, `Firma del PO: _pendiente_ (A = aplicar · B = no aplicar · C = aplicar salvo las filas que indique).`, ``);
  const cambios = filas.filter((f) => f.cambia);
  if (cambios.length) {
    detalle.push(`### Cambian (${cambios.length})`, ``, `| Clave | Viaje | Denominación original | Antes | Después | Temas después |`, `|---|---|---|---|---|---|`);
    for (const f of cambios) detalle.push(`| ${esc(f.id)} | ${esc(f.titulo)} | ${esc(f.original ?? "")} | ${f.antes} | **${f.despues}** | ${f.temasDespues.join(", ")} |`);
    detalle.push(``);
  } else detalle.push(`### Cambian: ninguno (el mapeo firmado coincide con la clasificación de hoy)`, ``);
  const dudas = filas.filter((f) => f.duda);
  if (dudas.length) {
    detalle.push(`### Dudas: se quedan como hoy (${dudas.length})`, ``, `| Clave | Viaje | Hoy | Motivo |`, `|---|---|---|---|`);
    for (const f of dudas) detalle.push(`| ${esc(f.id)} | ${esc(f.titulo)} | ${f.antes} | ${esc(f.duda!)} |`);
    detalle.push(``);
  }
  writeFileSync(join(out, `${prov}.json`), JSON.stringify(filas, null, 2));
}
writeFileSync(join(out, "README.md"), [...md, ...detalle].join("\n") + "\n");
writeFileSync(join(out, "resumen.json"), JSON.stringify(resumenJson, null, 2));
console.log(`${porProveedor.size} agencias → ${out}/README.md`);
