import { describe, it, expect } from "vitest";
import {
  BANNER_COOKIES, POLITICA_COOKIES, POLITICA_COOKIES_BORRADOR, VERSIONES_POLITICA_COOKIES, bannerVisible, isCookiesPolicyEnabled,
  politicaCookiesVigente, textoBanner,
} from "./cookies";
import { toBlocks } from "./blocks";

describe("REQ-084 política de cookies (bandera)", () => {
  it("REQ-084: la página /cookies queda tras COOKIES_POLICY_ENABLED, apagada salvo \"true\"", () => {
    expect(isCookiesPolicyEnabled(undefined)).toBe(false);
    expect(isCookiesPolicyEnabled("false")).toBe(false);
    expect(isCookiesPolicyEnabled("true")).toBe(true);
  });
});

// REQ-10788: Dictamen del abogado, 19-11-2026, punto 4: el texto §A sustituye al borrador y el banner §B acompaña (es/en).
describe("REQ-10788 política de cookies del dictamen (§A)", () => {
  it("REQ-10788: el texto vigente es el §A literal: tp_cart, Cloudflare, Travelpayouts / Kiwitaxi, sin la nota de borrador", () => {
    const t = POLITICA_COOKIES;
    expect(t).toContain("operado por Travel Puzzle");
    expect(t).toContain("tp_cart: mantiene activos los servicios agregados a su carrito «Arma tu viaje»");
    expect(t).toContain("Vigencia: 30 días o hasta que vacíe el carrito.");
    expect(t).toContain("preferredLanguage: conserva el idioma de navegación elegido por el usuario. Vigencia: hasta 1 año.");
    expect(t).toContain("Cookies de seguridad de infraestructura (Cloudflare)");
    expect(t).toContain("(Travelpayouts / Kiwitaxi)");
    expect(t).toContain("Actualmente Travel Puzzle no utiliza cookies analíticas, de rastreo comportamental ni publicitarias propias.");
    expect(t).toContain("info@travelpuzzle.com.mx");
    expect(t).not.toMatch(/borrador|pendiente de revisión/i);
    expect(t).not.toMatch(/freetour/i);
  });

  it("REQ-10788: conserva el formato de los textos legales (títulos ## e incisos -) para LegalDocument", () => {
    const blocks = toBlocks(POLITICA_COOKIES);
    expect(blocks.filter((b) => b.type === "h2").length).toBeGreaterThanOrEqual(5);
    expect(POLITICA_COOKIES).toContain("- tp_cart:");
  });

  it("REQ-10788: el banner §B sale en español o en inglés con «Entendido» y «Ver política»; otro idioma cae al español", () => {
    expect(BANNER_COOKIES.es.texto).toBe("Usamos cookies estrictamente necesarias para que el sitio funcione (idioma, carrito y sesión). No usamos cookies analíticas ni publicitarias propias; los enlaces a socios externos aplican sus propias políticas al abrirse.");
    expect(BANNER_COOKIES.es.entendido).toBe("Entendido");
    expect(BANNER_COOKIES.es.verPolitica).toBe("Ver política");
    expect(BANNER_COOKIES.en.texto).toBe("We use strictly necessary cookies so the site works properly (language, cart, and session). We do not use our own analytics or advertising cookies; external partner links apply their own policies when opened.");
    expect(BANNER_COOKIES.en.entendido).toBe("Got it");
    expect(BANNER_COOKIES.en.verPolitica).toBe("Cookie policy");
    expect(textoBanner("en")).toBe(BANNER_COOKIES.en);
    expect(textoBanner("es")).toBe(BANNER_COOKIES.es);
    expect(textoBanner("pt")).toBe(BANNER_COOKIES.es);
    expect(textoBanner(undefined)).toBe(BANNER_COOKIES.es);
  });

  it("REQ-10788: el banner se ve con la bandera encendida y sin «Entendido» guardado; nunca con la bandera apagada", () => {
    expect(bannerVisible({ encendido: true, entendido: null })).toBe(true);
    expect(bannerVisible({ encendido: true, entendido: "" })).toBe(true);
    expect(bannerVisible({ encendido: true, entendido: "2026-11-19" })).toBe(false);
    expect(bannerVisible({ encendido: false, entendido: null })).toBe(false);
  });
});

// REQ-10786: Dictamen, punto 2: sin bitácora por visitante; se conserva el historial interno de versiones con fecha de vigencia.
describe("REQ-10786 historial interno de versiones de la política", () => {
  it("REQ-10786: hay al menos dos versiones con fecha, la última es el §A y el borrador anterior sigue en el historial", () => {
    expect(VERSIONES_POLITICA_COOKIES.length).toBeGreaterThanOrEqual(2);
    for (const v of VERSIONES_POLITICA_COOKIES) expect(v.vigenteDesde).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const ultima = VERSIONES_POLITICA_COOKIES[VERSIONES_POLITICA_COOKIES.length - 1];
    expect(ultima.texto).toBe(POLITICA_COOKIES);
    expect(ultima.fuente).toMatch(/Dictamen del abogado, 19-11-2026, punto 4/);
    expect(VERSIONES_POLITICA_COOKIES.some((v) => v.texto === POLITICA_COOKIES_BORRADOR)).toBe(true);
  });

  it("REQ-10786: la versión vigente se elige por fecha; antes de la primera no hay ninguna", () => {
    expect(politicaCookiesVigente("2026-11-19")?.texto).toBe(POLITICA_COOKIES);
    expect(politicaCookiesVigente("2026-11-10")?.texto).toBe(POLITICA_COOKIES_BORRADOR);
    expect(politicaCookiesVigente("2026-01-01")).toBeNull();
  });
});
