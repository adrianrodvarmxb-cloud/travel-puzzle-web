// REQ-10862: lectura de «Otras experiencias en la ciudad» con la base inyectada. npx vitest run src/ficha/others.test.ts
import { describe, expect, it } from "vitest";
import type { OtherTourRow } from "./lib/others-input";
import { loadOtherExperiences, OTHERS_POOL, type OthersDeps, type OthersQuery } from "./others";

const row = (id: string, price: number, provider = "tangol"): OtherTourRow => ({
  id, slug: `slug-${id}`, providerId: provider, priceValue: price, priceCurrency: "USD", titleImageURL: `https://img/${id}.jpg`, reviewsNumber: 10,
  translations: [{ language: "es", title: `Tour ${id}` }], city: { slug: "buenos-aires" }, country: { iso2: "AR" },
});
const calls: OthersDeps["toursInCity"] extends (q: infer Q) => unknown ? Q[] : never = [];
const deps: OthersDeps = {
  toursInCity: async (q) => {
    calls.push(q);
    return q.paid ? [row("p1", 45), row("p2", 60, "other"), row("yo", 30)] : [row("f1", 0, "freetour"), row("f2", 0, "freetour")];
  },
};
const q = (over: Partial<OthersQuery> = {}): OthersQuery => ({ cityId: 7, excludeId: "yo", lang: "es", includePaid: true, rates: null, ...over });

describe("REQ-10862: loadOtherExperiences", () => {
  it("REQ-10862: pide a la base las de pago y las gratis de la ciudad, sin la propia, y devuelve las tarjetas con el modo includePaid", async () => {
    calls.length = 0;
    const r = await loadOtherExperiences(deps, q());
    expect(calls).toHaveLength(2);
    expect(calls.map((c) => c.paid).sort()).toEqual([false, true]);
    expect(calls.every((c) => c.cityId === 7 && c.excludeId === "yo" && c.take === OTHERS_POOL)).toBe(true);
    expect(r.includePaid).toBe(true);
    expect(r.paid.map((c) => c.id)).toEqual(["p1", "p2"]); // «yo» fuera aunque la base la devuelva
    expect(r.free.map((c) => c.id)).toEqual(["f1", "f2"]);
    expect(r.paid[0]).toMatchObject({ href: "/destinos/ar/buenos-aires/slug-p1", priceText: "Desde USD $45" });
  });

  it("REQ-10862: con includePaid apagado no consulta las de pago (REQ-014: no se recomienda lo que no se puede reservar)", async () => {
    calls.length = 0;
    const r = await loadOtherExperiences(deps, q({ includePaid: false }));
    expect(calls).toHaveLength(1);
    expect(calls[0].paid).toBe(false);
    expect(r.paid).toEqual([]);
    expect(r.free).toHaveLength(2);
    expect(r.includePaid).toBe(false);
  });

  it("REQ-10862: si la base falla, el error sube tal cual (quien llama deja el bloque fuera; regla 7)", async () => {
    const broken: OthersDeps = { toursInCity: async () => { throw new Error("D1 caída"); } };
    await expect(loadOtherExperiences(broken, q())).rejects.toThrow("D1 caída");
  });
});
