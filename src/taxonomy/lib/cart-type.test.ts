import { describe, expect, it } from "vitest";
import { CART_ITEM_TYPES } from "@/cart/lib/item";
import { cartTypeFor, FORMATOS_PRIMERA_TARJETA } from "./cart-type";
import { ESTADOS_FORMATO, FORMATOS } from "./types";

describe("REQ-428 formato → CartItem.tipo", () => {
  it("REQ-428 tabla completa (G-T11 A: autoguiado → tour)", () => {
    const tabla = Object.fromEntries([...FORMATOS, ...ESTADOS_FORMATO].map((f) => [f, cartTypeFor(f)]));
    expect(tabla).toEqual({
      "pieza-libre": "free_tour", caminata: "tour", tour: "tour", "experiencia-unica": "tour", autoguiado: "tour",
      "excursion-dia": "day_trip", entradas: "tickets", traslado: "transfer", transporte: "transport", alquiler: "car_rental",
      circuito: null, "a-la-medida": null, crucero: null, fuera: null, "por-revisar": null,
    });
    for (const t of Object.values(tabla)) if (t) expect(CART_ITEM_TYPES).toContain(t);
  });
  it("REQ-260 G-T11 B: autoguiado → tickets", () => {
    expect(cartTypeFor("autoguiado", "B")).toBe("tickets");
  });
  it("REQ-428 la primera tarjeta del carrusel usa caminata, tour, excursión o Momentos de autor", () => {
    expect([...FORMATOS_PRIMERA_TARJETA]).toEqual(["caminata", "tour", "excursion-dia", "experiencia-unica"]);
  });
});
