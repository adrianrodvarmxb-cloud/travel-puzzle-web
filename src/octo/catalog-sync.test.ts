import { describe, it, expect, vi } from "vitest";
import { runBigBusCatalogSync, type PlanStore } from "./catalog-sync";
import type { CatalogPlan } from "./lib/catalog";
import { productSchema } from "./lib/schemas";
import { sampleProduct } from "./lib/fixtures";
import type { RawArchive } from "@/ingest/raw-archive";

const map = { NYC: ["new york"], LON: ["london"] };
const now = new Date("2026-11-12T09:00:00Z");

function memStore(initial: CatalogPlan | null = null) {
  let plan = initial;
  const store: PlanStore & { saved: CatalogPlan[] } = {
    saved: [],
    load: async () => plan,
    save: async (p) => {
      plan = p;
      store.saved.push(p);
    },
  };
  return store;
}

function apiWith(raw: Record<string, unknown>[]) {
  const items = raw.map((r) => productSchema.parse(r));
  return { getProducts: vi.fn(async () => ({ items, discarded: 0, raw })) };
}

function memArchive() {
  const puts: string[] = [];
  const archive: RawArchive = {
    knownVersions: async () => new Map(),
    put: async (key) => {
      puts.push(key);
    },
    record: async () => {},
  };
  return { archive, puts };
}

describe("sincronización del catálogo de Big Bus por OCTO", () => {
  it("REQ-3415: con la bandera apagada no hace nada", async () => {
    const store = memStore();
    expect(await runBigBusCatalogSync({ api: null, store, cityRefs: ["NYC"], map, now, runId: "r" })).toEqual({ status: "disabled" });
    expect(store.saved).toEqual([]);
  });

  it("REQ-3415: guarda la copia exacta en el archivo privado y el plan para la ficha", async () => {
    const store = memStore();
    const { archive, puts } = memArchive();
    const r = await runBigBusCatalogSync({
      api: apiWith([{ ...sampleProduct(), internalName: "New York Discover" }]),
      store,
      archive,
      cityRefs: ["NYC", "LON"],
      map,
      now,
      runId: "r1",
    });
    expect(r).toMatchObject({ status: "ok", cities: 1, notResold: ["LON"], unmatched: 0, unpriced: 0 });
    expect(puts).toHaveLength(1);
    expect(puts[0]).toContain("bigbus-octo");
    expect(store.saved[0].cities[0].ref).toBe("NYC");
  });

  it("REQ-3415: si la API falla, no toca el plan anterior", async () => {
    const store = memStore();
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const api = { getProducts: vi.fn(async () => Promise.reject(new Error("timeout"))) };
    expect(await runBigBusCatalogSync({ api, store, cityRefs: ["NYC"], map, now, runId: "r" })).toEqual({ status: "error", message: "timeout" });
    expect(store.saved).toEqual([]);
    err.mockRestore();
  });

  it("REQ-3415: si la API trae vacío y antes había ciudades, se conserva el plan anterior", async () => {
    const prev: CatalogPlan = { generatedAt: "x", cities: [{ ref: "NYC", products: [], from: null }], notResold: [], unmatched: [], unpriced: [] };
    const store = memStore(prev);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const r = await runBigBusCatalogSync({ api: apiWith([]), store, cityRefs: ["NYC"], map, now, runId: "r" });
    expect(r.status).toBe("kept");
    expect(store.saved).toEqual([]);
    warn.mockRestore();
  });
});
