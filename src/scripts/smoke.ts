/**
 * REQ-003 — Prueba de humo con navegador real (Playwright) a 390 y 1366 px.
 * Uso: npx tsx src/scripts/smoke.ts <url-base>   → sale con código 1 si algo falla.
 * Páginas: tests/smoke/pages.json (REQ-305): fijas + fichas reales descubiertas en las páginas de `discover`
 * + URL viejas (`legacy`) que se piden sin seguir la redirección.
 * REQ-242: las de `flagged` entran como fijas solo si su bandera está en "true" (en el entorno del runner o en wrangler.jsonc).
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, devices, type BrowserContext, type Page } from "playwright";
import { discoverPages, flaggedDiscoverRules, isErrorScreen, isHydrationError, legacyFailures, localeContractPages, parseSmokeConfig, smokeVerdict, withOptionalPages, type SmokeResult } from "../ops/lib/smoke";
import { hreflangContractFailures, parseLocaleHead } from "../i18n/lib/contract";
import { evidenceSlug, firstDifference, loadFailed } from "../ops/lib/smoke-evidence";
import { flaggedSmokePages, wranglerVars } from "../site/lib/pages";
import { fichaContractFailures, isFichaPath } from "../seo/lib/ficha-contract";

/** REQ-500: carpeta de evidencia (el workflow la sube como artefacto). */
const EVIDENCE_DIR = process.env.SMOKE_EVIDENCE_DIR || "smoke-evidencia";
let savedEvidence = 0;
/** REQ-500: se ejecuta en el navegador antes que el sitio. Solo observa; no cambia nada de la página. */
const EVIDENCE_INIT = `(() => {
  window.__smokeErrors = []; window.__smokeDomAtError = null;
  const keep = (er, msg) => {
    try {
      const c = er && er.cause;
      window.__smokeErrors.push({ message: String((er && er.message) || msg || er), stack: (er && er.stack) || null,
        cause: c ? String(c.message || c) : null, componentStack: (er && er.componentStack) || (c && c.componentStack) || null,
        digest: (er && er.digest) || null, at: performance.now() });
      if (window.__smokeDomAtError === null && /#(418|423|425)\\b|Hydration|hydrat/i.test(String((er && er.message) || msg)))
        window.__smokeDomAtError = document.documentElement.outerHTML;
    } catch (_) {}
  };
  addEventListener("error", (e) => keep(e.error, e.message), true);
  addEventListener("unhandledrejection", (e) => keep(e.reason, ""), true);
  const ce = console.error;
  console.error = function (...a) { try { if (/#(418|423|425)\\b|Hydration|hydrat/i.test(a.map(String).join(" "))) keep(a.find((x) => x instanceof Error) || null, a.map(String).join(" ")); } catch (_) {} return ce.apply(this, a); };
})();`;

