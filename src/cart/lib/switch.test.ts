import { describe, expect, it } from "vitest";
import { chooseAction, probeAdapter, quoteMessage, type AdapterProbe } from "./switch";
import type { ProviderAdapter } from "./adapter";

const ctx = { cityName: "Cusco", dateFrom: "2026-12-01", dateTo: "2026-12-04", people: { adults: 2, children: 1 } };
const advisor = { whatsapp: "525536490320" };
const api = (result: AdapterProbe["result"]): AdapterProbe => ({ adapterId: "freetour", mode: "api", chargedBy: "Travel Puzzle", result });
const deep = (result: AdapterProbe["result"]): AdapterProbe => ({ adapterId: "kiwitaxi", mode: "deeplink", chargedBy: "Kiwitaxi", result, url: "https://kiwi.example/?sub_id=m-c-i" });

describe("Interruptor automático", () => {
  it("REQ-105: adaptador api activo con inventario → reserva directa", () => {
    expect(chooseAction("tour", [api("inventory")], advisor, ctx)).toMatchObject({ kind: "book", adapterId: "freetour", label: "Reservar" });
  });

  it("REQ-105: adaptador deeplink → «Ver opciones» con su enlace", () => {
    expect(chooseAction("transfer", [deep("inventory")], advisor, ctx)).toMatchObject({ kind: "deeplink", label: "Ver opciones", url: "https://kiwi.example/?sub_id=m-c-i" });
  });

  it("REQ-105: sin adaptador → WhatsApp del asesor con ciudad, fechas y personas prellenadas", () => {
    const a = chooseAction("esim", [], advisor, ctx);
    expect(a).toMatchObject({ kind: "whatsapp", label: "Te lo cotiza tu asesor por WhatsApp" });
    const text = decodeURIComponent((a as { url: string }).url.split("text=")[1]);
    expect(text).toContain("Cusco");
    expect(text).toContain("1 dic 2026");
    expect(text).toContain("4 dic 2026");
    expect(text).toContain("2 adultos y 1 menor");
  });

  it("REQ-105: si el adaptador falla, vuelve a WhatsApp", () => {
    expect(chooseAction("tour", [api("error")], advisor, ctx)?.kind).toBe("whatsapp");
    expect(chooseAction("transfer", [deep("error")], advisor, ctx)?.kind).toBe("whatsapp");
  });

  it("REQ-105: nunca hay botón de reserva sin inventario", () => {
    expect(chooseAction("tour", [api("empty")], advisor, ctx)?.kind).toBe("whatsapp");
    expect(chooseAction("tour", [api("empty")], { whatsapp: null }, ctx)).toBeNull();
  });

  it("REQ-105: sin adaptador ni asesor, la tarjeta no se muestra", () => {
    expect(chooseAction("lodging", [], { whatsapp: null }, ctx)).toBeNull();
    expect(chooseAction("lodging", [], { whatsapp: "" }, ctx)).toBeNull();
  });

  it("REQ-105: api con inventario gana sobre deeplink", () => {
    expect(chooseAction("tour", [deep("inventory"), api("inventory")], advisor, ctx)?.kind).toBe("book");
  });

  it("REQ-107: el seguro nunca se reserva por api; solo deeplink o asesor", () => {
    expect(chooseAction("insurance", [api("inventory")], advisor, ctx)?.kind).toBe("whatsapp");
    expect(chooseAction("insurance", [api("inventory"), deep("inventory")], advisor, ctx)?.kind).toBe("deeplink");
  });

  it("REQ-105: probeAdapter marca error cuando el adaptador lanza, y vacío sin lugares", async () => {
    const make = (availability: ProviderAdapter["availability"], search: ProviderAdapter["search"] = async () => [{ externalId: "1", title: "T", price: { amount: 1, currency: "EUR" } }]): ProviderAdapter => ({
      id: "p", mode: "api", types: ["tour"], chargedBy: "P", search, availability,
      reserve: async () => ({ kind: "reserved", externalRef: "r" }), cancel: async () => ({ ok: true }), charge: async () => ({ kind: "none" }),
    });
    const q = { type: "tour" as const, cityCode: "pe-cusco", country: "PE", date: "2026-12-01", people: { adults: 2, children: 0 } };
    expect((await probeAdapter(make(async () => { throw new Error("500"); }), q)).result).toBe("error");
    expect((await probeAdapter(make(async () => ({ available: false })), q)).result).toBe("empty");
    expect((await probeAdapter(make(async () => ({ available: true })), q)).result).toBe("inventory");
    expect((await probeAdapter(make(async () => ({ available: true }), async () => []), q)).result).toBe("empty");
  });

  it("REQ-105: el mensaje de WhatsApp es determinista (sin Intl)", () => {
    expect(quoteMessage("transfer", ctx)).toBe(
      "Hola Travel Puzzle, quiero cotizar un traslado en Cusco del 1 dic 2026 al 4 dic 2026 para 2 adultos y 1 menor.",
    );
  });
});
