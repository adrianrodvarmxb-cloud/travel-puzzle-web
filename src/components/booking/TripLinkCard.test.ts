import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TripLinkCard } from "./TripLinkCard";

describe("Tarjeta «Arma el resto de tu viaje» (confirmación y /reserva/{token})", () => {
  it("REQ-182: con enlace invita a armar el resto del viaje con complementos, sin promover tours (regla B3)", () => {
    const h = renderToStaticMarkup(createElement(TripLinkCard, { href: "/arma-tu-viaje?reserva=tok_abcdefgh123" }));
    expect(h).toContain('href="/arma-tu-viaje?reserva=tok_abcdefgh123"');
    expect(h).toContain("Arma el resto de tu viaje");
    expect(h.toLowerCase()).not.toMatch(/tour/);
  });

  it("REQ-182: sin enlace (bandera apagada o reserva no activa) no pinta nada", () => {
    expect(renderToStaticMarkup(createElement(TripLinkCard, { href: null }))).toBe("");
    expect(renderToStaticMarkup(createElement(TripLinkCard, { href: "https://otro.sitio/x" }))).toBe("");
  });
});
