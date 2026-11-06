import { describe, expect, it } from "vitest";
import { createDeeplinkAdapter } from "./deeplink";
import { createWhatsAppAdvisor } from "./whatsapp";
import { createCartItem } from "../lib/item";

const q = { type: "esim" as const, cityCode: "cn-beijing", country: "CN", date: "2026-12-01", people: { adults: 1, children: 0 } };
const adapter = createDeeplinkAdapter({
  id: "airalo", types: ["esim"], chargedBy: "Airalo", marker: "595791", countries: ["CN", "PE"],
  link: () => "https://tp.example/go?p=airalo", subIdParam: "sub_id",
});

describe("Adaptador deeplink genérico", () => {
  it("REQ-104: abre en el sitio del proveedor con subID por ítem (marker-cartId-itemId)", async () => {
    const item = createCartItem({
      id: "i9", type: "esim", providerId: "airalo", externalId: "cn", mode: "deeplink", cityCode: "cn-beijing",
      date: "2026-12-01", people: { adults: 1, children: 0 }, price: { amount: 0, currency: "USD" },
      chargedBy: "Airalo", cancellationPolicy: { freeUntilHours: null, text: "La define el proveedor." },
    });
    const r = await adapter.reserve({ ...item, cartId: "c5" });
    expect(r.kind).toBe("redirect");
    expect(new URL((r as { url: string }).url).searchParams.get("sub_id")).toBe("595791-c5-i9");
  });

  it("REQ-104: hay inventario solo en los países que cubre", async () => {
    expect((await adapter.availability("cn", q)).available).toBe(true);
    expect((await adapter.availability("mx", { ...q, country: "MX" })).available).toBe(false);
    expect(await adapter.search({ ...q, country: "MX" })).toEqual([]);
    expect(await adapter.search(q)).toHaveLength(1);
  });

  it("REQ-104: no cancela ni cobra en el carrito: eso pasa en el sitio del proveedor", async () => {
    expect((await adapter.cancel({} as never)).ok).toBe(false);
    expect((await adapter.charge({ id: "i1", cartId: "c1" } as never, { success: "s", cancel: "c" })).kind).toBe("redirect");
  });
});

describe("Asesor por WhatsApp", () => {
  it("REQ-105: sin número no hay asesor", () => {
    expect(createWhatsAppAdvisor(undefined).whatsapp).toBeNull();
    expect(createWhatsAppAdvisor("+52 55 3649 0320").whatsapp).toBe("525536490320");
  });
});
