/**
 * REQ-10878 · Ciclo diario de Tangol (etapa D2 del plan de actualización diaria). Raíz del dominio: hace el I/O del
 * workflow diario con sus dependencias por parámetro (`exec`, archivos, reloj, log) y repite por lotes lo mismo que el
 * workflow a mano hace paso a paso: export de D1 en solo lectura → plan + SQL (`tangol-sync.ts --escribir --copia`) →
 * copia exacta a R2 privado → índice (solo si la copia subió completa) → `tangol.sql` en D1; hasta `finish` o `idle`
 * (`siguientePasoDiario`). El bookmark de Time Travel, los slugs y el humo los hace el workflow alrededor del ciclo.
 * Nunca escribe si el paso abortó o no dejó reporte.
 */
import { siguientePasoDiario, type AccionPaso, type DecisionDiaria } from "./lib/diario-plan";

export interface ExecResult { code: number; out: string }

export interface DiarioDeps {
  /** Corre un comando (sin shell) y devuelve el código y la salida. Nunca lanza: un código distinto de 0 es un fallo. */
  exec: (cmd: string, args: string[], opts?: { stdin?: string }) => Promise<ExecResult>;
  leerTexto: (ruta: string) => string | null;
  escribirTexto: (ruta: string, contenido: string) => void;
  existe: (ruta: string) => boolean;
  ahora: () => Date;
  log: (linea: string) => void;
  /** Carpetas de trabajo (las mismas del workflow a mano). */
  carpetas?: { exportar: string; salida: string; copia: string };
  /** Base de D1 y bucket de R2 (nombres del workflow a mano). */
  d1?: string;
  bucket?: string;
}

const DEF = { exportar: "tmp/tangol-export", salida: "tmp/tangol-salida", copia: "tmp/tangol-copia" };
const D1 = "travel-puzzle";
const BUCKET = "travel-puzzle-raw";

/** Las mismas consultas de solo lectura del paso «Export de D1» del workflow a mano (REQ-3464, REQ-3519, REQ-10877). */
export const EXPORT_QUERIES: ReadonlyArray<{ archivo: string; sql: string }> = [
  { archivo: "countries.json", sql: 'SELECT "id", "code", "iso2" FROM "Country"' },
  { archivo: "cities.json", sql: 'SELECT c."id", c."countryId", c."translations", c."slug", c."stateCode", c."geonameid", co."iso2" FROM "City" c JOIN "Country" co ON co."id" = c."countryId"' },
  { archivo: "sync.json", sql: `SELECT "status", "nextPage", "totalPages", "runStartedAt" FROM "SyncMetadata" WHERE "provider" = 'tangol'` },
  { archivo: "provider-record.json", sql: `SELECT "externalId", "rawHash", "lastSeenAt" FROM "ProviderRecord" WHERE "provider" = 'tangol'` },
  { archivo: "tangol-tours.json", sql: `SELECT "externalId", "syncStatus", "missingRuns", "isActive", "lastSeenAt" FROM "Tour" WHERE "providerId" = 'tangol'` },
];

export interface PasoDiario { paso: number; accion: AccionPaso; sqlAplicado: boolean; copia: "ok" | "incompleta" | "sin-objetos"; decision: DecisionDiaria }
export interface ResultadoDiario { pasos: PasoDiario[]; motivoFin: string; ok: boolean }

const wrangler = (d: DiarioDeps, args: string[]) => d.exec("npx", ["wrangler", ...args]);

// REQ-10878
export async function exportarD1(d: DiarioDeps): Promise<boolean> {
  const c = d.carpetas ?? DEF;
  for (const q of EXPORT_QUERIES) {
    const r = await wrangler(d, ["d1", "execute", d.d1 ?? D1, "--remote", "--json", "--command", q.sql]);
    if (r.code !== 0) { d.log(`::error::Export de D1 falló en ${q.archivo}: ${r.out.slice(-400)}`); return false; }
    d.escribirTexto(`${c.exportar}/${q.archivo}`, r.out);
  }
  return true;
}

