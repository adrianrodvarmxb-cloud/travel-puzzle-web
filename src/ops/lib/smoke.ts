import { z } from "zod";
import { retryNote } from "./smoke-evidence";

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
  /** REQ-500: resultado de recargar la página una vez tras fallar. Solo se anota; la falla original cuenta igual. */
  retry?: { status: number | null; pageErrors: string[]; appError: boolean; optional?: boolean };
}

export interface SmokeVerdict { ok: boolean; failures: string[] }

// REQ-001, REQ-003. REQ-305: también fallan el descubrimiento de fichas y las URL viejas (`extra`).
// REQ-500: cada falla lleva la nota del reintento («pasó (falla intermitente)» o «también falla»), sin dejar de contar.
export function smokeVerdict(results: SmokeResult[], extra: string[] = []): SmokeVerdict {
  if (!results.length) return { ok: false, failures: ["no se probó ninguna página", ...extra] };
  const failures: string[] = [...extra];
  for (const r of results) {
    const where = `${r.path} @${r.viewport}`;
    const note = retryNote(r.retry);
    const push = (m: string) => failures.push(note ? `${m} — ${note}` : m);
    const allowed404 = r.optional === true && r.status === 404; // REQ-223
    if (r.status === null || (r.status >= 400 && !allowed404)) push(`${where}: respuesta ${r.status ?? "sin respuesta"}`);
    if (r.appError) push(`${where}: pantalla "Application error"`);
    for (const e of r.pageErrors) push(`${where}: excepción en el navegador: ${e.slice(0, 200)}`);
  }
  return { ok: failures.length === 0, failures };
}

/** Páginas fijas + las primeras fichas que aparezcan en /tours (así se prueban datos reales).
 * REQ-305: el script ya usa `discoverPages` (reglas en tests/smoke/pages.json); se conserva sin uso. */
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

/**
 * REQ-305 — tests/smoke/pages.json.
 * - fixed: páginas que siempre se cargan.
 * - discover: fichas reales tomadas de una página (`from`) con las primeras `take` ligas que cumplen `pattern`.
 *   Si `required` y no aparece ninguna, la prueba falla (antes bajaba de 22 a 14 cargas sin avisar).
 * - legacy: URL viejas que se piden sin seguir la redirección; su estado debe estar en `expect`.
 * - flagged (REQ-242): { BANDERA: [páginas] }; entran como fijas solo con la bandera en "true".
 */
const regex = z.string().refine((p) => { try { new RegExp(p); return true; } catch { return false; } }, "patrón inválido");
const SmokeConfigSchema = z.object({
  fixed: z.array(z.string().startsWith("/")).min(1),
  optional: z.array(z.string().startsWith("/")).default([]), // REQ-223
  discover: z.array(z.object({ from: z.string().startsWith("/"), pattern: regex, take: z.number().int().positive(), required: z.boolean().default(false) })).default([]),
  legacy: z.array(z.object({ path: z.string().startsWith("/"), expect: z.array(z.number().int()).min(1) })).default([]),
  // REQ-242: bandera → páginas que solo se prueban si esa bandera está en "true" ("A+B" = las dos).
  flagged: z.record(z.string().regex(/^[A-Z][A-Z0-9_]*(\+[A-Z][A-Z0-9_]*)*$/), z.array(z.string().startsWith("/"))).default({}),
  // REQ-675 (Gate 3): reglas de descubrimiento que solo corren con su bandera en "true" (ficha en inglés).
  flaggedDiscover: z.record(z.string().regex(/^[A-Z][A-Z0-9_]*$/), z.array(z.object({ from: z.string().startsWith("/"), pattern: regex, take: z.number().int().positive(), required: z.boolean().default(false) }))).default({}),
  // REQ-675/REQ-676: con la bandera, páginas cuyo <head> crudo pasa por el contrato hreflang/canonical (más las fichas descubiertas).
  localeContract: z.record(z.string().regex(/^[A-Z][A-Z0-9_]*$/), z.array(z.string().startsWith("/"))).default({}),
});
export type SmokeConfig = z.infer<typeof SmokeConfigSchema>;
export type DiscoverRule = SmokeConfig["discover"][number];

