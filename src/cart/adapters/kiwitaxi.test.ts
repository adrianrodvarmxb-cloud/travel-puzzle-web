import { describe, expect, it } from "vitest";
import { createKiwitaxiAdapter, kiwitaxiLink, KIWITAXI } from "./kiwitaxi";
import { chooseAction, probeAdapter } from "../lib/switch";

const q = { type: "transfer" as const, cityCode: "pe-lima", cityName: "Lima", country: "PE", date: "2026-12-10", people: { adults: 2, children: 1 }, cartId: "c42", itemId: "transfer" };

describe("Adaptador Kiwitaxi (deeplink de Travelpayouts)", () => {
  it("REQ-120: usa el redirector tp.media con nuestra cuenta y el programa de Kiwitaxi", () => {
    const u = new URL(kiwitaxiLink({ cityName: "Lima", cartId: "c42", itemId: "transfer" }));
    expect(u.origin + u.pathname).toBe("https://tp.media/r");
    expect(u.searchParams.get("trs")).toBe("595791");
    expect(u.searchParams.get("p")).toBe(KIWITAXI.programId);
    expect(u.searchParams.get("campaign_id")).toBe("1");
  });

  it("REQ-120: subID por ítem en el marker (marker.cartId_itemId, caracteres que acepta Travelpayouts)", () => {
    const u = new URL(kiwitaxiLink({ cityName: "Lima", cartId: "c-4/2", itemId: "trans fer" }));
    expect(u.searchParams.get("marker")).toBe("800669.c42_transfer");
    expect(u.searchParams.get("marker")).toMatch(/^800669\.[A-Za-z0-9_]+$/);
  });

  it("REQ-120: prellena el destino (y el aeropuerto si se sabe) en la búsqueda de Kiwitaxi en español", () => {
    const inner = new URL(new URL(kiwitaxiLink({ cityName: "Ciudad de México", airport: "MEX", cartId: "c1", itemId: "t" })).searchParams.get("u")!);
    expect(inner.origin + inner.pathname).toBe("https://kiwitaxi.com/es/search");
    expect(inner.searchParams.get("to")).toBe("Ciudad de México");
    expect(inner.searchParams.get("from")).toBe("MEX");
    const noAirport = new URL(new URL(kiwitaxiLink({ cityName: "Lima", cartId: "c1", itemId: "t" })).searchParams.get("u")!);
    expect(noAirport.searchParams.has("from")).toBe(false);
    // Fecha, hora y personas: Kiwitaxi no documenta esos parámetros; no se inventan.
    expect([...inner.searchParams.keys()].sort()).toEqual(["from", "to"]);
  });

  it("REQ-120: la tarjeta de traslado usa el adaptador: «Ver opciones» y «Lo reservas con Kiwitaxi»", async () => {
    const a = createKiwitaxiAdapter();
    expect(a.mode).toBe("deeplink");
    expect(a.chargedBy).toBe("Kiwitaxi");
    const probe = await probeAdapter(a, q);
    expect(probe.result).toBe("inventory");
    const action = chooseAction("transfer", [probe], { whatsapp: "525536490320" }, { cityName: "Lima", dateFrom: "2026-12-10", people: q.people });
    expect(action).toMatchObject({ kind: "deeplink", label: "Ver opciones", adapterId: "kiwitaxi" });
    expect(new URL((action as { url: string }).url).searchParams.get("marker")).toBe("800669.c42_transfer");
  });

  it("REQ-120: si el adaptador falla (sin ciudad), cae a WhatsApp", async () => {
    const probe = await probeAdapter(createKiwitaxiAdapter(), { ...q, cityName: "" });
    expect(probe.result).toBe("error");
    expect(chooseAction("transfer", [probe], { whatsapp: "525536490320" }, { cityName: "Lima", dateFrom: "2026-12-10", people: q.people })?.kind).toBe("whatsapp");
  });

  it("REQ-120: solo ofrece traslados", async () => {
    expect(await createKiwitaxiAdapter().search({ ...q, type: "esim" })).toEqual([]);
  });
});
