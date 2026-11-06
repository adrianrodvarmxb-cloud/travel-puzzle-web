/**
 * REQ-530 (PO, 6 nov 2026, 14:24: «los filtros no dan scroll hasta que pasan todas las opciones del medio»).
 * En escritorio la columna de filtros se queda fija bajo el header (sticky) y tiene su propio scroll, como la
 * columna de filtros de Civitatis, GetYourGuide y Viator: se recorre sin esperar a que pase la cuadrícula.
 * En celular no cambia nada (hoja a pantalla completa, REQ-056). Puro: solo clases.
 */

/** Alto del header fijo (Navbar, sticky top-0) + aire: 6rem arriba y 1rem abajo. */
export const FILTERS_TOP = "lg:top-24";
export const FILTERS_MAX_H = "lg:max-h-[calc(100vh-7rem)]";

// REQ-530
export const FILTERS_DESKTOP_CLASS = [
  "hidden lg:sticky lg:block", FILTERS_TOP, FILTERS_MAX_H,
  "lg:overflow-y-auto lg:overscroll-contain lg:pr-2 lg:pb-6",
  "lg:[scrollbar-width:thin] lg:[scrollbar-color:rgba(255,255,255,0.25)_transparent]",
].join(" ");
