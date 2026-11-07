import { describe, expect, it } from "vitest";
import { toMetadata } from "./metadata";

const site = "https://travelpuzzle.com.mx";
const m = { title: "T", description: "D", canonical: `${site}/en/destinos`, index: true, lang: "en" as const, languages: { es: `${site}/destinos`, en: `${site}/en/destinos`, "x-default": `${site}/destinos` } };

describe("toMetadata por idioma", () => {
  it("REQ-660/REQ-664: con hreflang, alternates por idioma y og:locale del idioma de la URL", () => {
    const md = toMetadata(m, null, { hreflang: true });
    expect(md.alternates).toEqual({ canonical: m.canonical, languages: m.languages });
    expect((md.openGraph as { locale?: string }).locale).toBe("en_US");
  });
  it("REQ-660: sin la bandera no se anuncia ningún hreflang (las URL /en no existen)", () => {
    const md = toMetadata({ ...m, canonical: `${site}/destinos`, lang: "es" });
    expect(md.alternates).toEqual({ canonical: `${site}/destinos` });
    expect((md.openGraph as { locale?: string }).locale).toBeUndefined();
  });
  it("REQ-662: una página noindex no lleva hreflang aunque traiga languages", () => {
    const md = toMetadata({ ...m, index: false }, null, { hreflang: true });
    expect(md.alternates).toEqual({ canonical: m.canonical });
    expect(md.robots).toEqual({ index: false, follow: true });
  });
});