const base = (process.argv[2] ?? "").replace(/\/$/, "");
if (!/^https?:\/\//.test(base)) { console.error("Uso: npx tsx src/scripts/smoke.ts <url-base>"); process.exit(2); }
// REQ-223: `optional` = páginas tras bandera; un 404 ahí es válido (bandera apagada). REQ-305: discover y legacy.
const config = parseSmokeConfig(JSON.parse(readFileSync("tests/smoke/pages.json", "utf8")));
const optional = config.optional;
// REQ-242: páginas institucionales tras bandera; con la bandera encendida se exigen como fijas (200, sin errores).
const vars = wranglerVars(readFileSync("wrangler.jsonc", "utf8"));
const fixed = [...config.fixed, ...flaggedSmokePages(config.flagged, vars, process.env)];
// REQ-675: con LOCALE_URLS_ENABLED también se descubre una ficha en inglés.
const discoverRules = [...config.discover, ...flaggedDiscoverRules(config, vars, process.env)];
// REQ-676: el contrato de idioma lee el HTML como lo recibe un buscador.
const BOT_UA = "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)";

(async () => {
  const browser = await chromium.launch();
  // REQ-305: cada página de origen se reintenta (recién publicada puede tardar en traer el catálogo).
  const linksByPage: Record<string, string[]> = {};
  for (const rule of discoverRules) {
    const re = new RegExp(rule.pattern);
    for (let attempt = 1; attempt <= 3; attempt++) {
      const discover = await browser.newPage();
      await discover.goto(`${base}${rule.from}`, { waitUntil: "networkidle", timeout: 90_000 }).catch(() => null);
      const links = await discover.$$eval("a[href^='/']", (as) => as.map((a) => a.getAttribute("href") ?? "")).catch(() => [] as string[]);
      await discover.close();
      linksByPage[rule.from] = [...(linksByPage[rule.from] ?? []), ...links];
      const n = links.filter((h) => re.test(h)).length;
      if (n >= rule.take) break;
      console.log(`Descubrimiento ${rule.from}: ${n} fichas en el intento ${attempt}; reintento en 15 s.`);
      if (attempt < 3) await new Promise((r) => setTimeout(r, 15_000));
    }
  }
  const discovered = discoverPages(discoverRules, linksByPage);
  const pages = withOptionalPages([...new Set([...fixed, ...discovered.pages])], optional);

  // REQ-305: URL viejas sin seguir la redirección (301/410 esperados; 5xx nunca).
  const legacyStatus: Record<string, number | null> = {};
  const req = await browser.newContext();
  for (const l of config.legacy) {
    const r = await req.request.get(`${base}${l.path}`, { maxRedirects: 0, timeout: 60_000 }).catch(() => null);
    legacyStatus[l.path] = r?.status() ?? null;
    console.log(`${legacyStatus[l.path] ?? "---"} (sin seguir) ${l.path} → ${r?.headers()["location"] ?? ""}`);
  }

  // REQ-676 (Gate 3): contrato hreflang/canonical sobre el <head> crudo (sin cookie, sin JS), más las alternas que anuncian.
  const localeFailures: string[] = [];
  const contractPages = localeContractPages(config, vars, process.env, discovered.pages);
  if (contractPages.length) {
    const html: Record<string, string> = {};
    const fetchRaw = async (p: string, headers: Record<string, string> = {}) => {
      // Como Bingbot (htmlLimitedBots): Next 15 le manda los metadatos en el <head>; a los demás (Googlebot incluido) los transmite al final.
      const r = await req.request.get(`${base}${p}`, { maxRedirects: 0, timeout: 60_000, headers: { "user-agent": BOT_UA, ...headers } }).catch(() => null);
      return { status: r?.status() ?? null, body: r ? await r.text().catch(() => "") : "" };
    };
    for (const p of contractPages) { const r = await fetchRaw(p); if (r.status === 200) html[p] = r.body; else localeFailures.push(`contrato de idioma ${p}: estado ${r.status}`); }
    const extra = new Set(Object.values(html).flatMap((h) => Object.values(parseLocaleHead(h).alternates)).filter((p) => !(p in html) && !(`${p}/` in html)));
    for (const p of extra) { const r = await fetchRaw(p); if (r.status === 200) html[p] = r.body; }
    const fails = hreflangContractFailures(html);
    console.log(`${fails.length ? "✗" : "✓"} contrato hreflang/canonical: ${Object.keys(html).length} páginas`);
    localeFailures.push(...fails.map((x) => `contrato de idioma ${x}`));
    // Plan §6: una URL vieja (sin prefijo) con la cookie en inglés no redirige ni se rompe: 200, español y canonical propio.
    for (const p of contractPages.filter((x) => !/^\/[a-z]{2}(\/|$)/.test(x))) {
      const r = await fetchRaw(p, { cookie: "preferredLanguage=en" });
      const h = parseLocaleHead(r.body);
      const okCookie = r.status === 200 && h.lang === "es" && (h.canonical ?? "") === (p.length > 1 ? p.replace(/\/+$/, "") : p);
      console.log(`${okCookie ? "✓" : "✗"} cookie en inglés ${p}: ${r.status} lang=${h.lang} canonical=${h.canonical}`);
      if (!okCookie) localeFailures.push(`cookie en inglés ${p}: estado ${r.status}, lang ${h.lang}, canonical ${h.canonical}`);
    }
  }
  await req.close();

  const results: SmokeResult[] = [];
  // REQ-580: contrato de las fichas de producto sobre el HTML crudo del servidor (lo que leen los bots sin JS).
  const contractFailures: string[] = [];
  for (const [viewport, opts] of [[390, { ...devices["Pixel 7"] }], [1366, { viewport: { width: 1366, height: 900 } }]] as const) {
    const ctx = await browser.newContext({ ...opts, locale: "es-MX" });
    // INC-001: el navegador del cliente puede traducir países distinto que el servidor.
    // Se altera Intl.DisplayNames en el navegador: si algún componente lo usa al hidratar, aparece el error.
    await ctx.addInitScript({ content: `(() => { const O = Intl.DisplayNames; const P = function (l, o) { const d = new O(l, o); return { of: (c) => { const v = d.of(c); return v ? v + "\\u200b" : v; }, resolvedOptions: () => d.resolvedOptions() }; }; Object.defineProperty(Intl, "DisplayNames", { value: P }); })();` });
    // REQ-500: en el navegador se guarda cada error (stack, cause, componentStack si React lo trae) y, en el
    // momento exacto de un error de hidratación, el DOM que dejó React (antes de que los efectos lo cambien).
    await ctx.addInitScript({ content: EVIDENCE_INIT });
    for (const path of pages) {
      const first = await loadPage(ctx, path);
      const result: SmokeResult = { path, viewport, ...first.outcome, optional: optional.includes(path) };
      if (loadFailed(result)) {
        await saveEvidence(path, viewport, first, "1");
        // REQ-500: se recarga una vez para anotar si es intermitente. La falla original cuenta igual.
        const second = await loadPage(ctx, path);
        result.retry = { ...second.outcome, optional: result.optional };
        await saveEvidence(path, viewport, second, "2-reintento");
        await second.page.close();
      }
      if (viewport === 1366 && result.status === 200 && first.raw && isFichaPath(path)) {
        const enrichment = /data-enriquecimiento="true"/.test(first.raw);
        const fails = fichaContractFailures(first.raw, { enrichment });
        console.log(`${fails.length ? "✗" : "✓"} contrato de ficha (enriquecimiento ${enrichment}) ${path}`);
        contractFailures.push(...fails.map((x) => `contrato de ficha ${path}: ${x}`));
      }
      await first.page.close();
      results.push(result);
    }
    await ctx.close();
  }
  await browser.close();

  for (const r of results) console.log(`${r.status ?? "---"} @${r.viewport} ${r.path}${r.appError || r.pageErrors.length ? "  ✗" : "  ✓"}`);
  const v = smokeVerdict(results, [...discovered.failures, ...legacyFailures(config.legacy, legacyStatus), ...contractFailures, ...localeFailures]);
  if (!v.ok) {
    console.error(`\nPRUEBA DE HUMO FALLIDA (${v.failures.length}):\n- ${v.failures.join("\n- ")}`);
    if (savedEvidence > 0) console.error(`\nEvidencia (REQ-500): ${savedEvidence} carga(s) guardada(s) en ${EVIDENCE_DIR}/ (artefacto del job).`);
    process.exit(1);
  }
  console.log(`\nPrueba de humo OK: ${results.length} cargas sin errores.`);
})();

// ───────────── REQ-500 (INC-007): evidencia de cada carga que falla ─────────────

type BrowserError = { message: string; stack: string | null; cause: string | null; componentStack: string | null; digest: string | null; at: number };
type Loaded = {
  page: Page;
  outcome: { status: number | null; pageErrors: string[]; appError: boolean };
  raw: string | null;
  consoleErrors: string[];
  pageErrorStacks: { message: string; stack: string | null }[];
};

/** Carga una página con los mismos criterios de siempre (REQ-003, REQ-001) y guarda lo necesario por si falla. */
async function loadPage(ctx: BrowserContext, path: string): Promise<Loaded> {
  const page = await ctx.newPage();
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const pageErrorStacks: { message: string; stack: string | null }[] = [];
  page.on("pageerror", (e) => { pageErrors.push(e.message); pageErrorStacks.push({ message: e.message, stack: e.stack ?? null }); });
  // En producción React reporta la hidratación fallida por consola (#418/#423/#425), no como excepción.
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    consoleErrors.push(m.text());
    if (isHydrationError(m.text())) pageErrors.push(m.text());
  });
  const res = await page.goto(`${base}${path}${path.includes("?") ? "&" : "?"}smoke=${Date.now()}`, { waitUntil: "networkidle", timeout: 90_000 }).catch(() => null);
  await page.waitForTimeout(1500);
  const appError = isErrorScreen(await page.evaluate(() => document.body?.innerText ?? "").catch(() => ""));
  const raw = res ? await res.text().catch(() => null) : null;
  return { page, outcome: { status: res?.status() ?? null, pageErrors, appError }, raw, consoleErrors, pageErrorStacks };
}

