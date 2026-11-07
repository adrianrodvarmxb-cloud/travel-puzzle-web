import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DestinationTourCard } from "./DestinationTourCard";
import type { TourCardModel } from "@/destinations/lib/catalog";

const card = (over: Partial<TourCardModel>): TourCardModel => ({
  id: "t", href: "/destinos/es/barcelona/x", title: "Juego de exploración autoguiado", provider: "Juegos BCN", image: null, isFreeTour: false,
  price: 20, currency: "EUR", rating: null, reviews: 0, duration: "2:00", kind: "paid", updatedAt: "2026-11-06T00:00:00Z", ...over,
});
const html = (t: TourCardModel, guideCopy: boolean) => renderToStaticMarkup(createElement(DestinationTourCard, { tour: t, guideCopy }));

describe("REQ-416 tarjeta de la ciudad", () => {
  it("REQ-416 con guideCopy y sin guía en persona: «Operado por {proveedor}», sin «guía local»", () => {
    const h = html(card({ formato: "tour", guiaEnPersona: false }), true);
    expect(h).toContain("Operado por Juegos BCN");
    expect(h).not.toContain("guía local");
  });
  it("REQ-416 sin guideCopy (bandera apagada), igual que hoy", () => {
    expect(html(card({ formato: "tour", guiaEnPersona: false }), false)).toContain("Operado por un guía local · Juegos BCN");
  });
  it("REQ-416 con guía en persona no cambia", () => {
    expect(html(card({ formato: "caminata", guiaEnPersona: true }), true)).toContain("Operado por un guía local · Juegos BCN");
  });
});
