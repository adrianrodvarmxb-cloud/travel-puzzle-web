/**
 * REQ-3464: I/O del workflow «Tangol: sync de tours (a mano)». No escribe en la base.
 *
 *   npx tsx src/scripts/tangol-sync.ts <carpeta-export> <carpeta-salida> [--escribir] [--reiniciar] [--lote N]
 *
 * <carpeta-export>: lo que el workflow exportó de D1 EN SOLO LECTURA (countries.json, cities.json,
 * sync.json, con la salida tal cual de `wrangler d1 execute --json`).
 * <carpeta-salida>: reporte.json (y, solo con --escribir, tangol.sql para que el workflow lo aplique).
 *
 * Por omisión es ENSAYO: lee Tangol, planea y cuenta lo que haría; no genera SQL ni toca nada.
 * Con --escribir solo GENERA el archivo .sql; aplicarlo es un paso aparte del workflow, con la
 * casilla marcada y el OK del PO (candado: datos de producción).
 *
 * La bandera de la pasarela es propia del sync (`TANGOL_SYNC_ENABLED`), no la del sitio: la de
 * `wrangler.jsonc` (`TANGOL_ENABLED`) gobierna qué ve el público (gate C, REQ-1625); se enciende en su
 * propio PR (REQ-3506) con preview, humo y OK del PO.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createFileRawArchive } from "../ingest/file-raw-archive";
import { archiveTangolResponse } from "../ingest/tangol-archive";
import { createTangolApi, type TangolReadOp } from "../tangol/api";
import { tangolConfig } from "../tangol/lib/config";
import { agencyTripsFromImport, type AgencyTripPlace } from "../tangol/lib/catalog-rules";
import { DEFAULT_RATES_CURRENCY, runTangolSyncStep } from "../tangol/sync";
import { formatTourCountCheck, formatTourCountDetail } from "../tangol/lib/tour-count";
import { formatCurrencyReport } from "../tangol/lib/currency-report";
import {
  createTangolSqlRepo,
  readExportRows,
  toExistingCities,
  toExistingCountries,
  toSyncState,
} from "../tangol/repository";

const args = process.argv.slice(2);
const escribir = args.includes("--escribir");
const reiniciar = args.includes("--reiniciar"); // REQ-10518
const posicionales: string[] = [];
let lote: number | undefined;
let copia: string | undefined;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--lote") lote = Number(args[++i]);
  else if (args[i] === "--copia") copia = args[++i];
  else if (!args[i].startsWith("--")) posicionales.push(args[i]);
}
const [entrada, salida] = posicionales;

if (!entrada || !salida) {
  console.log("Uso: tangol-sync.ts <carpeta-export> <carpeta-salida> [--escribir] [--reiniciar] [--lote N] [--copia <carpeta>]");
  process.exit(1);
}

const config = tangolConfig({
  TANGOL_ENABLED: process.env.TANGOL_SYNC_ENABLED,
  GATEWAY_URL: process.env.GATEWAY_URL,
  GATEWAY_SECRET: process.env.GATEWAY_SECRET,
});
if (!config) {
  console.log("::error::Sin pasarela: hace falta TANGOL_SYNC_ENABLED=true, GATEWAY_URL y GATEWAY_SECRET. No se corre nada.");
  process.exit(1);
}

const json = (file: string) => JSON.parse(readFileSync(join(entrada, file), "utf8"));

/** Viajes de agencia que ya existen (REQ-3374). Salen de los archivos de carga versionados. */
function agencyTrips(): AgencyTripPlace[] {
  const dir = "imports";
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .flatMap((f) => {
      try {
        return agencyTripsFromImport(JSON.parse(readFileSync(join(dir, f), "utf8")));
      } catch {
        console.log(`Aviso: no se pudo leer imports/${f}; se ignora.`);
        return [];
      }
    });
}

