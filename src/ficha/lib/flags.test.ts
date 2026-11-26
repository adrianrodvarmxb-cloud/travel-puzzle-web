import { describe, expect, it } from "vitest";
import { addonsOn, fichaUnicaMode, fichaUnicaOn, fichaUnicaProviderFor, isPreviewHost, localCurrencyOn } from "./flags";
import { convert, fxTableFromMxn } from "./local-price";

describe("flags: FICHA_UNICA_*_ENABLED con modo preview (ola 7)", () => {
  it("REQ-10859: tres valores; cualquier otro es «false»", () => {
    expect(fichaUnicaMode("true")).toBe("true");
    expect(fichaUnicaMode(" Preview ")).toBe("preview");
    expect(fichaUnicaMode("false")).toBe("false");
    expect(fichaUnicaMode(undefined)).toBe("false");
    expect(fichaUnicaMode("1")).toBe("false");
  });

  it("REQ-10859: «preview» monta la plantilla solo en versiones sin tráfico; «true» en todas; «false» en ninguna", () => {
    const prod = "www.travelpuzzle.com.mx";
    const prev = "pr-717-travel-puzzle-web.adrianrodvarmx.workers.dev";
    expect(isPreviewHost(prev)).toBe(true);
    expect(isPreviewHost("localhost:3000")).toBe(true);
    expect(isPreviewHost(prod)).toBe(false);
    expect(fichaUnicaOn({ FICHA_UNICA_TANGOL_ENABLED: "preview" }, "tangol", prev)).toBe(true);
    expect(fichaUnicaOn({ FICHA_UNICA_TANGOL_ENABLED: "preview" }, "tangol", prod)).toBe(false);
    expect(fichaUnicaOn({ FICHA_UNICA_TANGOL_ENABLED: "true" }, "tangol", prod)).toBe(true);
    expect(fichaUnicaOn({ FICHA_UNICA_TANGOL_ENABLED: "false" }, "tangol", prev)).toBe(false);
    expect(fichaUnicaOn({}, "tangol", prev)).toBe(false);
    // la bandera de Tangol no enciende FREETOUR ni los viajes
    expect(fichaUnicaOn({ FICHA_UNICA_TANGOL_ENABLED: "true" }, "freetour", prod)).toBe(false);
    expect(fichaUnicaOn({ FICHA_UNICA_TANGOL_ENABLED: "true" }, "trip", prod)).toBe(false);
  });

  it("REQ-10859: la bandera se elige por tabla y proveedor; un proveedor de tour desconocido no tiene plantilla nueva", () => {
    expect(fichaUnicaProviderFor("tour", "Tangol")).toBe("tangol");
    expect(fichaUnicaProviderFor("tour", "freetour")).toBe("freetour");
    expect(fichaUnicaProviderFor("tour", "otro")).toBeNull();
    expect(fichaUnicaProviderFor("trip", null)).toBe("trip");
  });

  it("REQ-10859: la tabla de cambio de la ficha sale de las tasas de Banxico (MXN por USD/EUR)", () => {
    const t = fxTableFromMxn({ USD: 20, EUR: 22, date: "2026-11-22" });
    expect(t?.base).toBe("MXN");
    expect(convert(100, "USD", "MXN", t)).toBe(2000);
    expect(convert(2200, "MXN", "EUR", t)).toBe(100);
    expect(fxTableFromMxn(null)).toBeNull();
    expect(convert(1, "USD", "MXN", fxTableFromMxn({ USD: 0, EUR: 22, date: "x" }))).toBeNull();
  });

  it("REQ-10874: LOCAL_CURRENCY_ENABLED solo enciende con «true»; apagada, el panel muestra la moneda del proveedor", () => {
    expect(localCurrencyOn({ LOCAL_CURRENCY_ENABLED: "true" })).toBe(true);
    expect(localCurrencyOn({ LOCAL_CURRENCY_ENABLED: " TRUE " })).toBe(true);
    expect(localCurrencyOn({ LOCAL_CURRENCY_ENABLED: "preview" })).toBe(false);
    expect(localCurrencyOn({ LOCAL_CURRENCY_ENABLED: "false" })).toBe(false);
    expect(localCurrencyOn({})).toBe(false);
  });
});

describe("flags: FICHA_ADDONS_ENABLED (ola 12)", () => {
  it("REQ-10882: solo «true» enciende los adicionales; apagada por omisión", () => {
    expect(addonsOn({ FICHA_ADDONS_ENABLED: "true" })).toBe(true);
    expect(addonsOn({ FICHA_ADDONS_ENABLED: " TRUE " })).toBe(true);
    expect(addonsOn({ FICHA_ADDONS_ENABLED: "preview" })).toBe(false);
    expect(addonsOn({ FICHA_ADDONS_ENABLED: "false" })).toBe(false);
    expect(addonsOn({})).toBe(false);
  });
});
