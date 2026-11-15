/**
 * REQ-10708 (PO, 15-11-2026, «1»: aplicar «por trayecto real»; reemplaza a REQ-10704, que movía por categoría del proveedor).
 * Un traslado es llegar o salir de un punto de viaje (aeropuerto, terminal, muelle, oficina del operador, «de llegada»,
 * «de salida»). Un trayecto entre ciudades o lugares («Potosí - Uyuni en bus», «Ruta 40», «de Chiclayo a Trujillo») es
 * Transporte, como un boleto de bus. Las dos cosas viven en la sección Traslados; cambia el formato y el carrito.
 * La regla es del diccionario, no de un proveedor (REQ-10709: toda definición vale para todos los proveedores): cada
 * categoría de traslados la enciende con la regla por palabra `trayecto-entre-ciudades`. Puro: sin D1, sin red.
 */
import { keywordRegex, norm } from "./text";

/** Señales de que el servicio empieza o termina en un punto de llegada o salida del viaje: se queda como Traslado. */
export const PALABRAS_PUNTO_DE_VIAJE: readonly string[] = [
  "aeropuerto*", "airport*", "terminal", "terminales", "muelle", "oficina", "de llegada", "de salida", "de partida",
  // Baltra es la isla del aeropuerto de Galápagos: «De Baltra a Puerto Ayora» es el traslado de llegada.
  "baltra",
];
const rx = keywordRegex(PALABRAS_PUNTO_DE_VIAJE)!;

/** REQ-10708: true si el título es un trayecto entre ciudades o lugares y no un traslado de llegada o salida. */
export function esTrayectoEntreCiudades(titulo: string): boolean {
  const t = norm(titulo).replace(/\s+/g, " ").trim();
  return t.length > 0 && !rx.test(t);
}
