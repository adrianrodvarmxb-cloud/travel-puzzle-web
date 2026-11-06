import { describe, expect, it } from "vitest";
import { buildArmaTuViajeModel, cartIdFromToken, parseTripQuery } from "./page-model";
import { ESIM_ADVISOR_COUNTRIES } from "@/companions/lib/carousel";
import type { NearbyExperience } from "@/companions/lib/nearby";

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
    // (REQ-323 oculta la eSIM sin proveedor; aquí se habilita en MX solo para probar la regla del viajero)
    const unknown = buildArmaTuViajeModel({ ...base, piece: mx, query: parseTripQuery({ viajero: "MX" }), esimAdvisorCountries: ["MX"] });
    expect(unknown.cards.map((c) => c.type)).toContain("esim");
  });

  it("REQ-183: «Costo 0» solo si la reserva no quedó con tarifa fija; si no, la tarifa en EUR", () => {
    expect(buildArmaTuViajeModel({ ...base, piece: { ...mx, price: 0 }, query: parseTripQuery({}) }).piece?.cost).toBe("Costo 0");
    const paid = buildArmaTuViajeModel({ ...base, piece: { ...mx, price: 40 }, query: parseTripQuery({}), fx: { USD: 18.5, EUR: 21.03, date: "2026-11-06" } });
    expect(paid.piece?.cost).toMatch(/^Tarifa fija del grupo: .*40.* \(aprox\. MXN .*\)$/);
    expect(buildArmaTuViajeModel({ ...base, piece: { ...mx, price: 40 }, query: parseTripQuery({}) }).piece?.cost).not.toBe("Costo 0");
  });
});

describe("Tarjeta de tour con experiencias cercanas y eSIM (REQ-320…324)", () => {
  const base = { advisor: { whatsapp: "525536490320" }, probes: {}, flags: {}, now: Date.parse("2026-11-06T12:00:00Z"), query: parseTripQuery({}) };
  const mpika = { title: "Free tour Mpika", date: "2026-11-20T08:00:00Z", cityName: "Mpika", people: { adults: 2, children: 0 }, country: "ZM" };
  const cusco = { ...mpika, title: "Free tour Cusco", cityName: "Cusco", country: "PE" };
  const exp: NearbyExperience[] = [
    { id: "a", title: "City Tour en Cusco", path: "/viajes/peru/city-tour-cusco", image: "https://img/a.jpg", price: "Desde USD $35 (aprox. MXN $648)", operator: "Inca World Peru", multiDay: false },
    { id: "b", title: "Montaña de Colores", path: "/viajes/peru/montana", image: null, price: "A cotizar", operator: "Inca World Peru", multiDay: false },
  ];

  it("REQ-320: con experiencias cercanas la tarjeta de tour las recomienda (no dice «Te lo cotiza tu asesor»)", () => {
    const m = buildArmaTuViajeModel({ ...base, piece: cusco, experiences: exp });
    const tour = m.cards[0];
    expect(["tour", "day_trip"]).toContain(tour.type);
    expect(tour.action).toEqual({ kind: "catalog", label: "Ver experiencia", url: "/viajes/peru/city-tour-cusco" });
    expect(tour.chargedByLabel).toBe("Lo reservas con Travel Puzzle");
    expect(tour.experiences).toEqual(exp);
    expect(tour.mobile && tour.desktop).toBe(true);
  });

  it("REQ-320: si todas las experiencias son de varios días, la tarjeta no promete «un tour para completar el día»", () => {
    const multi = exp.map((e) => ({ ...e, multiDay: true }));
    const m = buildArmaTuViajeModel({ ...base, piece: { ...cusco, cityName: "Shanghái", country: "CN" }, experiences: multi });
    expect(m.cards[0].title).toBe("Viajes armados por expertos");
    expect(buildArmaTuViajeModel({ ...base, piece: cusco, experiences: exp }).cards[0].title).not.toBe("Viajes armados por expertos");
  });

  it("REQ-320: Mpika sin nada cerca → la tarjeta de tour cae al asesor; sin asesor no hay tarjeta ni carrusel", () => {
    const m = buildArmaTuViajeModel({ ...base, piece: mpika, experiences: [] });
    expect(m.cards[0].action?.kind).toBe("whatsapp");
    expect(m.cards[0].experiences).toBeUndefined();
    expect(buildArmaTuViajeModel({ ...base, advisor: { whatsapp: null }, piece: mpika, experiences: [] }).cards).toEqual([]);
  });

  it("REQ-320: sin asesor pero con experiencias, la tarjeta de tour sí sale", () => {
    const m = buildArmaTuViajeModel({ ...base, advisor: { whatsapp: null }, piece: cusco, experiences: exp });
    expect(m.cards.map((c) => c.action?.kind)).toEqual(["catalog"]);
  });

  it("REQ-323: sin proveedor de eSIM la tarjeta no aparece «con el asesor» salvo en China, donde va primero", () => {
    expect(ESIM_ADVISOR_COUNTRIES).toEqual(["CN"]);
    for (const country of ["ZM", "PE", "GB", "MX"]) {
      expect(buildArmaTuViajeModel({ ...base, piece: { ...mpika, country } }).cards.map((c) => c.type)).not.toContain("esim");
    }
    const cn = buildArmaTuViajeModel({ ...base, piece: { ...mpika, cityName: "Shanghái", country: "CN" } });
    expect(cn.cards.map((c) => c.type).slice(0, 2)).toEqual(["tour", "esim"]);
    // con un proveedor real (deeplink con inventario) la eSIM sale en cualquier país
    const real = buildArmaTuViajeModel({ ...base, piece: mpika, probes: { esim: [{ adapterId: "esim-x", mode: "deeplink", chargedBy: "eSIM X", result: "inventory", url: "https://x.test/a" }] } });
    expect(real.cards.find((c) => c.type === "esim")?.action?.kind).toBe("deeplink");
  });

  it("REQ-324: la solicitud de un proveedor que ya sale en la tarjeta de tour no se repite", () => {
    const probes = { tickets: [{ adapterId: "bigbus", mode: "request" as const, chargedBy: "Travel Puzzle", result: "inventory" as const, url: "https://wa.me/1" }] };
    const london = { ...mpika, cityName: "Londres", country: "GB" };
    const bb: NearbyExperience[] = [{ id: "bb", title: "Bus turístico hop-on hop-off en Londres", path: "/viajes/reino-unido/bb", image: null, price: "Desde USD $52", operator: "Big Bus Tours", multiDay: false }];
    const m = buildArmaTuViajeModel({ ...base, piece: london, probes, experiences: bb, coveredAdapterIds: ["bigbus"] });
    expect(m.cards.find((c) => c.type === "tickets")?.action?.kind).not.toBe("request");
    expect(m.cards[0].experiences?.[0].operator).toBe("Big Bus Tours");
  });
});