(async () => {
  const repo = createTangolSqlRepo({
    countries: toExistingCountries(readExportRows(json("countries.json"))),
    cities: toExistingCities(readExportRows(json("cities.json"))),
    state: toSyncState(readExportRows(json("sync.json"))),
  });

  // REQ-3519: copia exacta (solo con --escribir y --copia). Los objetos van a <copia>/objetos (fuera del
  // artefacto público: llevan el neto) y el índice a <copia>/provider-record.sql; el workflow los aplica después.
  const runId = `tangol-${process.env.GITHUB_RUN_ID ?? Date.now()}`;
  const ahora = new Date();
  const archivo =
    escribir && copia
      ? createFileRawArchive({
          exportRows: existsSync(join(entrada, "provider-record.json")) ? json("provider-record.json") : [],
          writeObject: (key, body) => {
            const destino = join(copia!, "objetos", key);
            mkdirSync(dirname(destino), { recursive: true });
            writeFileSync(destino, body);
          },
        })
      : null;
  const copiaReporte = { written: 0, revisited: 0, same: 0, failed: 0 };
  const onRaw = archivo
    ? async (op: TangolReadOp, params: Record<string, unknown>, body: unknown) => {
        // REQ-10528: el detalle aún no se archiva en R2 (TangolOperation no lo conoce); se lee y se usa, sin copia.
        if (op === "getTourDetailsList") return;
        const r = await archiveTangolResponse(archivo.archive, {
          operation: op,
          body,
          params: params as Record<string, string | number | null | undefined>,
          runId,
          now: ahora,
        });
        if (r) for (const k of ["written", "revisited", "same", "failed"] as const) copiaReporte[k] += r[k];
      }
    : undefined;

  // REQ-10510: moneda de las tarifas; por omisión USD (DEFAULT_RATES_CURRENCY). Se cambia con la casilla «moneda» del workflow.
  const ratesCurrency = (process.env.TANGOL_RATES_CURRENCY ?? "").trim() || DEFAULT_RATES_CURRENCY;
  const report = await runTangolSyncStep({
    api: createTangolApi({ config, fetch, onRaw }),
    repo,
    now: new Date(),
    agencyTrips: agencyTrips(),
    ensayo: !escribir,
    reiniciar,
    ratesCurrency,
    ...(lote !== undefined && Number.isFinite(lote) && lote > 0 ? { batch: lote } : {}),
  });

  mkdirSync(salida, { recursive: true });
  writeFileSync(join(salida, "reporte.json"), JSON.stringify(report, null, 2));

  const c = report.conteo;
  console.log(`Modo: ${escribir ? "ESCRIBIR (genera el SQL; aplicarlo es otro paso)" : "ENSAYO (no escribe nada)"}`);
  console.log(`Acción: ${report.action}${report.lote ? ` · destinos ${report.lote.from}-${report.lote.to} de ${report.totalDestinos}` : ` · ${report.totalDestinos} destinos`}`);
  if (c) {
    console.log(`Destinos del lote: ${c.destinos} (pendientes ${c.destinosPendientes}) · ciudades nuevas: ${c.ciudadesNuevas}`);
    console.log(`Tours vistos: ${c.tours} → se escribirían ${c.escritos}; excluidos por reglas ${c.excluidos}; descartados ${c.descartados}; inválidos ${report.invalidos}`);
  }
  // REQ-10510: la moneda que devolvió Tangol se ve en el resumen (la pedida no garantiza la devuelta).
  console.log(formatCurrencyReport(report));
  // REQ-3505: la diferencia entre lo que dice cada destino y lo que llegó nunca pasa callada.
  if (report.cuadre) {
    console.log(formatTourCountCheck(report.cuadre));
    for (const l of formatTourCountDetail(report.cuadre)) console.log(l);
    if (report.cuadre.destinos.length) console.log(`::warning::${formatTourCountCheck(report.cuadre)}`);
  }
  console.log(`Países nuevos:${report.paisesNuevos.map((p) => p.iso2).join(", ") || "ninguno"}`);
  for (const p of report.ciudadesPendientes) console.log(`Pendiente: destino ${p.externalId} «${p.name}» (${p.countryCode}) — ${p.reason}`);
  for (const e of report.errores) console.log(`Error contenido: ${e.donde} — ${e.error}`);

  if (escribir) {
    const stmts = repo.statements();
    const cabecera = `Tangol REQ-3463: ${stmts.length} sentencias · destinos ${report.lote?.from ?? "-"}-${report.lote?.to ?? "-"} de ${report.totalDestinos} · generado ${new Date().toISOString()}`;
    writeFileSync(join(salida, "tangol.sql"), repo.sql(cabecera));
    console.log(`SQL generado: ${stmts.length} sentencias en ${join(salida, "tangol.sql")} (NO aplicado).`);
  }

  if (archivo && copia) {
    mkdirSync(copia, { recursive: true });
    writeFileSync(join(copia, "llaves.txt"), archivo.keys().join("\n") + (archivo.keys().length ? "\n" : ""));
    writeFileSync(join(copia, "provider-record.sql"), archivo.sql(`Copia exacta de Tangol REQ-3519 · ${runId}`));
    console.log(`Copia exacta: ${copiaReporte.written} nuevas · ${copiaReporte.same} sin cambios · ${copiaReporte.failed} fallas (objetos en ${copia}/objetos; NO subidos todavía).`);
  }

  if (report.abortReason) {
    console.log(`::error::Paso detenido sin escribir: ${report.abortReason}`);
    process.exit(1);
  }
})();
