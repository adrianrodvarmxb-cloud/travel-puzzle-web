import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CompanionCarousel } from "./CompanionCarousel";
import { buildArmaTuViajeModel, parseTripQuery } from "@/cart/lib/page-model";

const model = buildArmaTuViajeModel({
  piece: { title: "Free tour Lima", date: "2026-12-10T15:00:00Z", cityName: "Lima", people: { adults: 2, children: 0 } },
  query: parseTripQuery({ pais: "PE", cc: "pe-lima" }),
  advisor: { whatsapp: "525536490320" }, probes: {}, flags: {}, now: Date.parse("2026-12-01T12:00:00Z"),
});
const html = renderToStaticMarkup(createElement(CompanionCarousel, { cards: model.cards, cityCode: "pe-lima" }));

describe("CompanionCarousel", () => {
  it("REQ-108: pinta 4 tarjetas; la cuarta solo en escritorio (3 en móvil)", () => {
    expect(html.match(/<li /g)).toHaveLength(4);
    expect(html.match(/hidden md:flex/g)).toHaveLength(1);
  });

  it("REQ-108: cada tarjeta dice quién cobra y lleva el título del carrusel", () => {
    expect(html).toContain("Ya tienes tu primera pieza. ¿Armamos las demás?");
    expect(html.match(/Te lo cotiza tu asesor de Travel Puzzle/g)).toHaveLength(4);
  });

  it("REQ-106: nada preseleccionado (sin casillas marcadas) y sin mencionar al mayorista", () => {
    expect(html).not.toMatch(/checked|aria-pressed="true"/);
    expect(html.toLowerCase()).not.toContain("freetour");
  });

  it("REQ-105: sin inventario no hay botón «Reservar»", () => {
    expect(html).not.toContain(">Reservar<");
    const withBook = renderToStaticMarkup(createElement(CompanionCarousel, {
      cards: [{ ...model.cards[0], action: { kind: "book", label: "Reservar", adapterId: "freetour" } }], cityCode: "pe-lima",
    }));
    expect(withBook).not.toContain(">Reservar<");
  });

  it("REQ-184: la clase de cada tarjeta sale de dónde se pinta (solo celular, solo escritorio o ambos)", () => {
    const [a, b, c, d] = model.cards;
    const cards = [{ ...a, mobile: true, desktop: true }, { ...b, mobile: false, desktop: true }, { ...c, mobile: true, desktop: true }, { ...d, mobile: true, desktop: false }];
    const h = renderToStaticMarkup(createElement(CompanionCarousel, { cards, cityCode: "pe-lima" }));
    expect(h.match(/<li /g)).toHaveLength(4);
    expect(h.match(/class="hidden md:flex/g)).toHaveLength(1);
    expect(h.match(/class="flex md:hidden/g)).toHaveLength(1);
  });

  it("REQ-320: con experiencias cercanas la tarjeta de tour pinta foto, nombre, precio y enlace a la ficha, sin el asesor", () => {
    const m = buildArmaTuViajeModel({
      piece: { title: "Free tour Cusco", date: "2026-12-10T15:00:00Z", cityName: "Cusco", people: { adults: 2, children: 0 }, country: "PE" },
      query: parseTripQuery({}), advisor: { whatsapp: "525536490320" }, probes: {}, flags: {}, now: Date.parse("2026-12-01T12:00:00Z"),
      experiences: [
        { id: "a", title: "City Tour en Cusco", path: "/viajes/peru/city-tour-cusco", image: "https://img/a.jpg", price: "Desde USD $35 (aprox. MXN $648)", operator: "Inca World Peru" },
        { id: "b", title: "Montaña de Colores", path: "/viajes/peru/montana", image: null, price: "A cotizar", operator: "Inca World Peru" },
      ],
    });
    const h = renderToStaticMarkup(createElement(CompanionCarousel, { cards: model.cards.length ? m.cards : [], cityCode: "cusco" }));
    const first = h.split("</li></ul></li>")[0];
    expect(first).toContain('href="/viajes/peru/city-tour-cusco"');
    expect(first).toContain('src="https://img/a.jpg"');
    expect(first).toContain("City Tour en Cusco");
    expect(first).toContain("Desde USD $35 (aprox. MXN $648)");
    expect(first).toContain("Lo reservas con Travel Puzzle");
    expect(first).not.toContain("Te lo cotiza tu asesor");
    expect(first).not.toContain("wa.me");
  });
});
