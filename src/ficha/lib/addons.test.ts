import { describe, expect, it } from "vitest";
import { addonCards, addonFromRecord, transferAddonFromOptions, visibleAddons, type FichaAddon } from "./addons";
import type { FichaOption } from "./model";

const opt = (p: Partial<FichaOption> & { id: string }): FichaOption => ({ name: p.id, price: null, transferIncluded: null, startTime: null, ...p });
const usd = (amount: number): FichaOption["price"] => ({ amount, currency: "USD", per: "person" });

const addon = (p: Partial<FichaAddon> & { id: string }): FichaAddon => ({ kind: "other", name: p.id, price: usd(10), season: null, note: null, ...p });

describe("addons (ola 12, REQ-10636): adicionales a precio final, sin neto", () => {
  it("REQ-10881: el traslado de Tangol sale de sus opciones con y sin traslado, con la diferencia de precio a la vista", () => {
    const a = transferAddonFromOptions([opt({ id: "A", price: usd(100), transferIncluded: false }), opt({ id: "B", price: usd(130), transferIncluded: true })], "es");
    expect(a).toEqual({ id: "transfer", kind: "transfer", name: "Traslado desde tu hotel", price: { amount: 30, currency: "USD", per: "person" }, season: null, note: null });
    expect(transferAddonFromOptions([opt({ id: "A", price: usd(100), transferIncluded: false }), opt({ id: "B", price: usd(130), transferIncluded: true })], "en")?.name).toBe("Hotel pickup");
  });

  it("REQ-10881: con varias opciones por lado se compara la más baja de cada lado", () => {
    const a = transferAddonFromOptions(
      [opt({ id: "A", price: usd(120), transferIncluded: false }), opt({ id: "A2", price: usd(100), transferIncluded: false }), opt({ id: "B", price: usd(150), transferIncluded: true }), opt({ id: "B2", price: usd(135), transferIncluded: true })],
      "es",
    );
    expect(a?.price).toEqual({ amount: 35, currency: "USD", per: "person" });
  });

  it("REQ-10881: sin un lado, sin precio, con monedas o bases distintas, o sin diferencia positiva, no hay adicional (nunca un precio inventado)", () => {
    expect(transferAddonFromOptions([opt({ id: "A", price: usd(100), transferIncluded: true })], "es")).toBeNull();
    expect(transferAddonFromOptions([opt({ id: "A", price: null, transferIncluded: false }), opt({ id: "B", price: usd(130), transferIncluded: true })], "es")).toBeNull();
    expect(transferAddonFromOptions([opt({ id: "A", price: { amount: 100, currency: "ARS", per: "person" }, transferIncluded: false }), opt({ id: "B", price: usd(130), transferIncluded: true })], "es")).toBeNull();
    expect(transferAddonFromOptions([opt({ id: "A", price: { amount: 100, currency: "USD", per: "group" }, transferIncluded: false }), opt({ id: "B", price: usd(130), transferIncluded: true })], "es")).toBeNull();
    expect(transferAddonFromOptions([opt({ id: "A", price: usd(130), transferIncluded: false }), opt({ id: "B", price: usd(130), transferIncluded: true })], "es")).toBeNull();
    // Las opciones de Tangol de hoy (sin precio ni dato de traslado) no producen nada: la ficha no cambia.
    expect(transferAddonFromOptions([opt({ id: "1" }), opt({ id: "2" })], "es")).toBeNull();
  });

  it("REQ-10881: sin precio confirmado no se muestra; sin precio positivo tampoco", () => {
    expect(visibleAddons([addon({ id: "q", price: null }), addon({ id: "z", price: usd(0) }), addon({ id: "n", price: usd(-5) }), addon({ id: "ok" })]).map((a) => a.id)).toEqual(["ok"]);
  });

  it("REQ-10881: la temporada va con sus dos fechas («si no está clara, no publicar») y no se muestra si ya pasó", () => {
    const ok = addon({ id: "alta", kind: "date-surcharge", season: { from: "2026-12-15", to: "2027-01-10" } });
    const sinFin = addon({ id: "sinfin", kind: "date-surcharge", season: { from: "2026-12-15", to: "" } });
    const alReves = addon({ id: "reves", kind: "date-surcharge", season: { from: "2027-01-10", to: "2026-12-15" } });
    const pasada = addon({ id: "pasada", kind: "date-surcharge", season: { from: "2025-12-15", to: "2026-01-10" } });
    expect(visibleAddons([ok, sinFin, alReves, pasada], { today: "2026-11-26" }).map((a) => a.id)).toEqual(["alta"]);
    expect(visibleAddons([pasada]).map((a) => a.id)).toEqual(["pasada"]); // sin «hoy» no se juzga la vigencia
  });

  it("REQ-10881: un vuelo interno solo sale con su cláusula de deslinde; los repetidos se quitan", () => {
    expect(visibleAddons([addon({ id: "v", kind: "internal-flight", note: null })])).toEqual([]);
    const v = addon({ id: "v", kind: "internal-flight", note: "La aerolínea opera el vuelo; Travel Puzzle no responde por cambios de horario." });
    expect(visibleAddons([v, v]).length).toBe(1);
  });

  it("REQ-10881: addonFromRecord solo toma los campos conocidos: el neto, el markup y la comisión nunca pasan", () => {
    const a = addonFromRecord({ id: "ind", kind: "single-room", name: "Habitación individual", price: { amount: 250, currency: "USD", per: "person" }, net: 180, neto: 180, markup: 0.3, commission: 70, season: null, note: null });
    expect(a).toEqual({ id: "ind", kind: "single-room", name: "Habitación individual", price: { amount: 250, currency: "USD", per: "person" }, season: null, note: null });
    expect(JSON.stringify(a)).not.toMatch(/net|markup|commission/i);
    expect(addonFromRecord({ id: "x", kind: "rara", name: "x" })).toBeNull(); // tipo desconocido
    expect(addonFromRecord({ id: "", kind: "other", name: "x" })).toBeNull();
    expect(addonFromRecord({ id: "x", kind: "other", name: "x", price: { amount: "10", currency: "USD", per: "person" } })?.price).toBeNull(); // precio mal formado = sin precio
    expect(addonFromRecord(null)).toBeNull();
  });

  it("REQ-10881: las tarjetas llevan el precio en la moneda del proveedor y, con la moneda local, la ruta de /api/precio-local", () => {
    const cards = addonCards([addon({ id: "ind", kind: "single-room", name: "Habitación individual", price: usd(250) }), addon({ id: "alta", kind: "date-surcharge", name: "Temporada alta", price: usd(40), season: { from: "2026-12-15", to: "2027-01-10" } })], "es", { localCurrency: true });
    expect(cards[0]).toEqual({ id: "ind", kind: "single-room", name: "Habitación individual", priceLabel: "USD $250 por persona", localUrl: "/api/precio-local?amount=250&currency=USD&per=person&lang=es", seasonLabel: null, note: null });
    expect(cards[1].seasonLabel).toBe("Del 2026-12-15 al 2027-01-10");
    expect(addonCards([addon({ id: "ind", price: usd(250) })], "en", { localCurrency: false })[0].localUrl).toBeNull();
    expect(addonCards([addon({ id: "q", price: null })], "es", { localCurrency: true })).toEqual([]); // sin precio, no sale
  });
});
