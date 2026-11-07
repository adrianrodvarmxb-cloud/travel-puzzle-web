import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { AGENCY_MAPPINGS, DEFAULT_MAPPINGS } from "../index";
import { AGENCY_PROVIDER } from "@/ingest/lib/import-archive";
import { VOLATILE_FIELDS } from "@/ingest/lib/raw-hash";

describe("REQ-752 mapeos Zod por agencia desde la denominación original del proveedor", () => {
  it("REQ-752 hay un mapeo válido por cada una de las 7 agencias y ninguno pisa los de hoy", () => {
    expect(Object.keys(AGENCY_MAPPINGS).sort()).toEqual(Object.values(AGENCY_PROVIDER).sort());
    for (const k of Object.keys(AGENCY_MAPPINGS)) expect(DEFAULT_MAPPINGS[k]).toBeUndefined();
  });
  it("REQ-752 cada categoría dice de qué documento o campo del proveedor sale y el mapeo está pendiente de firma", () => {
    for (const m of Object.values(AGENCY_MAPPINGS)) {
      expect(m.revisado).toMatch(/pendiente de firma del PO/);
      for (const c of m.categorias) expect(c.nota, `${m.proveedor}:${c.id}`).toBeTruthy();
    }
  });
  it("REQ-752 la bandera TAXONOMY_LINEAGE_ENABLED está declarada en \"false\"", () => {
    expect(readFileSync("wrangler.jsonc", "utf8")).toMatch(/"TAXONOMY_LINEAGE_ENABLED":\s*"false"/);
  });
});

describe("REQ-755 diccionario de campos por proveedor", () => {
  const doc = readFileSync("docs/datos/diccionario-campos.md", "utf8");
  it("REQ-755 nombra cada proveedor con mapeo o volátiles declarados", () => {
    for (const p of new Set([...Object.keys(VOLATILE_FIELDS), ...Object.keys(AGENCY_MAPPINGS), "freetour"])) expect(doc, p).toContain(p);
  });
  it("REQ-755 cubre cada columna que escribe el sync de FREETOUR y cada columna de Trip que escribe la importación", () => {
    const tourRows = readFileSync("src/catalog/lib/tour-rows.ts", "utf8");
    const tourCols = [...(/export interface TourRow \{([\s\S]*?)\}/.exec(tourRows)![1].matchAll(/^\s+(\w+):/gm))].map((m) => m[1]);
    for (const c of tourCols) expect(doc, `Tour.${c}`).toMatch(new RegExp(`Tour\\.${c}\\b`));
    const bulk = readFileSync("src/trips/lib/bulk-import.ts", "utf8");
    const tripCols = [...(/const cols: Record<string, unknown> = \{([\s\S]*?)\};/.exec(bulk)![1].matchAll(/(\w+):/g))].map((m) => m[1]).filter((c) => !["createdAt", "updatedAt", "seq", "codeLocked"].includes(c));
    for (const c of tripCols) expect(doc, `Trip.${c}`).toMatch(new RegExp(`\\b${c}\\b`));
  });
});