/** Guarda HTML crudo, DOM tras hidratar (y en el momento del error), errores con stack y captura. Nunca tumba la prueba. */
async function saveEvidence(path: string, viewport: number, l: Loaded, attempt: string) {
  try {
    const dir = join(EVIDENCE_DIR, evidenceSlug(path, viewport), attempt);
    mkdirSync(dir, { recursive: true });
    const domAfter = await l.page.content().catch(() => "");
    const inPage = await l.page.evaluate(() => {
      const w = window as unknown as { __smokeErrors?: unknown[]; __smokeDomAtError?: string | null };
      return { errors: w.__smokeErrors ?? [], domAtError: w.__smokeDomAtError ?? null };
    }).catch(() => ({ errors: [] as unknown[], domAtError: null as string | null }));
    if (l.raw !== null) writeFileSync(join(dir, "servidor.html"), l.raw);
    writeFileSync(join(dir, "dom-tras-hidratar.html"), domAfter);
    if (inPage.domAtError) writeFileSync(join(dir, "dom-al-error.html"), inPage.domAtError);
    await l.page.screenshot({ path: join(dir, "captura.png"), fullPage: false }).catch(() => null);
    const clientDom = inPage.domAtError ?? domAfter;
    const summary = {
      url: `${base}${path}`, viewport, attempt, at: new Date().toISOString(),
      ...l.outcome,
      falla: loadFailed(l.outcome),
      pageErrors: l.pageErrorStacks,
      consola: l.consoleErrors,
      erroresEnNavegador: inPage.errors as BrowserError[],
      // React en producción casi nunca trae componentStack (Next no lo pasa a reportError): por eso va también el diff.
      componentStack: (inPage.errors as BrowserError[]).map((e) => e.componentStack).filter(Boolean),
      primeraDiferencia: l.raw !== null && clientDom ? firstDifference(l.raw, clientDom) : null,
      domComparado: inPage.domAtError ? "dom-al-error.html" : "dom-tras-hidratar.html",
    };
    writeFileSync(join(dir, "errores.json"), JSON.stringify(summary, null, 2));
    savedEvidence++;
    console.log(`Evidencia guardada: ${dir}`);
  } catch (e) {
    console.error(`No se pudo guardar la evidencia de ${path} @${viewport}: ${(e as Error).message}`);
  }
}
