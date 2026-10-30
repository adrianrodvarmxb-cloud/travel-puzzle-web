import { describe, it, expect } from "vitest";
import { toCountriesFile } from "./countries";

const t = (s: string) => ({ en: s, es: s, pt: s, de: s, fr: s, it: s });
const country = (id: number, name: string) => ({
  id,
  title: t(name),
  shortTitle: name.slice(0, 2).toUpperCase(),
  URLs: t(`https://www.freetour.com/${name}`),
  image: `https://www.freetour.com/img/${id}.jpg`,
  continent: t("America"),
});

describe("toCountriesFile", () => {
  it("devuelve la lista de países ordenada por id", () => {
    const out = toCountriesFile({ data: [country(99, "mexico"), country(1, "spain")], status: 200 });
    expect(out.map((c) => c.id)).toEqual([1, 99]);
    expect(out[1].title.es).toBe("mexico");
  });

  it("conserva solo los campos que usa el sitio", () => {
    const extra = { ...country(5, "peru"), somethingElse: true };
    const [c] = toCountriesFile({ data: [extra], status: 200 });
    expect(Object.keys(c).sort()).toEqual(["URLs", "continent", "id", "image", "shortTitle", "title"]);
  });

  it("rechaza una respuesta sin países", () => {
    expect(() => toCountriesFile({ data: [], status: 200 })).toThrow(/sin países/);
  });

  it("rechaza datos con forma inesperada", () => {
    expect(() => toCountriesFile({ data: [{ id: "x" }], status: 200 })).toThrow();
  });
});
