import { describe, expect, it } from "vitest";
import { guaranteeItems, onlinePaymentsFromEnv } from "./guarantees";
import { tripCopy } from "./copy";

const c = tripCopy("es");
const keys = (trip: Parameters<typeof guaranteeItems>[0], payments = false) => guaranteeItems(trip, { onlinePayments: payments }, c).map((g) => g.key);
const peru = { kind: "circuito", titleEs: "Descubriendo el Perú en 9 días", languages: ["es"] };
const bigbus = { kind: "transporte", titleEs: "Bus turístico hop-on hop-off en Londres", languages: ["de", "en", "es", "fr"] };

describe("guaranteeItems: el cuadro solo promete lo que el viaje tiene", () => {
  it("REQ-154: «Guía en español» sale si el viaje tiene guía en español", () => {
    expect(keys(peru)).toContain("g1");
    expect(keys({ ...peru, languages: ["en", "ES"] })).toContain("g1");
    expect(keys({ ...peru, languages: ["es-MX"] })).toContain("g1");
  });
  it("REQ-154: sin español en los idiomas, no hay «Guía en español»", () => {
    expect(keys({ ...peru, languages: ["en"] })).not.toContain("g1");
    expect(keys({ ...peru, languages: [] })).not.toContain("g1");
  });
  it("REQ-154: audioguía en español (Big Bus) o transporte no cuentan como guía", () => {
    expect(keys(bigbus)).not.toContain("g1");
    expect(keys({ ...bigbus, titleEs: "Traslado aeropuerto–hotel en Lima" })).not.toContain("g1");
  });
  it("REQ-156: «Opciones de pago» se oculta mientras no haya pagos en línea", () => {
    expect(keys(peru, false)).not.toContain("g4");
    expect(keys(peru, true)).toContain("g4");
  });
  it("REQ-156: pagos en línea = CART_PAYMENTS_ENABLED o STRIPE_ENABLED en \"true\" exacto", () => {
    expect(onlinePaymentsFromEnv({})).toBe(false);
    expect(onlinePaymentsFromEnv({ CART_PAYMENTS_ENABLED: "false", STRIPE_ENABLED: "false", STRIPE_HOLD_ENABLED: "true" })).toBe(false);
    expect(onlinePaymentsFromEnv({ CART_PAYMENTS_ENABLED: "TRUE" })).toBe(false);
    expect(onlinePaymentsFromEnv({ CART_PAYMENTS_ENABLED: "true" })).toBe(true);
    expect(onlinePaymentsFromEnv({ STRIPE_ENABLED: "true" })).toBe(true);
  });
  it("REQ-157: «Itinerarios a tu medida» solo en viajes personalizados", () => {
    expect(keys({ ...peru, kind: "personalizado" })).toContain("g3");
    for (const kind of ["tour", "circuito", "unica", "transporte"]) expect(keys({ ...peru, kind })).not.toContain("g3");
  });
  it("REQ-157: «Asesores con experiencia» es cierta para todos los viajes y siempre sale", () => {
    for (const t of [peru, bigbus, { ...peru, kind: "personalizado" }, { ...peru, languages: [] }]) expect(keys(t)).toContain("g2");
  });
  it("REQ-154/156/157: hoy (sin pagos) Perú = guía + asesores; Big Bus = solo asesores; orden fijo", () => {
    expect(keys(peru)).toEqual(["g1", "g2"]);
    expect(keys(bigbus)).toEqual(["g2"]);
    expect(keys({ ...peru, kind: "personalizado" }, true)).toEqual(["g1", "g2", "g3", "g4"]);
  });
  it("REQ-154: las etiquetas salen del copy del idioma (se quita por clave, no por texto)", () => {
    for (const lang of ["es", "en", "pt", "de", "fr", "it"]) {
      const cl = tripCopy(lang);
      expect(guaranteeItems(peru, { onlinePayments: false }, cl).map((g) => g.label)).toEqual([cl.g1, cl.g2]);
    }
  });
});
