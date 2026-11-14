import { describe, expect, it, vi, afterEach } from "vitest";
import { loadPracticalInfo, PRACTICAL_COLUMNS, BASE_COLUMNS, translator } from "./practical-load";

afterEach(() => vi.restoreAllMocks());

const ON = { TANGOL_ENABLED: "true" };

type Row = Record<string, unknown>;
/** D1 de prueba: responde según las columnas que existen (simula la base antes y después de la 0032). */
function fakeDb(existing: readonly string[], row: Row | null) {
  const calls: { sql: string; params: unknown[] }[] = [];
  return {
    calls,
    prepare(sql: string) {
      return {
        bind(...params: unknown[]) {
          return {
            async all() {
              calls.push({ sql, params });
              const asked = [...sql.matchAll(/"(\w+)"/g)].map((m) => m[1]).filter((c) => c !== "Tour" && c !== "id");
              const missing = asked.find((c) => !existing.includes(c));
              if (missing) throw new Error(`D1_ERROR: no such column: ${missing}: SQLITE_ERROR`);
              return { results: row ? [Object.fromEntries(asked.map((c) => [c, row[c] ?? null]))] : [] };
            },
          };
        },
      };
    },
  };
}

const fila: Row = {
  providerId: "tangol", guideLanguages: '["es"]', excludes: '["Propinas"]', cancellationPolicy: "Sin cargo hasta 24 h.",
  availabilityRules: JSON.stringify({ options: [{ startTime: "09:00", hoursCancelation: 24 }] }),
  endPoint: "Plaza de Mayo", whatToBring: "Agua", physicalRequirements: null, difficulty: null, providerNotes: null,
  childAgeFrom: 3, childAgeTo: 11, infantAgeFrom: null, infantAgeTo: null,
};

describe("REQ-10536 / REQ-10537: la ficha carga los datos prácticos con SQL aparte (no por Prisma)", () => {
  it("REQ-10537: con la 0032 aplicada, lee todas las columnas por id del tour y arma los bloques", async () => {
    const db = fakeDb([...PRACTICAL_COLUMNS], fila);
    const v = await loadPracticalInfo(db, "tour-1", "es", ON);
    expect(db.calls).toHaveLength(1);
    expect(db.calls[0].params).toEqual(["tour-1"]);
    expect(v?.conditions?.excludes).toEqual(["Propinas"]);
    expect(v?.beforeYouGo?.items).toEqual([{ key: "whatToBring", text: "Agua" }]);
    expect(v?.facts.map((f) => f.key)).toEqual(["horario-salida", "punto-termino", "edad-ninos", "idioma-guia"]);
  });

  it("REQ-10536: sin la 0032 (antes de migrar) sigue con las columnas de la 0031: Condiciones sí, Antes de ir no", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const db = fakeDb([...BASE_COLUMNS], fila);
    const v = await loadPracticalInfo(db, "tour-1", "es", ON);
    expect(db.calls).toHaveLength(2);
    expect(v?.conditions).toEqual({ excludes: ["Propinas"], cancellationPolicy: "Sin cargo hasta 24 h.", freeCancellation: { hours: 24, varies: false } });
    expect(v?.beforeYouGo).toBeNull();
    expect(v?.facts.map((f) => f.key)).toEqual(["horario-salida", "idioma-guia"]);
  });

  it("REQ-10536: si tampoco hay 0031 o la base falla, devuelve null y la ficha sigue sin los bloques", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await loadPracticalInfo(fakeDb(["providerId"], fila), "tour-1", "es", ON)).toBeNull();
    const rota = { prepare: () => ({ bind: () => ({ all: async () => { throw new Error("D1 caída"); } }) }) };
    expect(await loadPracticalInfo(rota, "tour-1", "es", ON)).toBeNull();
    expect(err).toHaveBeenCalled();
  });

  it("REQ-10536: un tour que no está devuelve null", async () => {
    expect(await loadPracticalInfo(fakeDb([...PRACTICAL_COLUMNS], null), "x", "es", ON)).toBeNull();
  });

  it("REQ-3311: con la bandera del proveedor apagada, la consulta lleva el filtro del gate C", async () => {
    const db = fakeDb([...PRACTICAL_COLUMNS], fila);
    await loadPracticalInfo(db, "tour-1", "es", {});
    expect(db.calls[0].sql).toContain(`AND "Tour"."providerId" NOT IN ('tangol')`);
    const on = fakeDb([...PRACTICAL_COLUMNS], fila);
    await loadPracticalInfo(on, "tour-1", "es", ON);
    expect(on.calls[0].sql).not.toContain("NOT IN");
  });

  it("REQ-10538: las etiquetas salen del sistema de traducciones (es, en; otros idiomas caen al inglés)", () => {
    expect(translator("es")("tours.endPoint")).toBe("Punto de término");
    expect(translator("en")("tours.endPoint")).toBe("End point");
    expect(translator("de")("tours.endPoint")).toBe("End point");
    expect(translator("es")("tours.agesRange")).toBe("{from} a {to} años");
  });
});
