/**
 * REQ-10842 (INC-027): regla pura del calentado de producción. Tras publicar, /tours no cuenta como «caliente» con
 * un 200 a secas: tiene que traer fichas de viaje (la señal de que D1 ya respondió y la caché de tarjetas se armó).
 * Sin fetch ni DOM: recibe el HTML y decide; el script `src/scripts/calentar-tours.ts` hace la red.
 */

/** Misma forma que la regla `discover` de tests/smoke/pages.json, con la versión en inglés. */
const FICHA_VIAJE = /^(?:\/en)?\/viajes\/[^/]+\/[^/?#]+$/;

/** Enlaces de ficha de viaje distintos que trae un HTML (href con comillas dobles o simples). */
export function enlacesViajes(html: string): string[] {
  const vistos = new Set<string>();
  for (const m of html.matchAll(/href=["']([^"']+)["']/g)) {
    const href = m[1];
    if (FICHA_VIAJE.test(href)) vistos.add(href);
  }
  return [...vistos];
}

/** /tours está listo cuando trae al menos `minimo` fichas distintas (2, como exige el descubrimiento del humo). */
export function toursListos(html: string, minimo = 2): boolean {
  return enlacesViajes(html).length >= minimo;
}

/** Plan del calentado: rutas, intentos y espera (los mismos 6 × 15 s del paso de INC-009). */
export function planCalentado(): { rutas: string[]; intentos: number; esperaMs: number; minimo: number } {
  return { rutas: ["/tours", "/en/tours"], intentos: 6, esperaMs: 15_000, minimo: 2 };
}
