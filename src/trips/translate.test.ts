import { describe, it, expect, vi } from "vitest";
import { translateTripLang } from "./translate";
import { fingerprint, type Translations } from "./lib/translation";

const trip = {
  titleEs: "Clase de cocina", summaryEs: "Cocina mole", descriptionEs: "", importantInfo: "", whatToBring: "", accessibility: "",
  visaInfo: "", priceNote: "", videoCaption: "", endPoint: "", highlights: [], includes: ["Comida"], excludes: [],
  itinerary: [], options: [], extras: [], meetingPoints: [],
};

function deps(over: Record<string, unknown> = {}) {
  let saved: Translations = {};
  return {
    load: vi.fn(async () => ({ trip, translations: saved })),
    save: vi.fn(async (_id: string, t: Translations) => { saved = t; }),
    ai: vi.fn(async (messages: { content: string }[]) => {
      const items = JSON.parse(messages[1].content) as Record<string, string>;
      return JSON.stringify(Object.fromEntries(Object.entries(items).map(([k, v]) => [k, `EN:${v}`])));
    }),
    ...over,
  };
}

describe("translateTripLang", () => {
  it("traduce lo pendiente y lo guarda", async () => {
    const d = deps();
    const r = await translateTripLang("t1", "en", d);
    expect(r).toEqual({ ok: true, translated: 3, pending: 0 });
    expect(d.save).toHaveBeenCalledWith("t1", { en: { title: { text: "EN:Clase de cocina", src: fingerprint("Clase de cocina"), manual: false }, summary: expect.any(Object), "includes.0": expect.any(Object) } });
  });
  it("si no hay nada pendiente, no llama a la IA", async () => {
    const d = deps();
    await translateTripLang("t1", "en", d);
    d.ai.mockClear();
    expect(await translateTripLang("t1", "en", d)).toEqual({ ok: true, translated: 0, pending: 0 });
    expect(d.ai).not.toHaveBeenCalled();
  });
  it("si la IA falla, no rompe y reporta lo pendiente", async () => {
    const d = deps({ ai: vi.fn(async () => { throw new Error("AI caída"); }) });
    expect(await translateTripLang("t1", "en", d)).toEqual({ ok: false, translated: 0, pending: 3 });
  });
  it("viaje inexistente", async () => {
    expect(await translateTripLang("x", "en", deps({ load: vi.fn(async () => null) }))).toEqual({ ok: false, translated: 0, pending: 0 });
  });
});

describe("translateTripLang con glosario", () => {
  it("repone Travel Puzzle y Free tour aunque la IA los quiera traducir; si los pierde, queda pendiente", async () => {
    const t2 = { ...trip, titleEs: "Free tour con Travel Puzzle", summaryEs: "Con Travel Puzzle", includes: [] };
    let saved: Translations = {};
    const d = {
      load: vi.fn(async () => ({ trip: t2, translations: saved })),
      save: vi.fn(async (_i: string, t: Translations) => { saved = t; }),
      ai: vi.fn(async (m: { content: string }[]) => {
        const items = JSON.parse(m[1].content) as Record<string, string>;
        return JSON.stringify({ title: items.title.replace("con", "with"), summary: "With a local guide" });
      }),
    };
    const r = await translateTripLang("t1", "en", d);
    expect(saved.en?.title.text).toBe("Free tour with Travel Puzzle");
    expect(saved.en?.summary).toBeUndefined();
    expect(r).toEqual({ ok: false, translated: 1, pending: 1 });
  });
});

describe("translateTripLang force", () => {
  it("vuelve a traducir todo menos lo manual", async () => {
    const d = deps();
    await translateTripLang("t1", "en", d);
    d.ai.mockClear();
    const r = await translateTripLang("t1", "en", d, { force: true });
    expect(r).toEqual({ ok: true, translated: 3, pending: 0 });
    expect(d.ai).toHaveBeenCalled();
  });
});
