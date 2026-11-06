import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BookingConfirmed } from "./EventBookingConfirm";

describe("Pantalla de reserva confirmada", () => {
  it("REQ-182: con enlace (bandera encendida) invita a armar el resto del viaje, sin promover tours", () => {
    const h = renderToStaticMarkup(createElement(BookingConfirmed, { refNumber: "1-2-3", canBeCanceled: true, tripUrl: "/arma-tu-viaje?reserva=tok_abcdefgh123" }));
    expect(h).toContain('href="/arma-tu-viaje?reserva=tok_abcdefgh123"');
    expect(h).toContain("Arma el resto de tu viaje");
    expect(h.toLowerCase()).not.toContain("freetour");
  });

  it("REQ-182: sin enlace (bandera apagada) no se menciona el carrito", () => {
    const h = renderToStaticMarkup(createElement(BookingConfirmed, { refNumber: "1-2-3", canBeCanceled: true, tripUrl: null }));
    expect(h).not.toContain("arma-tu-viaje");
    expect(h).not.toContain("resto de tu viaje");
  });
});