export function parseSmokeConfig(raw: unknown): SmokeConfig {
  return SmokeConfigSchema.parse(raw);
}

/** Fichas reales por regla, a partir de las ligas encontradas en cada página `from`. */
export function discoverPages(rules: DiscoverRule[], linksByPage: Record<string, string[]>): { pages: string[]; failures: string[] } {
  const pages: string[] = [];
  const failures: string[] = [];
  for (const r of rules) {
    const re = new RegExp(r.pattern);
    const found = [...new Set((linksByPage[r.from] ?? []).filter((h) => re.test(h)))].slice(0, r.take);
    if (r.required && found.length === 0) failures.push(`${r.from}: no se encontró ninguna ficha (se esperaban ${r.take})`);
    pages.push(...found);
  }
  return { pages: [...new Set(pages)], failures };
}

/** URL viejas: el estado (sin seguir la redirección) debe ser uno de los esperados; 5xx nunca. */
export function legacyFailures(legacy: SmokeConfig["legacy"], statusByPath: Record<string, number | null>): string[] {
  return legacy.flatMap((l) => {
    const s = statusByPath[l.path] ?? null;
    return s !== null && l.expect.includes(s) ? [] : [`${l.path}: URL vieja respondió ${s ?? "sin respuesta"} (se esperaba ${l.expect.join(" o ")})`];
  });
}

// REQ-675: reglas `flaggedDiscover` de las banderas encendidas (entorno del runner o wrangler.jsonc).
export function flaggedDiscoverRules(cfg: SmokeConfig, vars: Record<string, string>, env: Record<string, string | undefined>): DiscoverRule[] {
  return Object.entries(cfg.flaggedDiscover).filter(([f]) => (env[f] ?? vars[f]) === "true").flatMap(([, r]) => r);
}

// REQ-676: páginas del contrato de idioma: las fijas de la bandera + cada ficha descubierta en /{lang}/ y su versión en español.
export function localeContractPages(cfg: SmokeConfig, vars: Record<string, string>, env: Record<string, string | undefined>, discovered: string[]): string[] {
  const on = Object.entries(cfg.localeContract).filter(([f]) => (env[f] ?? vars[f]) === "true");
  if (!on.length) return [];
  const fichas = discovered.filter((p) => /^\/[a-z]{2}\/destinos\/[^/]+\/[^/]+\/[^/?#]+$/.test(p));
  return [...new Set([...on.flatMap(([, ps]) => ps), ...fichas, ...fichas.map((p) => p.replace(/^\/[a-z]{2}(?=\/)/, ""))])];
}

/**
 * REQ-1579 (INC-010): una petición cruda del contrato de idioma se reintenta SOLO cuando falló el transporte
 * (`status` null: la petición no llegó a devolver un código). Un código real (503, 404, 500…) no se reintenta:
 * esa es una falla del sitio y tiene que contar, como en INC-009.
 */
export async function rawWithRetry<T extends { status: number | null }>(
  attempt: () => Promise<T>,
  o: { tries?: number; waitMs?: number; sleep?: (ms: number) => Promise<void>; onRetry?: (intento: number, previo: T) => void } = {},
): Promise<{ last: T; attempts: number }> {
  const tries = Math.max(1, o.tries ?? 3);
  const waitMs = o.waitMs ?? 3_000;
  const sleep = o.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  let last = await attempt();
  let attempts = 1;
  while (last.status === null && attempts < tries) {
    o.onRetry?.(attempts + 1, last);
    await sleep(waitMs);
    last = await attempt();
    attempts++;
  }
  return { last, attempts };
}
