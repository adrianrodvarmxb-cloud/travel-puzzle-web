import { describe, expect, it } from "vitest";
import { inScope, languageSwitchUrl, localeRouting, localizePath, splitLocale } from "./path";
import { localeUrlsEnabled } from "./flags";
import { isLocale, LOCALES, ogLocale } from "./locales";

describe("locales y bandera", () => {
  it("REQ-650: la bandera solo se enciende con \"true\" exacto", () => {
    expect(localeUrlsEnabled({})).toBe(false);
    expect(localeUrlsEnabled({ LOCALE_URLS_ENABLED: "false" })).toBe(false);
    expect(localeUrlsEnabled({ LOCALE_URLS_ENABLED: "TRUE" })).toBe(false);
    expect(localeUrlsEnabled({ LOCALE_URLS_ENABLED: "true" })).toBe(true);
  });

  it("REQ-651: 6 idiomas, español primero; og:locale por idioma (REQ-664)", () => {
    expect(LOCALES).toEqual(["es", "en", "pt", "fr", "it", "de"]);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("ja")).toBe(false);
    expect(ogLocale("es")).toBe("es_MX");
    expect(ogLocale("en")).toBe("en_US");
    expect(ogLocale("pt")).toBe("pt_BR");
  });
});

describe("splitLocale", () => {
  it("REQ-651: separa el prefijo del resto de la ruta", () => {
    expect(splitLocale("/en/destinos/mx")).toEqual({ lang: "en", rest: "/destinos/mx", prefix: "en" });
    expect(splitLocale("/en")).toEqual({ lang: "en", rest: "/", prefix: "en" });
    expect(splitLocale("/en/")).toEqual({ lang: "en", rest: "/", prefix: "en" });
    expect(splitLocale("/destinos")).toEqual({ lang: "es", rest: "/destinos", prefix: null });
    expect(splitLocale("/es/tours")).toEqual({ lang: "es", rest: "/tours", prefix: "es" });
  });

  it("REQ-651: un segmento que solo empieza como idioma no es prefijo", () => {
    expect(splitLocale("/entrar")).toEqual({ lang: "es", rest: "/entrar", prefix: null });
    expect(splitLocale("/de-viaje")).toEqual({ lang: "es", rest: "/de-viaje", prefix: null });
  });
});

describe("inScope", () => {
  it("REQ-651: home, /destinos/**, /viajes/{d}/{s}, /tours, /tours/{id}, /traslados", () => {
    for (const p of ["/", "/destinos", "/destinos/mx", "/destinos/mx/ciudad-de-mexico", "/destinos/mx/ciudad-de-mexico/tour-x", "/viajes/peru/x", "/tours", "/tours/abc", "/traslados"]) expect(inScope(p)).toBe(true);
  });

  it("REQ-659: lo demás queda fuera (institucionales, legales, reserva, api)", () => {
    for (const p of ["/nosotros", "/contacto", "/asesores", "/ayuda", "/blog", "/blog/china", "/terminos", "/privacidad", "/reserva/tok", "/arma-tu-viaje", "/la-primera-pieza", "/admin/viajes", "/viajes/gracias", "/events/1", "/tour-retirado"]) expect(inScope(p)).toBe(false);
  });
});

describe("localizePath", () => {
  it("REQ-655: agrega el prefijo a rutas en alcance y conserva ?query y #ancla", () => {
    expect(localizePath("/destinos/mx", "en")).toBe("/en/destinos/mx");
    expect(localizePath("/", "en")).toBe("/en");
    expect(localizePath("/#como-funciona", "fr")).toBe("/fr#como-funciona");
    expect(localizePath("/tours?search=lima&page=2", "de")).toBe("/de/tours?search=lima&page=2");
  });

  it("REQ-655: español sin prefijo; idempotente si ya trae prefijo", () => {
    expect(localizePath("/destinos/mx", "es")).toBe("/destinos/mx");
    expect(localizePath("/en/destinos/mx", "es")).toBe("/destinos/mx");
    expect(localizePath("/en/destinos/mx", "pt")).toBe("/pt/destinos/mx");
    expect(localizePath("/en/tours", "en")).toBe("/en/tours");
  });

  it("REQ-655: fuera de alcance, externos, mailto y relativos no cambian", () => {
    expect(localizePath("/nosotros", "en")).toBe("/nosotros");
    expect(localizePath("/terminos", "en")).toBe("/terminos");
    expect(localizePath("https://wa.me/52", "en")).toBe("https://wa.me/52");
    expect(localizePath("//cdn.example.com/x", "en")).toBe("//cdn.example.com/x");
    expect(localizePath("mailto:a@b.c", "en")).toBe("mailto:a@b.c");
    expect(localizePath("#arriba", "en")).toBe("#arriba");
  });
});

describe("localeRouting (decisión del middleware)", () => {
  const q = new URLSearchParams("a=1");

  it("REQ-650: con la bandera apagada no decide nada", () => {
    expect(localeRouting("/en/destinos", q, false)).toEqual({ type: "none" });
    expect(localeRouting("/destinos", q, false)).toEqual({ type: "none" });
  });

  it("REQ-651/REQ-653: /en/{en alcance} se reescribe a la ruta sin prefijo con idioma en", () => {
    expect(localeRouting("/en/destinos/mx", q, true)).toEqual({ type: "rewrite", lang: "en", path: "/destinos/mx" });
    expect(localeRouting("/en", q, true)).toEqual({ type: "rewrite", lang: "en", path: "/" });
  });

  it("REQ-653: sin prefijo y en alcance = español", () => {
    expect(localeRouting("/destinos/mx", q, true)).toEqual({ type: "rewrite", lang: "es", path: "/destinos/mx" });
  });

  it("REQ-652: /es/... → 301 sin prefijo (con la query); /en/{fuera de alcance} → 302 a español", () => {
    expect(localeRouting("/es/destinos/mx", q, true)).toEqual({ type: "redirect", status: 301, location: "/destinos/mx?a=1" });
    expect(localeRouting("/es", new URLSearchParams(), true)).toEqual({ type: "redirect", status: 301, location: "/" });
    expect(localeRouting("/en/nosotros", new URLSearchParams(), true)).toEqual({ type: "redirect", status: 302, location: "/nosotros" });
  });

  it("REQ-659: sin prefijo y fuera de alcance: nada (sigue con la cookie)", () => {
    expect(localeRouting("/nosotros", q, true)).toEqual({ type: "none" });
  });
});

describe("languageSwitchUrl (selector)", () => {
  it("REQ-656: con idioma en la URL, abre la misma página en el idioma elegido (mismo slug, con query y ancla)", () => {
    expect(languageSwitchUrl("/en/destinos/mx/cdmx/tour-x?d=1#a", "es", { locked: true, current: "en" })).toBe("/destinos/mx/cdmx/tour-x?d=1#a");
    expect(languageSwitchUrl("/destinos/mx", "fr", { locked: true, current: "es" })).toBe("/fr/destinos/mx");
  });

  it("REQ-656/REQ-650: sin bandera o mismo idioma, no navega (solo guarda la preferencia)", () => {
    expect(languageSwitchUrl("/destinos/mx", "en", { locked: false, current: "es" })).toBeNull();
    expect(languageSwitchUrl("/en/tours", "en", { locked: true, current: "en" })).toBeNull();
  });
});
