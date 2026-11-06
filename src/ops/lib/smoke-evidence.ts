/**
 * REQ-500 (INC-007) — evidencia de la prueba de humo cuando una página falla. Puro.
 * El I/O (guardar archivos, capturas, recargar) está en src/scripts/smoke.ts.
 */

/** Lo mínimo de un resultado para saber si falló (mismo criterio que smokeVerdict). */
export interface LoadOutcome { status: number | null; pageErrors: string[]; appError: boolean; optional?: boolean }

export function loadFailed(r: LoadOutcome): boolean {
  const allowed404 = r.optional === true && r.status === 404; // REQ-223
  return r.status === null || (r.status >= 400 && !allowed404) || r.appError || r.pageErrors.length > 0;
}

/** Nombre de archivo seguro: "/la-primera-pieza", 1366 → "la-primera-pieza@1366". */
export function evidenceSlug(path: string, viewport: number): string {
  const s = path.replace(/^\/+/, "").replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^_+|_+$/g, "");
  return `${s || "inicio"}@${viewport}`;
}

/**
 * Deja solo lo que React compara al hidratar: el <body> sin scripts, sin comentarios (marcas de Suspense)
 * y con espacios y `style` en un solo formato (el navegador serializa "width: 64px;" y el servidor "width:64px").
 */
export function normalizeForDiff(html: string): string {
  const m = /<body[^>]*>([\s\S]*)<\/body>/i.exec(html);
  let b = m ? m[0] : html;
  b = b.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  b = b.replace(/<!--[\s\S]*?-->/g, "");
  b = b.replace(/style="([^"]*)"/g, (_, s: string) => `style="${s.split(";").map((d) => d.trim().replace(/\s*:\s*/, ":")).filter(Boolean).join(";")}"`);
  return b.replace(/\s+/g, " ").replace(/> </g, "><").trim();
}

export interface FirstDifference { index: number; server: string; client: string }

/** Primer punto donde el HTML del servidor y el DOM del cliente se separan, con `context` caracteres alrededor. */
export function firstDifference(serverHtml: string, clientHtml: string, context = 300): FirstDifference | null {
  const a = normalizeForDiff(serverHtml);
  const b = normalizeForDiff(clientHtml);
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a[i] === b[i]) i++;
  if (i === n && a.length === b.length) return null;
  const from = Math.max(0, i - context);
  return { index: i, server: a.slice(from, i + context), client: b.slice(from, i + context) };
}

/** Lo que se anota junto a la falla tras recargar la página una vez. Vacío si no hubo reintento. */
export function retryNote(retry: LoadOutcome | undefined): string {
  if (!retry) return "";
  return loadFailed(retry) ? "reintento: también falla" : "reintento: pasó (falla intermitente)";
}
