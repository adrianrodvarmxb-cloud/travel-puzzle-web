import { describe, expect, it } from "vitest";
import { createRequestAdapter } from "./request";
import { chooseAction, probeAdapter } from "../lib/switch";
import { createCartItem } from "../lib/item";
import { chargePart, splitByProvider } from "../lib/split";
import { addSuggestion, openCart } from "../lib/cart";

const q = { type: "tickets" as const, cityCode: "mx-cdmx", cityName: "Ciudad de México", country: "MX", date: "2026-12-10", people: { adults: 2, children: 1 } };
const bigBus = (cities: string[] = ["Ciudad de México", "Londres"], whatsapp: string | null = "525536490320") =>
  createRequestAdapter({ id: "bigbus", types: ["tickets"], provider: "Big Bus", product: "el bus turístico hop-on hop-off", whatsapp, cities: async () => cities });

describe("Adaptador en modo solicitud (Big Bus)", () => {
  it("REQ-121: lo cobra Travel Puzzle y la solicitud va por WhatsApp con ciudad, fecha y personas", async () => {
    const a = bigBus();
    expect(a.mode).toBe("request");
    expect(a.chargedBy).toBe("Travel Puzzle");
    const [offer] = await a.search(q);
    const text = decodeURIComponent(offer.url!.split("text=")[1]);
    expect(text).toBe("Hola Travel Puzzle, quiero pedir el bus turístico hop-on hop-off (Big Bus) en Ciudad de México el 10 dic 2026 para 2 adultos y 1 menor. ¿Me lo cotizan?");
    expect(offer.price).toBeUndefined(); // sin precio verificado: «a cotizar»
  });

  it("REQ-121: Big Bus en modo solicitud nunca muestra pago directo", async () => {
    const probe = await probeAdapter(bigBus(), q);
    const action = chooseAction("tickets", [probe], { whatsapp: "525536490320" }, { cityName: "Ciudad de México", dateFrom: "2026-12-10", people: q.people });
    expect(action).toMatchObject({ kind: "request", label: "Pedir a Travel Puzzle", adapterId: "bigbus" });
    expect(JSON.stringify(action)).not.toMatch(/Reservar|Pagar|checkout|stripe/i);
    const item = createCartItem({
      id: "bb1", type: "tickets", providerId: "bigbus", externalId: "bigbus-mx-cdmx", mode: "request", cityCode: "mx-cdmx",
      date: "2026-12-10", people: q.people, price: { amount: 0, currency: "USD" }, chargedBy: "Travel Puzzle",
      cancellationPolicy: { freeUntilHours: null, text: "La confirma tu asesor al cotizar." },
    });
    expect(await bigBus().charge(item, { success: "s", cancel: "c" })).toEqual({ kind: "none" });
    const cart = addSuggestion(openCart("c1"), item, { source: "user", kind: "tap" });
    expect(await chargePart(splitByProvider(cart)[0], bigBus(), { paymentsEnabled: true, urls: { success: "s", cancel: "c" }, items: cart.items }))
      .toEqual({ kind: "charged", results: [] });
  });

  it("REQ-121: solo hay inventario en las ciudades donde opera (sin acentos ni mayúsculas)", async () => {
    expect((await probeAdapter(bigBus(), { ...q, cityName: "ciudad de mexico" })).result).toBe("inventory");
    expect((await probeAdapter(bigBus(), { ...q, cityName: "Lima" })).result).toBe("empty");
  });

  it("REQ-121: sin asesor no hay solicitud, y si la lista de ciudades falla cae a WhatsApp genérico", async () => {
    expect((await probeAdapter(bigBus(undefined, null), q)).result).toBe("empty");
    const broken = createRequestAdapter({ id: "bigbus", types: ["tickets"], provider: "Big Bus", product: "x", whatsapp: "525536490320", cities: async () => { throw new Error("D1"); } });
    const probe = await probeAdapter(broken, q);
    expect(probe.result).toBe("error");
    expect(chooseAction("tickets", [probe], { whatsapp: "525536490320" }, { cityName: "Ciudad de México", dateFrom: "2026-12-10", people: q.people })?.kind).toBe("whatsapp");
  });
});
