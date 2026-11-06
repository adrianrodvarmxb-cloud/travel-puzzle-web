import { describe, expect, it } from "vitest";
import { CAROUSEL_EVENTS, countByTypeAndCity, createCarouselEvent, parseCarouselEvent } from "./events";

const at = "2026-12-01T12:00:00.000Z";

describe("Eventos del carrusel", () => {
  it("REQ-110: registra vista, agregada, reservada y cotización por WhatsApp", () => {
    expect([...CAROUSEL_EVENTS]).toEqual(["card_viewed", "card_added", "card_booked", "whatsapp_quote"]);
  });

  it("REQ-110: cada evento lleva tipo y ciudad", () => {
    const e = createCarouselEvent("card_added", { type: "esim", cityCode: "pe-cusco" }, at);
    expect(e).toEqual({ name: "card_added", type: "esim", cityCode: "pe-cusco", at });
    expect(() => createCarouselEvent("card_added", { type: "esim", cityCode: "" }, at)).toThrow();
    expect(() => createCarouselEvent("clic" as never, { type: "esim", cityCode: "pe-cusco" }, at)).toThrow();
  });

  it("REQ-110: lo que llega del navegador se valida y lo malo se descarta", () => {
    expect(parseCarouselEvent({ name: "card_viewed", type: "tour", cityCode: "pe-lima", at })).not.toBeNull();
    expect(parseCarouselEvent({ name: "card_viewed", type: "tour" })).toBeNull();
    expect(parseCarouselEvent({ name: "card_viewed", type: "tour", cityCode: "pe-lima", at, email: "x@y.z" })).toEqual({
      name: "card_viewed", type: "tour", cityCode: "pe-lima", at,
    });
  });

  it("REQ-110: cuenta los eventos por tipo y ciudad", () => {
    const evs = [
      createCarouselEvent("card_viewed", { type: "esim", cityCode: "pe-cusco" }, at),
      createCarouselEvent("card_viewed", { type: "esim", cityCode: "pe-cusco" }, at),
      createCarouselEvent("card_added", { type: "esim", cityCode: "pe-cusco" }, at),
      createCarouselEvent("whatsapp_quote", { type: "tour", cityCode: "pe-lima" }, at),
    ];
    expect(countByTypeAndCity(evs)).toEqual({
      "esim|pe-cusco": { card_viewed: 2, card_added: 1, card_booked: 0, whatsapp_quote: 0 },
      "tour|pe-lima": { card_viewed: 0, card_added: 0, card_booked: 0, whatsapp_quote: 1 },
    });
  });
});
