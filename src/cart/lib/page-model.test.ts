import { describe, expect, it } from "vitest";
import { buildArmaTuViajeModel, cartIdFromToken, parseTripQuery } from "./page-model";

const NOW = Date.parse("2026-12-01T12:00:00Z");
const piece = { title: "Free tour por el centro de Lima", date: "2026-12-10T10:00", cityName: "Lima", people: { adults: 2, children: 0 }, country: "PE" };
const query = parseTripQuery({ pais: "PE", cc: "pe-lima" });

describe("Modelo de la página Arma tu viaje", () => {
  it("REQ-106: la Primera Pieza se muestra confirmada con costo 0", () => {
    const m = buildArmaTuViajeModel({ piece, query, advisor: { whatsapp: "525536490320" }, probes: {}, flags: {}, now: NOW });
    expect(m.piece).toMatchObject({ title: piece.title, when: "10 dic 2026", status: "Confirmada", cost: "Costo 0" });
  });

  it("REQ-105: sin adaptadores todas las tarjetas van al asesor por WhatsApp con la ciudad y las personas", () => {
    const m = buildArmaTuViajeModel({ piece, query, advisor: { whatsapp: "525536490320" }, probes: {}, flags: {}, now: NOW });
    expect(m.cards.length).toBe(4);
    expect(m.cards.every((c) => c.action?.kind === "whatsapp")).toBe(true);
    expect(decodeURIComponent((m.cards[0].action as { url: string }).url)).toContain("Lima");
  });

  it("REQ-105: sin asesor ni adaptadores no se pinta ninguna tarjeta", () => {
    const m = buildArmaTuViajeModel({ piece, query, advisor: { whatsapp: null }, probes: {}, flags: {}, now: NOW });
    expect(m.cards).toEqual([]);
  });

  it("REQ-105: una categoría con api e inventario ofrece reserva directa", () => {
    const m = buildArmaTuViajeModel({
      piece, query, advisor: { whatsapp: null }, flags: {}, now: NOW,
      probes: { tour: [{ adapterId: "freetour", mode: "api", chargedBy: "Travel Puzzle", result: "inventory" }] },
    });
    expect(m.cards.map((c) => [c.type, c.action?.kind, c.chargedByLabel])).toEqual([["tour", "book", "Lo reservas con Travel Puzzle"]]);
  });

  it("REQ-108: aplica las reglas del destino (Perú: excursiones primero) y nada preseleccionado", () => {
    const m = buildArmaTuViajeModel({ piece, query, advisor: { whatsapp: "525536490320" }, probes: {}, flags: {}, now: NOW });
    expect(m.cards[0].type).toBe("day_trip");
    expect(m.cards.every((c) => !c.selected)).toBe(true);
    expect(m.cityCode).toBe("pe-lima");
  });

  it("REQ-106: sin Primera Pieza no hay carrusel", () => {
    const m = buildArmaTuViajeModel({ piece: null, query, advisor: { whatsapp: "525536490320" }, probes: {}, flags: {}, now: NOW });
    expect(m).toEqual({ piece: null, cards: [], cityCode: null });
  });

  it("REQ-120: la tarjeta de traslado usa el adaptador deeplink con la ciudad de la primera pieza", () => {
    const m = buildArmaTuViajeModel({
      piece, query: parseTripQuery({ pais: "ES", cc: "es-madrid" }), advisor: { whatsapp: "525536490320" }, flags: {}, now: NOW,
      probes: { transfer: [{ adapterId: "kiwitaxi", mode: "deeplink", chargedBy: "Kiwitaxi", result: "inventory", url: "https://tp.media/r?x=1" }] },
    });
    const t = m.cards.find((c) => c.type === "transfer")!;
    expect(t.action).toMatchObject({ kind: "deeplink", label: "Ver opciones", url: "https://tp.media/r?x=1" });
    expect(t.chargedByLabel).toBe("Lo reservas con Kiwitaxi");
  });

  it("REQ-120: el id del carrito sale del token sin exponerlo (sirve de subID)", () => {
    const a = cartIdFromToken("tok_abcdefgh12345");
    expect(a).toMatch(/^c[a-z0-9]{6,}$/);
    expect(a).toBe(cartIdFromToken("tok_abcdefgh12345"));
    expect(a).not.toBe(cartIdFromToken("tok_abcdefgh12346"));
    expect(a).not.toContain("abcdefgh");
  });

  it("REQ-108: parámetros malos se descartan (país ISO-2, código de ciudad seguro)", () => {
    expect(parseTripQuery({ pais: "Perú", cc: "<script>" })).toEqual({ country: null, cityCode: null, travelerCountry: null });
    expect(parseTripQuery({ pais: "pe", cc: "pe-lima", viajero: "mx" })).toEqual({ country: "PE", cityCode: "pe-lima", travelerCountry: "MX" });
  });
});

