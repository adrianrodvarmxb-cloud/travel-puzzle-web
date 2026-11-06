import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import {
  businessDay, lastWeek, logQuery, logStatement, looksPersonal, parseClick, purgeBefore, PURGE_SQL, WEEKLY_ZERO_SQL,
} from "./search-log";
import { isSearchLog, recordSearchEvent } from "../log";

const require_ = createRequire(import.meta.url);
type Stmt = { run: (...p: unknown[]) => unknown; all: (...p: unknown[]) => unknown[] };
type Db = { exec: (sql: string) => void; prepare: (sql: string) => Stmt };
const { DatabaseSync } = require_("node:sqlite") as { DatabaseSync: new (path: string) => Db };
const MIGRATION = readFileSync(path.join(process.cwd(), "docs", "migraciones-propuestas", "0017_search_log_daily.sql"), "utf8");

// 6 nov 2026, 05:30 UTC = 5 nov 23:30 en CDMX
const NOW = Date.parse("2026-11-06T05:30:00Z");

describe("REQ-341 sin datos personales", () => {
  it("descarta correos, teléfonos, URL y números largos", () => {
    for (const q of ["ana@gmail.com", "ana arroba gmail punto com", "55 3649 0320", "+52 (55) 3649-0320", "www.ejemplo.com", "https://x.io", "reserva 123456", "tarjeta 4111 1111 1111 1111"])
      expect([q, looksPersonal(q), logQuery(q)]).toEqual([q, true, null]);
  });
  it("conserva búsquedas normales, con números cortos", () => {
    expect(logQuery("Tours en Roma")).toBe("tours en roma");
    expect(logQuery("Machu Picchu 2 días")).toBe("machu picchu 2 dias");
    expect(logQuery("Museo del Prado 2026")).toBe("museo del prado 2026");
  });
  it("recorta a 8 palabras y 80 caracteres; una letra sola no cuenta", () => {
    expect(logQuery("a b c d e f g h i j k")!.split(" ").length).toBe(8);
    expect(logQuery("x".repeat(300))!.length).toBe(80);
    expect(logQuery("r")).toBeNull();
    expect(logQuery("   ")).toBeNull();
  });
});

describe("REQ-340 agregado por día del negocio (CDMX, sin Intl)", () => {
  it("el día es el de Ciudad de México (UTC−6)", () => {
    expect(businessDay(NOW)).toBe("2026-11-05");
    expect(businessDay(Date.parse("2026-11-06T06:00:00Z"))).toBe("2026-11-06");
    expect(lastWeek(NOW)).toEqual(["2026-10-30", "2026-11-05"]);
  });
  it("búsqueda y clic se suman en un solo renglón por día, idioma y consulta (migración propuesta en node:sqlite)", () => {
    const db = new DatabaseSync(":memory:");
    db.exec(MIGRATION);
    const run = (e: Parameters<typeof logStatement>[0]) => { const s = logStatement(e, NOW)!; db.prepare(s.sql).run(...s.params); };
    run({ kind: "search", language: "es", query: "Roma", results: 12, corrected: false });
    run({ kind: "search", language: "es", query: "roma ", results: 0, corrected: false });
    run({ kind: "search", language: "es", query: "Barselona", results: 4, corrected: true });
    run({ kind: "click", language: "es", query: "Roma", position: 3 });
    const rows = db.prepare(`SELECT * FROM "search_log_daily" ORDER BY "query"`).all();
    expect(rows).toEqual([
      { day: "2026-11-05", lang: "es", query: "barselona", searches: 1, zero: 0, results: 4, corrected: 1, clicks: 0, positionSum: 0 },
      { day: "2026-11-05", lang: "es", query: "roma", searches: 2, zero: 1, results: 12, corrected: 0, clicks: 1, positionSum: 3 },
    ]);
    // la tabla no tiene columnas de IP, usuario, agente ni hora
    const cols = (db.prepare(`PRAGMA table_info("search_log_daily")`).all() as { name: string }[]).map((c) => c.name);
    expect(cols).toEqual(["day", "lang", "query", "searches", "zero", "results", "corrected", "clicks", "positionSum"]);
    // el top semanal y la purga corren sobre la misma tabla
    expect(db.prepare(WEEKLY_ZERO_SQL).all("2026-10-30", "2026-11-05", 10)).toEqual([{ query: "roma", lang: "es", searches: 2, zero: 1, clicks: 1 }]);
    db.prepare(PURGE_SQL).run(purgeBefore(NOW));
    expect(db.prepare(`SELECT COUNT(*) AS n FROM "search_log_daily"`).all()).toEqual([{ n: 2 }]);
  });
  it("idioma desconocido, consulta personal o posición inválida: no se registra", () => {
    expect(logStatement({ kind: "search", language: "xx", query: "roma", results: 1, corrected: false }, NOW)).toBeNull();
    expect(logStatement({ kind: "search", language: "es", query: "ana@x.com", results: 1, corrected: false }, NOW)).toBeNull();
    expect(logStatement({ kind: "click", language: "es", query: "roma", position: 0 }, NOW)).toBeNull();
  });
});

describe("REQ-342 clics y bandera", () => {
  it("del navegador solo se toman q, idioma y posición", () => {
    expect(parseClick({ q: "roma", language: "es", position: 2, ip: "1.2.3.4", user: "x" })).toEqual({ kind: "click", language: "es", query: "roma", position: 2 });
    expect(parseClick({ q: "roma", language: "es" })).toBeNull();
    expect(parseClick(null)).toBeNull();
  });
  it("solo «true» la enciende; apagada no escribe nada", async () => {
    expect(isSearchLog(undefined)).toBe(false);
    expect(isSearchLog("true")).toBe(true);
    const db = vi.fn();
    expect(await recordSearchEvent({ db, now: () => NOW, enabled: false }, { kind: "search", language: "es", query: "roma", results: 1, corrected: false })).toBe(false);
    expect(db).not.toHaveBeenCalled();
  });
  it("si la tabla no existe (migración sin aplicar) no tumba nada: devuelve false y lo registra", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const db = () => ({ prepare: () => ({ bind: () => ({ run: async () => { throw new Error("no such table: search_log_daily"); } }) }) });
    expect(await recordSearchEvent({ db, now: () => NOW, enabled: true }, { kind: "search", language: "es", query: "roma", results: 1, corrected: false })).toBe(false);
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });
  it("la migración propuesta NO está en migrations/ (nadie la aplica por accidente)", () => {
    const files: string[] = require_("node:fs").readdirSync(path.join(process.cwd(), "migrations"));
    expect(files.some((f) => /search_log/.test(f))).toBe(false);
  });
});
