/** REQ-003 — veredicto de la prueba de humo (puro). Lo usa scripts/smoke.ts antes y después de publicar. */
export interface SmokeResult {
  path: string;
  viewport: number;
  status: number | null;
  /** Excepciones no atrapadas del navegador (pageerror), incluidas las de hidratación (#418). */
  pageErrors: string[];
  /** La pantalla "Application error" de Next. */
  appError: boolean;
  /** Página tras bandera: un 404 es válido (bandera apagada); un 5xx, una excepción o la pantalla de error no. REQ-223 */
  optional?: boolean;
}

export interface SmokeVerdict { ok: boolean; failures: string[] }

// REQ-001, REQ-003
export function smokeVerdict(results: SmokeResult[]): SmokeVerdict {
  if (!results.length) return { ok: false, failures: ["no se probó ninguna página"] };
  const failures: string[] = [];
  for (const r of results) {
    const where = `${r.path} @${r.viewport}`;
    const allowed404 = r.optional === true && r.status === 404; // REQ-223
    if (r.status === null || (r.status >= 400 && !allowed404)) failures.push(`${where}: respuesta ${r.status ?? "sin respuesta"}`);
    if (r.appError) failures.push(`${where}: pantalla "Application error"`);
    for (const e of r.pageErrors) failures.push(`${where}: excepción en el navegador: ${e.slice(0, 200)}`);
  }
  return { ok: failures.length === 0, failures };
}

/** Páginas fijas + las primeras fichas que aparezcan en /tours (así se prueban datos reales). */
// REQ-003
export function smokePages(fixed: string[], discovered: string[], perKind = 2): string[] {
  const pick = (re: RegExp) => discovered.filter((h) => re.test(h)).slice(0, perKind);
  return [...new Set([...fixed, ...pick(/^\/viajes\/[^/]+\/[^/?#]+$/), ...pick(/^\/tours\/[^/?#]+$/)])];
}

/** Páginas tras bandera (tests/smoke/pages.json → optional) al final de la lista, sin repetir. */
// REQ-223
export function withOptionalPages(pages: string[], optional: string[]): string[] {
  return [...new Set([...pages, ...optional])];
}

/**
 * La pantalla "Application error" de Next o una de las pantallas de error del sitio
 * (src/app/error.tsx, src/app/global-error.tsx, src/app/tours/error.tsx). Si cambia su título, se actualiza aquí.
 */
// REQ-223
export function isErrorScreen(text: string): boolean {
  return /Application error|Algo tardó más de lo normal|Algo no cargó bien|Estamos cargando muchos tours a la vez/.test(text);
}

/** Errores de hidratación de React (minificados o no) que el navegador manda a la consola. */
// REQ-001
export function isHydrationError(text: string): boolean {
  return /Minified React error #(418|423|425)\b|Hydration failed|hydration mismatch|didn't match the client/i.test(text);
}
