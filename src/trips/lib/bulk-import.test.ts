import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { buildImportSql, formatLike, idFor, type ImportRow } from "./bulk-import";
import { tripInputSchema } from "../schemas/trip";

const require_ = createRequire(import.meta.url);
const { DatabaseSync } = require_("node:sqlite") as typeof import("node:sqlite");

const AG = { id: "ag-iwp", name: "Inca World Peru", initials: "IWP", phone: "+51 984 708 524" };
const img = (n: number) => ({ key: `trips/1762300000-iwpx${n}.jpg`, alt: "Foto" });
const base = (over: Record<string, unknown> = {}) =>
  tripInputSchema.parse({
    kind: "tour", purchaseMode: "quote", titleEs: "City Tour de Lima", summaryEs: "Resumen", highlights: ["a", "b", "c"],
    descriptionEs: "Descripción con 'comillas'", includes: ["Guía"], excludes: ["Propinas"], countries: ["PE"], durationDays: 1,
    languages: ["es"], currency: "USD", options: [{ id: "c", name: "Compartido", adult: 65 }, { id: "p", name: "Privado", mode: "private", adult: 144 }],
    meetingPoints: [{ name: "Hotel", lat: -12.12, lng: -77.03 }], images: [1, 2, 3, 4, 5].map(img), ...over,
  });

function db() {
  const d = new DatabaseSync(":memory:");
  for (const f of ["0006_trips.sql", "0007_trips_v2.sql"]) d.exec(readFileSync(`migrations/${f}`, "utf8"));
  return d;
}
const run = (d: InstanceType<typeof DatabaseSync>, sql: string[]) => sql.forEach((s) => d.exec(s));

describe("REQ-039 buildImportSql", () => {
  it("REQ-039: crea la agencia y los viajes con código, slug y Desde del gestor", () => {
    const rows: ImportRow[] = [{ ref: "LIM-01", status: "published", trip: base() }];
    const { sql, report } = buildImportSql(rows, AG, "2026-11-05T01:00:00.000+00:00");
    const d = db();
    run(d, sql);
    const t = d.prepare(`SELECT * FROM "Trip"`).get() as Record<string, unknown>;
    expect(report[0]).toMatchObject({ ref: "LIM-01", code: "IWP-PE-T01-001", status: "published", missing: [] });
    expect(t).toMatchObject({ id: idFor("IWP", "LIM-01"), code: "IWP-PE-T01-001", slug: "city-tour-de-lima-iwp-pe-t01-001", status: "published", priceFrom: 65, codeLocked: 1 });
    expect(t.descriptionEs).toBe("Descripción con 'comillas'");
    expect(JSON.parse(t.options as string)).toHaveLength(2);
    expect((d.prepare(`SELECT "initials" FROM "Agency"`).get() as { initials: string }).initials).toBe("IWP");
    expect(t.agencyId).toBe("ag-iwp");
  });

  it("REQ-039: volver a correrlo actualiza sin duplicar y conserva traducciones", () => {
    const d = db();
    run(d, buildImportSql([{ ref: "LIM-01", status: "published", trip: base() }], AG, "2026-11-05T01:00:00.000+00:00").sql);
    d.exec(`UPDATE "Trip" SET "translations"='{"en":{"titleEs":{"text":"x"}}}'`);
    run(d, buildImportSql([{ ref: "LIM-01", status: "published", trip: base({ titleEs: "City Tour Virreinal de Lima" }) }], AG, "2026-11-06T01:00:00.000+00:00").sql);
    const rows = d.prepare(`SELECT "titleEs","translations","createdAt","updatedAt" FROM "Trip"`).all() as Record<string, string>[];
    expect(rows).toHaveLength(1);
    expect(rows[0].titleEs).toBe("City Tour Virreinal de Lima");
    expect(rows[0].translations).toContain("en");
    expect(rows[0].createdAt).toBe("2026-11-05T01:00:00.000+00:00");
    expect(rows[0].updatedAt).toBe("2026-11-06T01:00:00.000+00:00");
    expect((d.prepare(`SELECT count(*) n FROM "Agency"`).get() as { n: number }).n).toBe(1);
  });

  it("REQ-039: lo que no cumple la lista de publicación entra como borrador y se reporta", () => {
    const { report } = buildImportSql([{ ref: "CUS-11", status: "published", trip: base({ images: [1, 2, 3, 4].map(img) }) }], AG, "x");
    expect(report[0].status).toBe("draft");
    expect(report[0].missing.join()).toMatch(/fotos/);
  });
});

describe("REQ-039 tandas", () => {
  it("REQ-039: cada tanda empieza en su propio consecutivo", () => {
    const { report } = buildImportSql([{ ref: "PROG-1", status: "draft", trip: base() }], AG, "x", 101);
    expect(report[0].code).toBe("IWP-PE-T01-101");
  });
});

describe("REQ-039 formatLike", () => {
  const d = new Date("2026-11-05T01:02:03.004Z");
  it("REQ-039: copia el formato de fecha que ya usa la base", () => {
    expect(formatLike(1762300000000, d)).toBe(d.getTime());
    expect(formatLike("2026-11-01T00:00:00.000+00:00", d)).toBe("2026-11-05T01:02:03.004+00:00");
    expect(formatLike("2026-11-01 00:00:00", d)).toBe("2026-11-05 01:02:03");
    expect(formatLike("2026-11-01T00:00:00.000Z", d)).toBe("2026-11-05T01:02:03.004Z");
  });
});
