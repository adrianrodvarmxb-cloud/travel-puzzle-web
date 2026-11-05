import { describe, it, expect, vi } from "vitest";
import { runDeparturesStep } from "./sync";

const now = new Date("2026-11-05T12:00:00Z");
function repo(ids: { id: string; externalId: number }[]) {
  const saved: Record<string, unknown> = {}; const checked: string[] = [];
  return {
    saved, checked,
    dueTours: vi.fn(async () => ids),
    saveSummary: vi.fn(async (id: string, s: unknown) => { saved[id] = s; }),
    markChecked: vi.fn(async (id: string) => { checked.push(id); }),
  };
}

describe("REQ-049 sync escalonado de salidas", () => {
  it("REQ-049: pide solo la tanda que toca y guarda el resumen de cada tour", async () => {
    const r = repo([{ id: "a", externalId: 1 }, { id: "b", externalId: 2 }]);
    const source = { list: vi.fn(async (ext: number) => [{ date: "2026-11-06", language: ext === 1 ? "es" : "en" }]) };
    const res = await runDeparturesStep({ source, repo: r, now, batch: 10 });
    expect(r.dueTours).toHaveBeenCalledWith(10, expect.any(Date));
    expect(r.saved).toEqual({ a: { languages: ["es"], dates: ["2026-11-06"] }, b: { languages: ["en"], dates: ["2026-11-06"] } });
    expect(res).toEqual({ processed: 2, failed: 0 });
  });
  it("REQ-049: si un tour falla, se conserva su dato anterior, se marca revisado (para no atorar la fila) y sigue con los demás", async () => {
    const r = repo([{ id: "a", externalId: 1 }, { id: "b", externalId: 2 }]);
    const source = { list: vi.fn(async (ext: number) => { if (ext === 1) throw new Error("429"); return []; }) };
    const res = await runDeparturesStep({ source, repo: r, now, batch: 10 });
    expect(r.saved).toEqual({ b: { languages: [], dates: [] } });
    expect(r.checked).toEqual(["a"]);
    expect(res).toEqual({ processed: 1, failed: 1 });
  });
  it("REQ-049: cada tour se revisa como máximo una vez al día", async () => {
    const r = repo([]);
    await runDeparturesStep({ source: { list: vi.fn() }, repo: r, now, batch: 10 });
    const before = (r.dueTours.mock.calls[0] as unknown as [number, Date])[1];
    expect(now.getTime() - before.getTime()).toBe(20 * 3600 * 1000);
  });
});
