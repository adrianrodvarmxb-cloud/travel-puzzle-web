/**
 * REQ-003 — Prueba de humo con navegador real (Playwright) a 390 y 1366 px.
 * Uso: npx tsx src/scripts/smoke.ts <url-base>   → sale con código 1 si algo falla.
 * Páginas: tests/smoke/pages.json (REQ-305): fijas + fichas reales descubiertas en las páginas de `discover`
 * + URL viejas (`legacy`) que se piden sin seguir la redirección.
 */
import { readFileSync } from "node:fs";
import { chromium, devices } from "playwright";
import { discoverPages, isErrorScreen, isHydrationError, legacyFailures, parseSmokeConfig, smokeVerdict, withOptionalPages, type SmokeResult } from "../ops/lib/smoke";

const base = (process.argv[2] ?? "").replace(/\/$/, "");
if (!/^https?:\/\//.test(base)) { console.error("Uso: npx tsx src/scripts/smoke.ts <url-base>"); process.exit(2); }
// REQ-223: `optional` = páginas tras bandera; un 404 ahí es válido (bandera apagada). REQ-305: discover y legacy.
const config = parseSmokeConfig(JSON.parse(readFileSync("tests/smoke/pages.json", "utf8")));
const optional = config.optional;

(async () => {
  const browser = await chromium.launch();
  // REQ-305: cada página de origen se reintenta (recién publicada puede tardar en traer el catálogo).
  const linksByPage: Record<string, string[]> = {};
  for (const rule of config.discover) {
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
  const discovered = discoverPages(config.discover, linksByPage);
  const pages = withOptionalPages([...new Set([...config.fixed, ...discovered.pages])], optional);

  // REQ-305: URL viejas sin seguir la redirección (301/410 esperados; 5xx nunca).
  const legacyStatus: Record<string, number | null> = {};
  const req = await browser.newContext();
  for (const l of config.legacy) {
    const r = await req.request.get(`${base}${l.path}`, { maxRedirects: 0, timeout: 60_000 }).catch(() => null);
    legacyStatus[l.path] = r?.status() ?? null;
    console.log(`${legacyStatus[l.path] ?? "---"} (sin seguir) ${l.path} → ${r?.headers()["location"] ?? ""}`);
  }
  await req.close();

  const results: SmokeResult[] = [];
  for (const [viewport, opts] of [[390, { ...devices["Pixel 7"] }], [1366, { viewport: { width: 1366, height: 900 } }]] as const) {
    const ctx = await browser.newContext({ ...opts, locale: "es-MX" });
    // INC-001: el navegador del cliente puede traducir países distinto que el servidor.
    // Se altera Intl.DisplayNames en el navegador: si algún componente lo usa al hidratar, aparece el error.
    await ctx.addInitScript({ content: `(() => { const O = Intl.DisplayNames; const P = function (l, o) { const d = new O(l, o); return { of: (c) => { const v = d.of(c); return v ? v + "\\u200b" : v; }, resolvedOptions: () => d.resolvedOptions() }; }; Object.defineProperty(Intl, "DisplayNames", { value: P }); })();` });
    for (const path of pages) {
      const page = await ctx.newPage();
      const pageErrors: string[] = [];
      page.on("pageerror", (e) => pageErrors.push(e.message));
      // En producción React reporta la hidratación fallida por consola (#418/#423/#425), no como excepción.
      page.on("console", (m) => { if (m.type() === "error" && isHydrationError(m.text())) pageErrors.push(m.text()); });
      const res = await page.goto(`${base}${path}${path.includes("?") ? "&" : "?"}smoke=${Date.now()}`, { waitUntil: "networkidle", timeout: 90_000 }).catch(() => null);
      await page.waitForTimeout(1500);
      const appError = isErrorScreen(await page.evaluate(() => document.body?.innerText ?? "").catch(() => ""));
      results.push({ path, viewport, status: res?.status() ?? null, pageErrors, appError, optional: optional.includes(path) });
      await page.close();
    }
    await ctx.close();
  }
  await browser.close();

  for (const r of results) console.log(`${r.status ?? "---"} @${r.viewport} ${r.path}${r.appError || r.pageErrors.length ? "  ✗" : "  ✓"}`);
  const v = smokeVerdict(results, [...discovered.failures, ...legacyFailures(config.legacy, legacyStatus)]);
  if (!v.ok) { console.error(`\nPRUEBA DE HUMO FALLIDA (${v.failures.length}):\n- ${v.failures.join("\n- ")}`); process.exit(1); }
  console.log(`\nPrueba de humo OK: ${results.length} cargas sin errores.`);
})();