describe("Arma tu viaje con los datos de la reserva", () => {
  const base = { advisor: { whatsapp: "525536490320" }, probes: {}, flags: {}, now: Date.parse("2026-11-06T12:00:00Z") };
  const mx = { title: "Free tour Centro", date: "2026-11-21T01:00:00Z", localDate: "2026-11-20 19:00:00", cityName: "Ciudad de México", people: { adults: 1, children: 0 }, country: "MX" };

  it("REQ-180: la pieza y el WhatsApp prellenado usan la fecha y hora de la ciudad, no UTC", () => {
    const m = buildArmaTuViajeModel({ ...base, piece: mx, query: parseTripQuery({}) });
    expect(m.piece?.when).toBe("20 nov 2026, 19:00");
    const wa = decodeURIComponent((m.cards[0].action as { url: string }).url);
    expect(wa).toContain("el 20 nov 2026");
    expect(wa).not.toContain("21 nov");
  });

  it("REQ-181: país y viajero salen de la reserva; ?pais= y ?viajero= de la URL ya no cambian las reglas", () => {
    const cn = { ...mx, cityName: "Shanghái", country: "CN", date: "2026-11-22T02:00:00Z", localDate: "2026-11-22 10:00:00" };
    const m = buildArmaTuViajeModel({ ...base, piece: cn, query: parseTripQuery({ pais: "MX", viajero: "CN" }) });
    expect(m.cards.map((c) => c.type).slice(0, 2)).toEqual(["tour", "esim"]);
    const local = buildArmaTuViajeModel({ ...base, piece: { ...mx, travelerCountry: "MX" }, query: parseTripQuery({ pais: "PE" }) });
    expect(local.cards.map((c) => c.type)).not.toContain("esim");
    expect(local.cards.map((c) => c.type)).not.toContain("insurance");
    const unknown = buildArmaTuViajeModel({ ...base, piece: mx, query: parseTripQuery({ viajero: "MX" }) });
    expect(unknown.cards.map((c) => c.type)).toContain("esim");
  });

  it("REQ-183: «Costo 0» solo si la reserva no quedó con tarifa fija; si no, la tarifa en EUR", () => {
    expect(buildArmaTuViajeModel({ ...base, piece: { ...mx, price: 0 }, query: parseTripQuery({}) }).piece?.cost).toBe("Costo 0");
    const paid = buildArmaTuViajeModel({ ...base, piece: { ...mx, price: 40 }, query: parseTripQuery({}), fx: { USD: 18.5, EUR: 21.03, date: "2026-11-06" } });
    expect(paid.piece?.cost).toMatch(/^Tarifa fija del grupo: .*40.* \(aprox\. MXN .*\)$/);
    expect(buildArmaTuViajeModel({ ...base, piece: { ...mx, price: 40 }, query: parseTripQuery({}) }).piece?.cost).not.toBe("Costo 0");
  });
});
