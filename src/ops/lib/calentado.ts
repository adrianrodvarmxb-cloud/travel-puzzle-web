/**
 * REQ-10868 · INC-028, corrección A (PO, 26-11-2026): antes del humo de producción se calientan TODAS las páginas fijas
 * de `tests/smoke/pages.json` más las guías publicadas ese día; y el humo mide el HTML y los recursos por separado
 * (`page.goto` con `domcontentloaded` y una espera corta de `networkidle` con tope propio). Un 5xx o una página en
 * blanco siguen tumbando el deploy. Pura: recibe las listas y «hoy»; no lee archivos ni hace peticiones.
 */

/** Tope de la espera de recursos (fuentes, mapa, imágenes) después de que el HTML ya respondió; no tumba la carga. */
export const RESOURCE_WAIT_MS = 20_000;
/** Tiempo máximo para el HTML (como antes: 90 s). */
export const HTML_TIMEOUT_MS = 90_000;

export interface GuiaPublicada { pais: string; ciudad: string; publishedAt: string; en?: unknown }

/** Rutas de las guías publicadas «hoy» (español y, si traen versión en inglés, también /en). */
// REQ-10868
export function guiasDelDia(guias: readonly GuiaPublicada[], hoy: string): string[] {
  const out: string[] = [];
  for (const g of guias) {
    if (g.publishedAt !== hoy) continue;
    const base = `/destinos/${g.pais}/${g.ciudad}`;
    out.push(base);
    if (g.en) out.push(`/en${base}`);
  }
  return [...new Set(out)];
}

/** «/en/» responde 308 a «/en»: se calienta la ruta final. La raíz se queda como «/». */
const normaliza = (p: string) => (p.length > 1 ? p.replace(/\/+$/, "") : p);

/** Lista única a calentar: primero las fijas del humo (en su orden), luego las guías del día. */
// REQ-10868
export function paginasACalentar(fijas: readonly string[], guiasHoy: readonly string[]): string[] {
  return [...new Set([...fijas, ...guiasHoy].map((p) => normaliza(p.trim())).filter(Boolean))];
}

/** Plan de calentado: intentos por página y espera entre intentos (como el calentado de INC-009). */
export const CALENTADO = { intentos: 3, esperaMs: 10_000, timeoutMs: 60_000 } as const;
