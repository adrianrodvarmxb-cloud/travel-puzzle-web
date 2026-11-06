/**
 * REQ-340…343: analítica anónima del buscador, agregada por día (plan S4, SEARCH_LOG_ENABLED). Puro.
 * Solo se guarda la consulta normalizada y contadores (búsquedas, cero resultados, resultados, clics, posición).
 * Nunca IP, usuario, cookie, agente ni hora exacta. Una consulta con forma de correo, teléfono, URL o número largo
 * se descarta antes de contarla. La tabla `search_log_daily` es una migración propuesta, sin aplicar.
 */
import { fold } from "./normalize";

export const MAX_LOG_CHARS = 80;
export const MAX_LOG_WORDS = 8;
/** Zona fija del negocio (Ciudad de México, sin horario de verano desde 2022): UTC−6. Se calcula en el servidor. */
export const BUSINESS_UTC_OFFSET_HOURS = -6;
export const LANGS = new Set(["es", "en", "pt", "de", "fr", "it"]);

const EMAIL = /[^\s@]+@[^\s@]+|\b[\w.+-]+\s*(?:arroba|at)\s*[\w-]+\s*(?:punto|dot|\.)\s*\w+/i;
const URL_LIKE = /(?:https?:\/\/|www\.|\b[\w-]+\.(?:com|mx|net|org|io|me|ly)\b)/i;

/** Dígitos en total (teléfonos con espacios, guiones o paréntesis). */
const digitCount = (s: string) => (s.match(/\d/g) ?? []).length;

/** ¿Puede contener un dato personal? Correo, teléfono (7+ dígitos), URL, o un número de 5+ cifras seguidas. */
// REQ-341
export function looksPersonal(raw: string): boolean {
  return EMAIL.test(raw) || URL_LIKE.test(raw) || digitCount(raw) >= 7 || /\d{5,}/.test(raw);
}

/** Consulta que se puede contar: plegada, recortada y sin datos personales; null si se descarta. */
// REQ-340 REQ-341
export function logQuery(raw: string | null | undefined): string | null {
  const s = (raw ?? "").slice(0, 200);
  if (!s.trim() || looksPersonal(s)) return null;
  const q = fold(s).split(" ").filter(Boolean).slice(0, MAX_LOG_WORDS).join(" ").slice(0, MAX_LOG_CHARS).trim();
  return [...q].filter((c) => c !== " ").length >= 2 ? q : null;
}

/** Día del negocio (YYYY-MM-DD) para un instante; sin Intl ni zona del equipo (INC-001). */
// REQ-340
export function businessDay(nowMs: number): string {
  return new Date(nowMs + BUSINESS_UTC_OFFSET_HOURS * 3_600_000).toISOString().slice(0, 10);
}

export interface SearchEvent { kind: "search"; language: string; query: string | null | undefined; results: number; corrected: boolean }
export interface ClickEvent { kind: "click"; language: string; query: string | null | undefined; position: number }
export type LogEvent = SearchEvent | ClickEvent;
export interface Statement { sql: string; params: (string | number)[] }

const UPSERT = `INSERT INTO "search_log_daily" ("day", "lang", "query", "searches", "zero", "results", "corrected", "clicks", "positionSum")
VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
ON CONFLICT ("day", "lang", "query") DO UPDATE SET
  "searches" = "searches" + excluded."searches", "zero" = "zero" + excluded."zero", "results" = "results" + excluded."results",
  "corrected" = "corrected" + excluded."corrected", "clicks" = "clicks" + excluded."clicks", "positionSum" = "positionSum" + excluded."positionSum"`;

const int = (n: unknown, max: number) => (typeof n === "number" && Number.isFinite(n) ? Math.max(0, Math.min(max, Math.trunc(n))) : 0);

/** Evento → una sentencia de suma (upsert); null si se descarta. Un solo renglón por día, idioma y consulta. */
// REQ-340 REQ-342
export function logStatement(e: LogEvent, nowMs: number): Statement | null {
  const query = logQuery(e.query);
  const lang = LANGS.has(e.language) ? e.language : null;
  if (!query || !lang) return null;
  const day = businessDay(nowMs);
  if (e.kind === "search") {
    const results = int(e.results, 100_000);
    return { sql: UPSERT, params: [day, lang, query, 1, results === 0 ? 1 : 0, results, e.corrected ? 1 : 0, 0, 0] };
  }
  const position = int(e.position, 1000);
  if (position < 1) return null;
  return { sql: UPSERT, params: [day, lang, query, 0, 0, 0, 0, 1, position] };
}

/** Clic que manda el navegador: solo consulta, idioma y posición (1 = primero). Cualquier otro campo se ignora. */
// REQ-342
export function parseClick(body: unknown): ClickEvent | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.q !== "string" || typeof b.language !== "string" || typeof b.position !== "number") return null;
  return { kind: "click", language: b.language, query: b.q, position: b.position };
}

/** REQ-343: top semanal de búsquedas sin resultados (para alimentar alias y sinónimos cada mes). Solo lectura. */
export const WEEKLY_ZERO_SQL = `SELECT "query", "lang", SUM("searches") AS "searches", SUM("zero") AS "zero", SUM("clicks") AS "clicks"
FROM "search_log_daily" WHERE "day" >= ?1 AND "day" <= ?2
GROUP BY "query", "lang" HAVING SUM("zero") > 0 ORDER BY SUM("zero") DESC, SUM("searches") DESC LIMIT ?3`;

/** Días [desde, hasta] de la semana que termina el día del negocio de `nowMs` (7 días). */
// REQ-343
export function lastWeek(nowMs: number): [string, string] {
  return [businessDay(nowMs - 6 * 86_400_000), businessDay(nowMs)];
}

/** Retención propuesta: 400 días (para comparar el mismo mes del año anterior). */
export const RETENTION_DAYS = 400;
export const PURGE_SQL = `DELETE FROM "search_log_daily" WHERE "day" < ?1`;
// REQ-341
export const purgeBefore = (nowMs: number) => businessDay(nowMs - RETENTION_DAYS * 86_400_000);
