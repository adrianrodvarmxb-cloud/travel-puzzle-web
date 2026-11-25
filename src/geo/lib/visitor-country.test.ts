// REQ-10874: país del visitante desde la cabecera del borde (`cf-ipcountry`). npx vitest run src/geo/lib/visitor-country.test.ts
import { describe, expect, it } from "vitest";
import { visitorCountryFrom } from "./visitor-country";

const headers = (h: Record<string, string>) => (name: string) => h[name.toLowerCase()] ?? null;

describe("REQ-10874: país del visitante (ola 9, decisión 32)", () => {
  it("REQ-10874: toma `cf-ipcountry` como ISO 3166-1 alfa-2 en mayúsculas", () => {
    expect(visitorCountryFrom(headers({ "cf-ipcountry": "MX" }))).toBe("MX");
    expect(visitorCountryFrom(headers({ "cf-ipcountry": "ar" }))).toBe("AR");
  });

  it("REQ-10874: sin cabecera, desconocido (XX), Tor (T1) o valor raro → null (nunca se inventa el país)", () => {
    expect(visitorCountryFrom(headers({}))).toBeNull();
    expect(visitorCountryFrom(headers({ "cf-ipcountry": "XX" }))).toBeNull();
    expect(visitorCountryFrom(headers({ "cf-ipcountry": "T1" }))).toBeNull();
    expect(visitorCountryFrom(headers({ "cf-ipcountry": "MEX" }))).toBeNull();
    expect(visitorCountryFrom(headers({ "cf-ipcountry": "" }))).toBeNull();
  });
});
