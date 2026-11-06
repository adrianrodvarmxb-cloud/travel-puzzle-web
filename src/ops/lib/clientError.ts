/**
 * REQ-221 (INC-001, acción correctiva) — errores del navegador a los logs del Worker.
 * Lógica pura: validación del reporte (zod), armado del cuerpo y respuesta del endpoint. El log se recibe por parámetro.
 */
import { z } from "zod";

export interface ClientErrorReport {
  message: string;
  stack: string;
  path: string;
  /** window | promise | section:<nombre> | page | global | unknown */
  source: string;
  /** digest de Next (sirve para cruzar con el log del servidor) */
  digest: string;
}

/** Tope del cuerpo: un reporte real cabe de sobra; más grande es basura o abuso. */
export const CLIENT_ERROR_MAX_BYTES = 16_000;

const cut = (n: number) => z.string().transform((s) => s.slice(0, n));

const schema = z.object({
  message: z.string().min(1).transform((s) => s.slice(0, 500)),
  stack: cut(4000).optional().default(""),
  // Solo rutas del sitio: empieza con "/" pero no con "//" (eso sería otro dominio).
  path: z.string().max(500).regex(/^\/(?!\/)/).optional().default("/"),
  source: cut(60).optional().default("unknown"),
  digest: cut(100).optional().default(""),
});

// REQ-221
export function parseClientError(input: unknown): ClientErrorReport | null {
  const r = schema.safeParse(input);
  return r.success ? r.data : null;
}

/** Atiende POST /api/client-error: valida y deja una línea JSON `client-error` en el log. Devuelve el status HTTP. */
// REQ-221
export function handleClientErrorReport(raw: string, userAgent: string | null, log: (line: string) => void): 204 | 400 | 413 {
  if (raw.length > CLIENT_ERROR_MAX_BYTES) return 413;
  let json: unknown = null;
  try {
    json = JSON.parse(raw);
  } catch {
    return 400;
  }
  const report = parseClientError(json);
  if (!report) return 400;
  log(JSON.stringify({ type: "client-error", ...report, ua: (userAgent ?? "").slice(0, 200) }));
  return 204;
}

/** Cuerpo del reporte a partir de lo que se haya lanzado (Error, texto, lo que sea). Nunca lanza. */
// REQ-221
export function clientErrorPayload(error: unknown, source: string, path: string, digest = ""): string {
  const e = error instanceof Error ? error : new Error(String(error));
  return JSON.stringify({ message: e.message || "sin mensaje", stack: e.stack ?? "", path, source, digest });
}
