/**
 * REQ-858: qué tour entra a «Excursiones de un día» del inicio: lo que su tarjeta etiqueta «Excursión de un día»
 * (clasificador de la tarjeta, src/tours/lib/card-format.ts) y las excursiones gratis («Pieza libre», la categoría de
 * los free tours) que ya cumplían REQ-451. Así el carrusel nunca muestra «Visita guiada» ni «Autoguiado». Puro.
 */
import { catalogTourFormat } from "@/tours/lib/card-format";
import { isDayTripTour } from "./experience-format";

export interface DayTripInput { categoryId: number; price: number; durationMinutes: number | null; titles: string[] }

// REQ-858
export function isHomeDayTrip(i: DayTripInput): boolean {
  const f = catalogTourFormat(i);
  return f === "excursion-dia" || (f === "pieza-libre" && isDayTripTour(i));
}
