import { describe, it, expect } from "vitest";
import {
  ROUTES, countryPath, cityPath, tourPath, parseLegacyTourId, legacyTourResolution,
  legacyCountryResolution, tourPageResolution, ownTripResolution,
} from "./routes";

const lima = { countrySlug: "peru", citySlug: "lima" };

describe("REQ-088: URLs canónicas generadas desde los datos", () => {
  it("REQ-088: hubs y rutas por país, ciudad y ficha, sin código por país", () => {
    expect(ROUTES.primeraPieza).toBe("/la-primera-pieza");
    expect(ROUTES.destinos).toBe("/destinos");
    expect(countryPath("china")).toBe("/destinos/china");
    expect(cityPath("china", "pekin")).toBe("/destinos/china/pekin");
    expect(tourPath("peru", "lima", "free-tour-centro-historico")).toBe("/destinos/peru/lima/free-tour-centro-historico");
  });
  it("REQ-088: rechaza slugs inválidos (nunca un id ni texto con acentos en la URL)", () => {
    expect(() => countryPath("Perú")).toThrow();
    expect(() => cityPath("peru", "")).toThrow();
    expect(() => tourPath("peru", "lima", "tour/1")).toThrow();
  });
});

describe("REQ-092: 301 desde URLs viejas y 410 para removidos", () => {
  it("REQ-092: reconoce /tours/{id} y nada más", () => {
    expect(parseLegacyTourId("/tours/ckx123")).toBe("ckx123");
    expect(parseLegacyTourId("/tours/ckx123/")).toBe("ckx123");
    expect(parseLegacyTourId("/tours")).toBeNull();
    expect(parseLegacyTourId("/tours/a/b")).toBeNull();
  });
  it("REQ-092: /tours/{id} activo con slug → 301 directo a la ficha nueva", () => {
    expect(legacyTourResolution({ ...lima, slug: "free-tour-lima", status: "active" })).toEqual({ kind: "redirect", status: 301, location: "/destinos/peru/lima/free-tour-lima" });
  });
  it("REQ-092: un tour 'missing' sigue respondiendo y también redirige con 301", () => {
    expect(legacyTourResolution({ ...lima, slug: "free-tour-lima", status: "missing" })).toMatchObject({ status: 301 });
  });
  it("REQ-092: removed sin equivalente → 410 con enlace a su ciudad", () => {
    expect(legacyTourResolution({ ...lima, slug: "x", status: "removed" })).toEqual({ kind: "gone", status: 410, cityHref: "/destinos/peru/lima" });
    expect(tourPageResolution({ ...lima, slug: "x", status: "removed" })).toEqual({ kind: "gone", status: 410, cityHref: "/destinos/peru/lima" });
  });
  it("REQ-092: removed con un tour equivalente → 301 al equivalente", () => {
    const eq = { ...lima, slug: "free-tour-lima-2" };
    expect(tourPageResolution({ ...lima, slug: "x", status: "removed", equivalent: eq })).toEqual({ kind: "redirect", status: 301, location: "/destinos/peru/lima/free-tour-lima-2" });
  });
  it("REQ-092: sin slug todavía (antes de la Ola 3) la URL vieja se queda como está; tour inexistente → 404", () => {
    expect(legacyTourResolution({ ...lima, slug: null, status: "active" })).toEqual({ kind: "keep" });
    expect(legacyTourResolution(null)).toEqual({ kind: "not-found", status: 404 });
  });
  it("REQ-092: la ficha nueva de un tour activo responde 200", () => {
    expect(tourPageResolution({ ...lima, slug: "a", status: "active" })).toEqual({ kind: "ok", status: 200 });
  });
  it("REQ-092: /tours?countryId= → 301 al país; sin país con slug se queda", () => {
    expect(legacyCountryResolution("PE", "peru")).toEqual({ kind: "redirect", status: 301, location: "/destinos/peru" });
    expect(legacyCountryResolution("12", null)).toEqual({ kind: "keep" });
    expect(legacyCountryResolution(null, null)).toEqual({ kind: "keep" });
  });
  it("REQ-092 (gate 4): los viajes propios /viajes/{destino}/{slug} entran a /destinos con 301", () => {
    expect(ownTripResolution({ ...lima, slug: "peru-magico-7-dias" })).toEqual({ kind: "redirect", status: 301, location: "/destinos/peru/lima/peru-magico-7-dias" });
    expect(ownTripResolution(null)).toEqual({ kind: "keep" });
  });
});
