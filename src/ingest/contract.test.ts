import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { adapterFor, blockingIssues, checkContract, importAdapter, INGEST_ADAPTERS, type GapBaseline } from "./lib/contract";
import { providerOfAgency, AGENCY_PROVIDER } from "./lib/import-archive";
import { BASE_CATALOG, feedTour } from "@/catalog/fixtures/freetour-feeds";
import { classify } from "@/taxonomy/lib/classify";
import { DEFAULT_DICTIONARY, DEFAULT_MAPPINGS } from "@/taxonomy/data";
import { parseMapping } from "@/taxonomy/schemas/dictionary";

const baseline = (JSON.parse(readFileSync("src/ingest/data/contrato-huecos.json", "utf8")) as { huecos: GapBaseline }).huecos;
const IMPORTS = readdirSync("imports").filter((f) => f.endsWith(".json")).sort();
const bundle = (f: string) => JSON.parse(readFileSync(`imports/${f}`, "utf8")) as { agency: { id: string }; trips: unknown[] };

describe("REQ-760 interfaz IngestAdapter: esquema del crudo + normalize puro + mapeo + volátiles", () => {
  it.each(INGEST_ADAPTERS.map((a) => [a.provider, a] as const))("REQ-760 %s tiene esquema, mapeo y volátiles declarados", (_p, a) => {
    expect(a.rawSchema).toBeTruthy();
    expect(a.mapping, "mapeo").toBeTruthy();
    expect(a.volatileFields, "volátiles").toBeTruthy();
    expect(typeof a.normalize).toBe("function");
  });
  it("REQ-760 el esquema del crudo tolera campos nuevos y no los quita (passthrough)", () => {
    const r = adapterFor("freetour")!.rawSchema.safeParse({ ...feedTour(1), campoNuevo: 1 });
    expect(r.success && (r.data as Record<string, unknown>).campoNuevo).toBe(1);
  });
});

describe("REQ-762 prueba de contrato sobre cada adaptador y cada imports/*.json", () => {
  it("REQ-762 FREETOUR: las muestras sintéticas cumplen el contrato (sin datos reales en el repo)", () => {
    expect(checkContract(adapterFor("freetour"), "freetour", BASE_CATALOG)).toEqual([]);
  });
  it.each(IMPORTS)("REQ-762 %s cumple el contrato (esquema, normalize, mapeo, archivo y linaje o hueco registrado)", (f) => {
    const p = providerOfAgency(bundle(f).agency.id)!;
    const issues = checkContract(adapterFor(p), p, bundle(f).trips);
    expect(blockingIssues(issues, baseline)).toEqual([]);
  });
  it("REQ-762 la línea base de huecos solo puede achicarse: no lista viajes que ya tienen denominación ni refs que no existen", () => {
    const now = new Map<string, Set<string>>();
    for (const f of IMPORTS) {
      const p = providerOfAgency(bundle(f).agency.id)!;
      for (const i of checkContract(adapterFor(p), p, bundle(f).trips)) if (i.kind === "linaje") now.set(p, (now.get(p) ?? new Set()).add(i.externalId!));
    }
    for (const [p, refs] of Object.entries(baseline)) for (const r of refs) expect(now.get(p)?.has(r), `${p}:${r} ya no es hueco: quítalo de contrato-huecos.json`).toBe(true);
  });
  it("REQ-762 falla si un proveedor no tiene adaptador, mapeo, volátiles, esquema o archivo crudo", () => {
    expect(checkContract(undefined, "nuevo", [{}])[0].kind).toBe("adaptador");
    const sinMapeo = { ...importAdapter("extime"), mapping: undefined, volatileFields: undefined };
    expect(checkContract(sinMapeo, "extime", []).map((i) => i.kind).sort()).toEqual(["mapeo", "volatiles"]);
    expect(checkContract(importAdapter("extime"), "extime", [{ ref: "", status: "x" }])[0].kind).toBe("esquema");
    expect(checkContract(adapterFor("freetour"), "Free Tour", [feedTour(1)]).map((i) => i.kind)).toContain("archivo");
    expect(checkContract(importAdapter("extime"), "extime", [{ ref: "X", status: "draft", photos: [], trip: { kind: "nave" } }]).map((i) => i.kind)).toContain("normalize");
  });
  it("REQ-762 un viaje nuevo sin denominación original bloquea; con original.categoria conocida pasa", () => {
    const e = { ref: "NUEVO-1", status: "draft", photos: [], trip: bundle("incaworld-mp01-precio.json").trips[0] && (bundle("incaworld-mp01-precio.json").trips[0] as { trip: unknown }).trip };
    expect(blockingIssues(checkContract(importAdapter("exoticescapes"), "exoticescapes", [e]), baseline).map((i) => i.kind)).toEqual(["linaje"]);
    expect(blockingIssues(checkContract(importAdapter("exoticescapes"), "exoticescapes", [{ ...e, original: { categoria: "Extensión", pagina: 2 } }]), baseline)).toEqual([]);
  });
  it("REQ-761 cada agencia de los imports tiene adaptador", () => {
    for (const p of Object.values(AGENCY_PROVIDER)) expect(adapterFor(p), p).toBeTruthy();
  });
});

describe("REQ-404 agregar un proveedor = agregar su mapeo, sin tocar el clasificador", () => {
  it("REQ-404 un proveedor de prueba con solo su archivo de mapeo se clasifica con classify() sin cambios", () => {
    const demo = parseMapping({ proveedor: "demo", version: "1", revisado: "prueba", precioCeroEsPiezaLibre: false, permiteConfirmacionInmediata: false,
      categorias: [{ id: "BOAT", nombre_es: "Barco", nombre_en: "Boat", formato: "tour", temas: ["playa-mar"], atributos: ["medio:barco"], reglasPorPalabra: [], estado: "activo" }] });
    const r = classify({ proveedor: "demo", categoriaId: "BOAT", precio: 30, durationMinutes: 120, titulo: "Paseo en barco" }, DEFAULT_DICTIONARY, { ...DEFAULT_MAPPINGS, demo });
    expect(r.formato).toBe("tour");
    expect(r.temas).toContain("playa-mar");
    expect(r.reglaFormato).toBe("#11 transporte en el título; base demo:BOAT"); // REQ-1250: la regla dice por qué es Tour
  });
});

describe("REQ-763 compuerta en importar-viajes.yml: no se escribe sin pasar el contrato", () => {
  const wf = readFileSync(".github/workflows/importar-viajes.yml", "utf8");
  it("REQ-763 el contrato corre antes de cualquier paso de escritura y sin continue-on-error", () => {
    const gate = wf.indexOf("src/scripts/ingest-contract.ts \"$ARCHIVO\"");
    expect(gate).toBeGreaterThan(0);
    for (const w of ["wrangler r2 object put", "wrangler d1 execute travel-puzzle --remote --file", "npx tsx src/scripts/import-trips.ts"]) {
      const at = wf.indexOf(w);
      expect(at, w).toBeGreaterThan(gate);
    }
    expect(wf).not.toMatch(/continue-on-error/);
  });
});
