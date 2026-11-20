import { describe, expect, it } from "vitest";
import { includesView, meetingView, optionCards, practicalText } from "./practical-view";
import type { FichaOption } from "./model";

const opt = (id: string, extra: Partial<FichaOption> = {}): FichaOption => ({ id, name: `Opción ${id}`, price: null, transferIncluded: null, startTime: null, ...extra });

describe("Ficha única, bloques 10–12 (lógica)", () => {
  it("REQ-10828: dos columnas con las dos listas, una si falta la otra, cero sin nada; sin repetidos ni vacíos", () => {
    expect(includesView(["Guía", "Guía", " "], ["Almuerzo"]).columns).toBe(2);
    expect(includesView(["Guía", "Guía", " "], []).includes).toEqual(["Guía"]);
    expect(includesView([], ["Almuerzo"]).columns).toBe(1);
    expect(includesView([" "], []).columns).toBe(0);
  });

  it("REQ-10829: exacto con «Cómo llegar»; zona sin botón; coordenadas inválidas → solo texto; sin nada → null", () => {
    const ex = meetingView({ kind: "exact", lat: -50.34, lng: -72.26, title: "Plaza" });
    expect(ex).toMatchObject({ kind: "exact", directionsUrl: "https://www.google.com/maps/dir/?api=1&destination=-50.34,-72.26" });
    const zone = meetingView({ kind: "zone", lat: -50.34, lng: -72.26, radiusM: 2000, title: null });
    expect(zone?.kind).toBe("zone");
    expect(zone && "directionsUrl" in zone).toBe(false);
    expect(meetingView({ kind: "exact", lat: 0, lng: 0, title: "Hoteles céntricos" })).toEqual({ kind: "text", title: "Hoteles céntricos" });
    expect(meetingView({ kind: "zone", lat: 10, lng: 10, radiusM: 0, title: null })).toBeNull();
    expect(meetingView({ kind: "none", title: "  " })).toBeNull();
  });

  it("REQ-10830: tarjetas por opción con precio final y traslado solo si se sabe; con una sola opción no sale", () => {
    expect(optionCards([opt("a", { price: { amount: 98, currency: "USD", per: "person" } })], "es")).toEqual([]);
    const cards = optionCards([
      opt("a", { price: { amount: 1782, currency: "MXN", per: "person" }, transferIncluded: true, startTime: "09:00" }),
      opt("b", { price: { amount: 0, currency: "MXN", per: "person" }, transferIncluded: false }),
      opt("c"),
    ], "es");
    expect(cards).toHaveLength(3);
    expect(cards[0]).toEqual({ id: "a", name: "Opción a", priceLabel: "MXN $1,782 por persona", transfer: "Con traslado", startTime: "09:00" });
    expect(cards[1].priceLabel).toBeNull();
    expect(cards[1].transfer).toBe("Sin traslado");
    expect(cards[2].transfer).toBeNull();
    expect(JSON.stringify(cards)).not.toMatch(/N\/D/);
  });

  it("REQ-10828 REQ-10829 REQ-10830: textos en cada idioma, español por defecto", () => {
    expect(practicalText("noIncluye", "en")).toBe("Not included");
    expect(practicalText("zona", "es")).toBe("Zona aproximada");
    expect(practicalText("opciones", "xx" as never)).toBe("Opciones y precios");
  });
});
