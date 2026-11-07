/**
 * REQ-428: formato → CartItem.tipo (decisión del 5-11 y pedido del 6-11, punto 8). Circuito, a la medida, crucero,
 * fuera y por-revisar no entran al carrito (se cotizan o no se publican). Autoguiado según el gate G-T11. Puro.
 */
import type { CartItemType } from "@/cart/lib/item";
import { DEFAULT_GATES, type Gates } from "./gates";
import type { FormatoOEstado } from "./types";

export function cartTypeFor(formato: FormatoOEstado, gate: Gates["autoguiadoCarrito"] = DEFAULT_GATES.autoguiadoCarrito): CartItemType | null {
  switch (formato) {
    case "pieza-libre": return "free_tour";
    case "caminata": case "tour": case "visita-guiada": case "experiencia-unica": return "tour"; // REQ-1250
    case "autoguiado": return gate === "A" ? "tour" : "tickets";
    case "excursion-dia": return "day_trip";
    case "entradas": return "tickets";
    case "traslado": return "transfer";
    case "transporte": return "transport";
    case "alquiler": return "car_rental";
    case "circuito": case "a-la-medida": case "crucero": case "fuera": case "por-revisar": return null;
  }
}

/** REQ-429 (T7): la primera tarjeta del carrusel es un tour de pago o de día. */
export const FORMATOS_PRIMERA_TARJETA: readonly FormatoOEstado[] = ["caminata", "visita-guiada", "tour", "excursion-dia", "experiencia-unica"];

/** T7: solo "true" exacto la enciende. */
export function taxonomyCartEnabled(env: { TAXONOMY_CART_ENABLED?: string }): boolean {
  return env.TAXONOMY_CART_ENABLED === "true";
}
