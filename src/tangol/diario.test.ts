// REQ-10878: el ciclo diario repite export → plan → copia → SQL hasta cerrar, y nunca escribe tras un fallo. npx vitest run src/tangol/diario.test.ts
import { describe, expect, it } from "vitest";
import { correrCicloDiario, EXPORT_QUERIES, type DiarioDeps } from "./diario";

/** Entorno falso: `acciones` es lo que devolverá cada corrida del script, en orden. */
function entorno(acciones: (string | { codigo: number })[], o: { reloj?: Date[]; r2Falla?: boolean; sqlFalla?: boolean; llaves?: string } = {}) {
  const llamadas: string[] = [];
  const archivos = new Map<string, string>();
  let n = 0;
  const reloj = o.reloj ?? [];
  const deps: DiarioDeps = {
    exec: async (cmd, args) => {
      const linea = [cmd, ...args].join(" ");
      llamadas.push(linea);
      if (args[0] === "wrangler" && args[1] === "d1" && args.includes("--command")) return { code: 0, out: '[{"results":[]}]' };
      if (args[0] === "tsx") {
        const a = acciones[n++];
        if (typeof a === "object") return { code: a.codigo, out: "falló" };
        archivos.set("tmp/tangol-salida/reporte.json", JSON.stringify({ action: a }));
        if (a !== "idle") archivos.set("tmp/tangol-salida/tangol.sql", "-- sql\nUPDATE x;");
        archivos.set("tmp/tangol-copia/llaves.txt", o.llaves ?? "tangol/a.json\ntangol/b.json\n");
        archivos.set("tmp/tangol-copia/provider-record.sql", "INSERT ...;");
        return { code: 0, out: `Acción: ${a}` };
      }
      if (args[0] === "wrangler" && args[1] === "r2") return { code: o.r2Falla ? 1 : 0, out: "" };
      if (args[0] === "wrangler" && args[1] === "d1" && args.includes("--file")) return { code: o.sqlFalla && args.includes("tmp/tangol-salida/tangol.sql") ? 1 : 0, out: "" };
      return { code: 0, out: "" };
    },
    leerTexto: (r) => archivos.get(r) ?? null,
    escribirTexto: (r, c) => { archivos.set(r, c); },
    existe: (r) => archivos.has(r),
    ahora: () => reloj.shift() ?? new Date("2026-11-26T07:05:00Z"),
    log: () => {},
  };
  return { deps, llamadas, archivos };
}

describe("REQ-10878: ciclo diario de Tangol (D2)", () => {
  it("REQ-10878: el export de solo lectura es el mismo del workflow a mano (5 consultas SELECT, con la presencia)", () => {
    expect(EXPORT_QUERIES.map((q) => q.archivo)).toEqual(["countries.json", "cities.json", "sync.json", "provider-record.json", "tangol-tours.json"]);
    for (const q of EXPORT_QUERIES) expect(q.sql).toMatch(/^SELECT /);
  });

  it("REQ-10878: start → continue → finish: tres lotes, cada uno con export, plan con --escribir --copia, copia a R2, índice y SQL en D1; termina en finish", async () => {
    const { deps, llamadas } = entorno(["start", "continue", "finish"]);
    const r = await correrCicloDiario(deps);
    expect(r.ok).toBe(true);
    expect(r.motivoFin).toBe("corrida cerrada (finish)");
    expect(r.pasos.map((p) => [p.accion, p.sqlAplicado, p.copia])).toEqual([["start", true, "ok"], ["continue", true, "ok"], ["finish", true, "ok"]]);
    const planes = llamadas.filter((l) => l.includes("src/scripts/tangol-sync.ts"));
    expect(planes).toHaveLength(3);
    for (const p of planes) expect(p).toMatch(/--escribir --copia tmp\/tangol-copia$/);
    expect(llamadas.filter((l) => l.includes("--command")).length).toBe(3 * EXPORT_QUERIES.length);
    expect(llamadas.filter((l) => l.includes("r2 object put travel-puzzle-raw/")).length).toBe(6);
    const orden = llamadas.slice(0, 20);
    const iCopia = orden.findIndex((l) => l.includes("r2 object put")), iIndice = orden.findIndex((l) => l.includes("provider-record.sql")), iSql = orden.findIndex((l) => l.includes("tmp/tangol-salida/tangol.sql"));
    expect(iCopia).toBeLessThan(iIndice); expect(iIndice).toBeLessThan(iSql);
  });

  it("REQ-10878: idle en el primer paso no escribe nada y termina", async () => {
    const { deps, llamadas } = entorno(["idle"]);
    const r = await correrCicloDiario(deps);
    expect(r).toMatchObject({ ok: true, motivoFin: "nada que hacer (idle)" });
    expect(llamadas.some((l) => l.includes("--file"))).toBe(false);
  });

  it("REQ-10878: si el plan falla (código ≠ 0) no se aplica SQL y el ciclo se detiene con ok = false", async () => {
    const { deps, llamadas } = entorno(["start", { codigo: 1 }]);
    const r = await correrCicloDiario(deps);
    expect(r.ok).toBe(false);
    expect(r.pasos.map((p) => p.accion)).toEqual(["start", "abort"]);
    expect(llamadas.filter((l) => l.includes("tmp/tangol-salida/tangol.sql")).length).toBe(1);
  });

  it("REQ-10878: si falla la escritura en D1 el ciclo se detiene; si la copia a R2 no sube completa, el índice no se aplica pero el catálogo sí (REQ-744)", async () => {
    const r1 = await correrCicloDiario(entorno(["start", "continue"], { sqlFalla: true }).deps);
    expect(r1.ok).toBe(false);
    expect(r1.pasos).toHaveLength(1);
    const e2 = entorno(["finish"], { r2Falla: true });
    const r2 = await correrCicloDiario(e2.deps);
    expect(r2.ok).toBe(true);
    expect(r2.pasos[0]).toMatchObject({ copia: "incompleta", sqlAplicado: true });
    expect(e2.llamadas.some((l) => l.includes("provider-record.sql"))).toBe(false);
  });

  it("REQ-10878: desde las 8:45 UTC no arranca otro lote aunque el sync pida continuar", async () => {
    const reloj = [new Date("2026-11-26T07:00:00Z"), new Date("2026-11-26T07:30:00Z"), new Date("2026-11-26T08:46:00Z")];
    const { deps } = entorno(["start", "continue", "continue"], { reloj });
    const r = await correrCicloDiario(deps);
    expect(r.pasos).toHaveLength(2);
    expect(r.motivoFin).toMatch(/tope de hora/);
    expect(r.ok).toBe(true);
  });
});
