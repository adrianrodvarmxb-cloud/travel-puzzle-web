/**
 * REQ-221: cuerpo del reporte de error del navegador. Sin zod, para que el cliente del layout no lo cargue (REQ-10865).
 * `clientError.ts` lo re-exporta: quien ya lo importaba de ahí no cambia.
 */

/** Cuerpo del reporte a partir de lo que se haya lanzado (Error, texto, lo que sea). Nunca lanza. */
// REQ-221
export function clientErrorPayload(error: unknown, source: string, path: string, digest = ""): string {
  const e = error instanceof Error ? error : new Error(String(error));
  return JSON.stringify({ message: e.message || "sin mensaje", stack: e.stack ?? "", path, source, digest });
}
