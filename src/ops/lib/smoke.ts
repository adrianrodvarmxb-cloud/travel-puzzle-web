/** REQ-003 — veredicto de la prueba de humo (puro). Lo usa scripts/smoke.ts antes y después de publicar. */
export interface SmokeResult {
  path: string;
  viewport: number;
  status: number | null;
  /** Excepciones no atrapadas del navegador (pageerror), incluidas las de hidratación (#418). */
  pageErrors: string[];
  /** La pantalla "Application error" de Next. */
  appError: boolean;
  /** Página tras bandera: un 404 es válido (bandera apagada), un 5xx o una excepción no. REQ-030 */
  optional?: boolean;
}

export interface SmokeVerdict { ok: boolean; failures: string[] }

// REQ-001, REQ-003
export function smokeVerdict(results: SmokeResult[]): SmokeVerdict {
  if (!results.length) return { ok: false, failures: ["no se probó ninguna página"] };
  const failures: string[] = [];
  for (const r of results) {
    const where = `${r.path} @${r.viewport}`;
    const allowed404 = r.optional && r.status === 404; // REQ-030
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

/** Errores de hidratación de React (minificados o no) que el navegador manda a la consola. */
// REQ-001
export function isHydrationError(text: string): boolean {
  return /Minified React error #(418|423|425)\b|Hydration failed|hydration mismatch|didn't match the client/i.test(text);
}
