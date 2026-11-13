// REQ-3540 (INC-015): un fallo de D1 en el middleware de destinos no es «no hay nada que redirigir».
// Regla 7 de CLAUDE.md. Hasta hoy `edge.ts` se tragaba el error y devolvía null: la URL vieja respondía
// 200 y se declaraba canónica de sí misma, que es justo lo que no debe indexarse.
// Lógica pura: no hace I/O ni conoce D1.
import type { DestinationsRequest } from "./request-plan";

/** Intentos de la consulta a D1 antes de rendirse: el primero más un reintento (decisión del PO, REQ-3541). */
export const INTENTOS_D1 = 2;

/** Segundos del `Retry-After` del 503: un buscador reintenta en vez de indexar la URL vieja. */
export const RETRY_AFTER_SEGUNDOS = 30;

/** Error de la consulta a D1; `edge.ts` lo deja pasar para que la raíz decida. */
export class FalloDeBase extends Error {
  readonly causa: unknown;
  constructor(causa: unknown) {
    super(`[destinos] la consulta a D1 falló: ${causa instanceof Error ? causa.message : String(causa)}`);
    this.name = "FalloDeBase";
    this.causa = causa;
  }
}

/**
 * REQ-3540: las URL viejas solo existen para redirigir (301) o para decir que el tour se retiró (410).
 * Servirlas con 200 cuando la base falla es contenido duplicado. Las demás rutas que mira el middleware
 * (`/viajes/…`, `/destinos/…`, los sitemaps) son páginas reales: ante un fallo siguen sirviéndose.
 */
export function esUrlVieja(plan: DestinationsRequest): boolean {
  return plan.kind === "legacy-tour" || plan.kind === "legacy-country";
}

/**
 * REQ-3540: qué responder cuando D1 falló en todos los intentos.
 * `null` = seguir como hoy (la petición continúa). Decisión literal del PO (REQ-3541):
 * «503 solo en URLs viejas».
 */
export function respuestaAnteFalloDeBase(plan: DestinationsRequest): { status: 503; retryAfter: number } | null {
  return esUrlVieja(plan) ? { status: 503, retryAfter: RETRY_AFTER_SEGUNDOS } : null;
}

/** Resultado de intentar la decisión del middleware con reintento. */
export type IntentoDeDecision<T> =
  | { ok: true; valor: T }
  | { ok: false; respuesta: { status: 503; retryAfter: number } | null; causa: unknown };

/**
 * REQ-3540: corre la decisión y, si D1 falla, reintenta `INTENTOS_D1 - 1` veces. Agotados los intentos,
 * dice qué responder según la ruta. Recibe el intento por parámetro: no hace I/O propio.
 */
export async function decidirConReintento<T>(plan: DestinationsRequest, intentar: () => Promise<T>): Promise<IntentoDeDecision<T>> {
  let causa: unknown;
  for (let i = 0; i < INTENTOS_D1; i++) {
    try {
      return { ok: true, valor: await intentar() };
    } catch (error) {
      causa = error instanceof FalloDeBase ? error.causa : error;
    }
  }
  return { ok: false, respuesta: respuestaAnteFalloDeBase(plan), causa };
}
