import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { localeStep } from "./middleware";

const req = (url: string, headers: Record<string, string> = {}) => new NextRequest(new URL(url, "https://travelpuzzle.com.mx"), { headers });
const ON = { LOCALE_URLS_ENABLED: "true" };

describe("localeStep (middleware de idioma)", () => {
  it("REQ-650: bandera apagada: sin redirect, misma ruta, sin idioma ni encabezados nuevos", () => {
    const s = localeStep(req("/en/destinos/mx"), {});
    expect(s.redirect).toBeNull();
    expect(s.pathname).toBe("/en/destinos/mx");
    expect(s.lang).toBeNull();
    expect(s.finish()).toBeNull();
  });

  it("REQ-651/REQ-653: /en/... reescribe a la ruta sin prefijo con x-tp-lang=en", () => {
    const s = localeStep(req("/en/destinos/mx?x=1"), ON);
    expect(s.pathname).toBe("/destinos/mx");
    expect(s.lang).toBe("en");
    const res = s.finish()!;
    expect(res.headers.get("x-middleware-rewrite")).toBe("https://travelpuzzle.com.mx/destinos/mx?x=1");
    expect(res.headers.get("x-middleware-request-x-tp-lang")).toBe("en");
  });

  it("REQ-653: un x-tp-lang que llega desde fuera se sobrescribe con el idioma de la URL", () => {
    const res = localeStep(req("/destinos/mx", { "x-tp-lang": "de" }), ON).finish()!;
    expect(res.headers.get("x-middleware-request-x-tp-lang")).toBe("es");
    expect(res.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("REQ-659: fuera de alcance sin prefijo: no pone idioma y borra el encabezado externo", () => {
    const s = localeStep(req("/nosotros", { "x-tp-lang": "de" }), ON);
    expect(s.lang).toBeNull();
    const res = s.finish()!;
    expect(res.headers.get("x-middleware-request-x-tp-lang")).toBeNull();
    expect(res.headers.get("x-middleware-override-headers")).not.toContain("x-tp-lang");
  });

  it("REQ-652: /es/... → 301 y /en/{fuera de alcance} → 302", () => {
    const a = localeStep(req("/es/tours?search=lima"), ON).redirect!;
    expect(a.status).toBe(301);
    expect(a.headers.get("location")).toBe("https://travelpuzzle.com.mx/tours?search=lima");
    const b = localeStep(req("/en/nosotros"), ON).redirect!;
    expect(b.status).toBe(302);
    expect(b.headers.get("location")).toBe("https://travelpuzzle.com.mx/nosotros");
  });

  it("REQ-658: las redirecciones de pasos siguientes conservan el prefijo", () => {
    const s = localeStep(req("/en/tours/abc"), ON);
    expect(s.localize("/destinos/mx/cdmx/tour-x")).toBe("/en/destinos/mx/cdmx/tour-x");
    expect(s.localize("/traslados#transporte")).toBe("/en/traslados#transporte");
    expect(localeStep(req("/tours/abc"), ON).localize("/destinos/x")).toBe("/destinos/x");
    expect(localeStep(req("/en/tours/abc"), {}).localize("/destinos/x")).toBe("/destinos/x");
  });
});