// REQ-10878
async function copiaExacta(d: DiarioDeps): Promise<"ok" | "incompleta" | "sin-objetos"> {
  const c = d.carpetas ?? DEF;
  const llaves = (d.leerTexto(`${c.copia}/llaves.txt`) ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  if (llaves.length === 0) return "sin-objetos";
  let fallas = 0;
  const cola = [...llaves];
  const obrero = async () => {
    for (let k = cola.shift(); k !== undefined; k = cola.shift()) {
      const r = await wrangler(d, ["r2", "object", "put", `${d.bucket ?? BUCKET}/${k}`, "--file", `${c.copia}/objetos/${k}`, "--content-type", "application/json", "--remote"]);
      if (r.code !== 0) fallas++;
    }
  };
  await Promise.all(Array.from({ length: Math.min(8, llaves.length) }, obrero));
  d.log(`Copia exacta: ${llaves.length - fallas} de ${llaves.length} objeto(s) subidos a ${d.bucket ?? BUCKET}`);
  return fallas === 0 ? "ok" : "incompleta";
}

function accionDelReporte(d: DiarioDeps): AccionPaso {
  const c = d.carpetas ?? DEF;
  const raw = d.leerTexto(`${c.salida}/reporte.json`);
  if (!raw) return null;
  try {
    const a = (JSON.parse(raw) as { action?: unknown }).action;
    return a === "start" || a === "continue" || a === "finish" || a === "idle" || a === "abort" ? a : null;
  } catch { return null; }
}

/** Un lote completo: export → plan → copia → índice → SQL. Devuelve la acción del sync y si se aplicó SQL. */
// REQ-10878
export async function correrPasoDiario(d: DiarioDeps, paso: number): Promise<Omit<PasoDiario, "decision">> {
  const c = d.carpetas ?? DEF;
  const sinEscribir = { paso, sqlAplicado: false, copia: "sin-objetos" as const };
  if (!(await exportarD1(d))) return { ...sinEscribir, accion: "abort" };
  const plan = await d.exec("npx", ["tsx", "src/scripts/tangol-sync.ts", c.exportar, c.salida, "--escribir", "--copia", c.copia]);
  d.log(plan.out);
  const accion = plan.code === 0 ? accionDelReporte(d) : "abort";
  if (accion !== "start" && accion !== "continue" && accion !== "finish") return { ...sinEscribir, accion };
  // Copia exacta primero (REQ-3519); el índice solo si subió completa; si no, la siguiente corrida reintenta lo que falte.
  const copia = await copiaExacta(d);
  if (copia === "ok" && d.existe(`${c.copia}/provider-record.sql`) && (d.leerTexto(`${c.copia}/provider-record.sql`) ?? "").trim()) {
    const idx = await wrangler(d, ["d1", "execute", d.d1 ?? D1, "--remote", "--file", `${c.copia}/provider-record.sql`]);
    if (idx.code !== 0) d.log(`::warning::El índice de la copia no se aplicó: ${idx.out.slice(-300)}`);
  } else if (copia === "incompleta") d.log("::warning::La copia exacta no se subió completa; el índice no se aplica.");
  if (!d.existe(`${c.salida}/tangol.sql`)) return { ...sinEscribir, accion: "abort", copia };
  const sql = await wrangler(d, ["d1", "execute", d.d1 ?? D1, "--remote", "--file", `${c.salida}/tangol.sql`]);
  if (sql.code !== 0) { d.log(`::error::Escribir en D1 falló en el paso ${paso}: ${sql.out.slice(-400)}`); return { paso, accion: "abort", sqlAplicado: false, copia }; }
  return { paso, accion, sqlAplicado: true, copia };
}

/** El ciclo: lotes hasta finish/idle, tope de hora y de pasos (`siguientePasoDiario`). */
// REQ-10878
export async function correrCicloDiario(d: DiarioDeps): Promise<ResultadoDiario> {
  const inicio = d.ahora();
  const pasos: PasoDiario[] = [];
  for (let paso = 1; ; paso++) {
    const r = await correrPasoDiario(d, paso);
    const decision = siguientePasoDiario({ accion: r.accion, paso, ahora: d.ahora(), inicio });
    pasos.push({ ...r, decision });
    d.log(`Paso ${paso}: ${r.accion ?? "sin reporte"} · SQL ${r.sqlAplicado ? "aplicado" : "no aplicado"} · ${decision.motivo}`);
    if (!decision.seguir) {
      const ok = r.accion !== "abort" && r.accion !== null;
      return { pasos, motivoFin: decision.motivo, ok };
    }
  }
}
