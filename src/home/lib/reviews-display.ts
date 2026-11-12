/**
 * REQ-3321: qué se muestra del promedio de reseñas en «Lo que dicen» de la portada (puro).
 *
 * Decisión del PO (12 nov 2026, opción A): la portada NO muestra un promedio agregado («4.8 ★»).
 * Ese número sale de calificaciones de los proveedores de cada tour; puesto en grande en la portada se lee
 * como calificación de Travel Puzzle, sin fuente, sin número de reseñas y sin forma de cálculo
 * (LFPC art. 32: información veraz, comprobable y clara, que no induzca a error). La calificación sigue
 * en la ficha de cada tour, que es donde corresponde.
 *
 * No se borra nada: el interruptor es reversible. Para volver a mostrarlo hace falta decisión escrita del PO
 * y que el número lleve fuente, número de reseñas y cómo se calcula.
 */
export const REVIEWS_SHOW_AVERAGE = false;

// REQ-3321
export function shownReviewsAverage(average: number | null, show: boolean = REVIEWS_SHOW_AVERAGE): number | null {
  if (!show || average === null || !Number.isFinite(average) || average < 1 || average > 5) return null;
  return average;
}
